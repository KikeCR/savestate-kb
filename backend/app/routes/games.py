import json

import requests
from flask import Blueprint, jsonify, request
from flask_login import login_required

from app.extensions import db, redis_client
from app.models.game import Game
from app.services.rawg_client import (
    RAWG_SEARCH_CACHE_TTL_SECONDS,
    RAWG_SEARCH_KEY_PREFIX,
    RawgClient,
    RawgConfigError,
    normalize_rawg_game,
)

games_bp = Blueprint("games", __name__, url_prefix="/api/games")

SEARCH_RESULT_LIMIT = 20


@games_bp.route("/search")
@login_required
def search_games():
    query = (request.args.get("q") or "").strip()
    if not query:
        return jsonify({"error": "q is required"}), 400

    local_matches = (
        Game.query.filter(Game.title.ilike(f"%{query}%")).limit(SEARCH_RESULT_LIMIT).all()
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
