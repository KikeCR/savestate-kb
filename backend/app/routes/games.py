import json

import requests
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy import func

from app.constants import REVIEW_DISPLAY_LIMIT, VISIBILITY_PRIVATE
from app.extensions import db, limiter, redis_client
from app.models.game import Game
from app.models.review import Review
from app.models.user import User
from app.models.user_game_entry import UserGameEntry
from app.services import popular_games_service
from app.services.rawg_client import (
    RAWG_SEARCH_CACHE_TTL_SECONDS,
    RAWG_SEARCH_KEY_PREFIX,
    RawgClient,
    RawgConfigError,
    normalize_rawg_game,
    normalize_rawg_game_detail,
)

games_bp = Blueprint("games", __name__, url_prefix="/api/games")

SEARCH_RESULT_LIMIT = 20


def _escape_like(value):
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@games_bp.route("/popular")
def popular_games():
    """Public homepage endpoint — no login required, since it's meant to be
    useful to logged-out visitors too. When a session IS authenticated,
    games already in that user's library are excluded from both lists.
    """
    exclude_game_ids = None
    if current_user.is_authenticated:
        exclude_game_ids = {
            row.game_id
            for row in UserGameEntry.query.filter_by(user_id=current_user.id).with_entities(
                UserGameEntry.game_id
            )
        }
    return jsonify(popular_games_service.get_popular_games(exclude_game_ids))


@games_bp.route("/search")
@login_required
@limiter.limit("30 per minute")
def search_games():
    query = (request.args.get("q") or "").strip()
    if not query:
        return jsonify({"error": "q is required"}), 400

    local_matches = (
        Game.query.filter(Game.title.ilike(f"%{_escape_like(query)}%", escape="\\"))
        .limit(SEARCH_RESULT_LIMIT)
        .all()
    )
    if local_matches:
        return jsonify({"source": "postgres", "results": [g.to_dict() for g in local_matches]})

    cache_key = f"{RAWG_SEARCH_KEY_PREFIX}{query.lower()}"
    cached = redis_client.get(cache_key)
    if cached:
        raw_results = json.loads(cached)
    else:
        try:
            client = RawgClient()
            data = client.search_games(query, page_size=SEARCH_RESULT_LIMIT)
        except RawgConfigError as exc:
            return jsonify({"error": str(exc)}), 503
        except requests.RequestException as exc:
            return jsonify({"error": f"RAWG API request failed: {exc}"}), 502

        raw_results = data.get("results", [])
        redis_client.setex(cache_key, RAWG_SEARCH_CACHE_TTL_SECONDS, json.dumps(raw_results))

    games = []
    for raw in raw_results:
        normalized = normalize_rawg_game(raw)
        game = Game.query.filter_by(rawg_id=normalized["rawg_id"]).first()
        if not game:
            game = Game(**normalized)
            db.session.add(game)
        games.append(game)
    db.session.commit()

    return jsonify({"source": "rawg", "results": [g.to_dict() for g in games]})


@games_bp.route("/<int:game_id>")
@limiter.limit("30 per minute")
def game_detail(game_id):
    """Public game detail page endpoint. On a game's first-ever view, this
    also fetches RAWG's per-game detail payload (description, ESRB rating,
    developers/publishers, website) and persists it onto the row, since
    normalize_rawg_game (used by search/sync) only ever populates fields
    from the cheaper list endpoint. Rate-limited like /search since a
    cache-miss here also spends RAWG quota.
    """
    game = db.session.get(Game, game_id)
    if not game:
        return jsonify({"error": "game not found"}), 404

    if game.detail_fetched_at is None:
        try:
            client = RawgClient()
            data = client.get_game_details(game.rawg_id)
        except RawgConfigError as exc:
            return jsonify({"error": str(exc)}), 503
        except requests.RequestException as exc:
            return jsonify({"error": f"RAWG API request failed: {exc}"}), 502

        for key, value in normalize_rawg_game_detail(data).items():
            setattr(game, key, value)
        db.session.commit()

    avg_rating, ratings_count = popular_games_service.get_local_rating_stats(game.id)
    return jsonify(
        {
            **game.to_dict(),
            "local_average_rating": avg_rating,
            "local_ratings_count": ratings_count,
        }
    )


@games_bp.route("/<int:game_id>/reviews")
@limiter.limit("30 per minute")
def game_reviews(game_id):
    """A small, randomized subset of this game's reviews — enough for the
    game detail page's reviews grid without needing pagination or scrolling.
    Reviews from users with a private profile are excluded, matching how
    private profiles are already gated elsewhere (see users.py, follows.py).
    """
    game = db.session.get(Game, game_id)
    if not game:
        return jsonify({"error": "game not found"}), 404

    reviews = (
        Review.query.join(User, Review.user_id == User.id)
        .filter(Review.game_id == game_id, User.profile_visibility != VISIBILITY_PRIVATE)
        .order_by(func.random())
        .limit(REVIEW_DISPLAY_LIMIT)
        .all()
    )
    return jsonify({"results": [review.to_dict() for review in reviews]})
