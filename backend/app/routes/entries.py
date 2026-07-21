from datetime import date, datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.constants import (
    DEFAULT_ENTRY_STATUS,
    ENTRY_STATUSES,
    MAX_HOURS_PLAYED,
    MAX_REPLAY_COUNT,
    MIN_YEAR_PLAYED,
    RATING_MAX,
    RATING_MIN,
    STATUS_COMPLETED,
)
from app.extensions import db
from app.models.game import Game
from app.models.user_game_entry import UserGameEntry
from app.services import leaderboards, recommendation_service
from app.services.activity import record_activity

entries_bp = Blueprint("entries", __name__, url_prefix="/api/entries")


def _parse_date(value, field):
    if value in (None, ""):
        return None, None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date(), None
    except ValueError:
        return None, f"{field} must be in YYYY-MM-DD format"


def _validate_rating(value):
    if value is None:
        return None
    if not isinstance(value, int) or not (RATING_MIN <= value <= RATING_MAX):
        raise ValueError(f"rating must be an integer between {RATING_MIN} and {RATING_MAX}")
    return value


def _validate_year(value):
    if value is None:
        return None
    max_year = date.today().year + 1
    if not isinstance(value, int) or not (MIN_YEAR_PLAYED <= value <= max_year):
        raise ValueError(f"year_played must be an integer between {MIN_YEAR_PLAYED} and {max_year}")
    return value


def _validate_bounded_int(value, field, max_value):
    if value in (None, ""):
        return 0
    if isinstance(value, bool) or not isinstance(value, int) or not (0 <= value <= max_value):
        raise ValueError(f"{field} must be an integer between 0 and {max_value}")
    return value


def _entry_or_404(entry_id):
    return UserGameEntry.query.filter_by(id=entry_id, user_id=current_user.id).first()


@entries_bp.route("", methods=["GET"])
@login_required
def list_entries():
    query = UserGameEntry.query.filter_by(user_id=current_user.id)

    status = request.args.get("status")
    if status:
        if status not in ENTRY_STATUSES:
            return jsonify({"error": f"status must be one of {ENTRY_STATUSES}"}), 400
        query = query.filter_by(status=status)

    year = request.args.get("year", type=int)
    if year:
        query = query.filter_by(year_played=year)

    entries = query.order_by(UserGameEntry.updated_at.desc()).all()
    return jsonify({"results": [e.to_dict() for e in entries]})


@entries_bp.route("", methods=["POST"])
@login_required
def create_entry():
    data = request.get_json(silent=True) or {}
    game_id = data.get("game_id")
    status = data.get("status", DEFAULT_ENTRY_STATUS)

    if not game_id:
        return jsonify({"error": "game_id is required"}), 400
    if status not in ENTRY_STATUSES:
        return jsonify({"error": f"status must be one of {ENTRY_STATUSES}"}), 400

    game = db.session.get(Game, game_id)
    if not game:
        return jsonify({"error": "game not found"}), 404

    if UserGameEntry.query.filter_by(user_id=current_user.id, game_id=game_id).first():
        return jsonify({"error": "this game is already in your library"}), 409

    try:
        rating = _validate_rating(data.get("rating"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        year_played = _validate_year(data.get("year_played"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    start_date, err = _parse_date(data.get("start_date"), "start_date")
    if err:
        return jsonify({"error": err}), 400
    completion_date, err = _parse_date(data.get("completion_date"), "completion_date")
    if err:
        return jsonify({"error": err}), 400

    try:
        hours_played = _validate_bounded_int(
            data.get("hours_played"), "hours_played", MAX_HOURS_PLAYED
        )
        replay_count = _validate_bounded_int(
            data.get("replay_count"), "replay_count", MAX_REPLAY_COUNT
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    entry = UserGameEntry(
        user_id=current_user.id,
        game_id=game_id,
        status=status,
        rating=rating,
        start_date=start_date,
        completion_date=completion_date,
        year_played=year_played,
        hours_played=hours_played,
        notes=data.get("notes"),
        favorite=bool(data.get("favorite", False)),
        replay_count=replay_count,
        platform_played=data.get("platform_played"),
        tags=data.get("tags") or [],
    )
    db.session.add(entry)
    db.session.commit()

    record_activity(current_user, game, "added")
    if entry.status == STATUS_COMPLETED:
        leaderboards.record_completion(current_user.id, entry.effective_year)
        record_activity(current_user, game, "completed")
    if entry.rating is not None:
        leaderboards.refresh_avg_rating(current_user.id)
        record_activity(current_user, game, "rated", rating=entry.rating)
    if entry.year_played is not None:
        record_activity(current_user, game, "logged_year", year_played=entry.year_played)

    # A new entry always changes the owned-games exclusion set, and often
    # also the taste profile (rating/favorite set at creation time) — either
    # way, any cached recommendation set is now stale.
    recommendation_service.invalidate_cache(current_user.id)

    return jsonify(entry.to_dict()), 201


@entries_bp.route("/<int:entry_id>", methods=["GET"])
@login_required
def get_entry(entry_id):
    entry = _entry_or_404(entry_id)
    if not entry:
        return jsonify({"error": "not found"}), 404
    return jsonify(entry.to_dict())


@entries_bp.route("/<int:entry_id>", methods=["PATCH"])
@login_required
def update_entry(entry_id):
    entry = _entry_or_404(entry_id)
    if not entry:
        return jsonify({"error": "not found"}), 404

    data = request.get_json(silent=True) or {}
    old_status = entry.status
    old_effective_year = entry.effective_year
    old_rating = entry.rating
    old_year_played = entry.year_played

    if "status" in data:
        if data["status"] not in ENTRY_STATUSES:
            return jsonify({"error": f"status must be one of {ENTRY_STATUSES}"}), 400
        entry.status = data["status"]

    if "rating" in data:
        try:
            entry.rating = _validate_rating(data["rating"])
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    if "start_date" in data:
        parsed, err = _parse_date(data["start_date"], "start_date")
        if err:
            return jsonify({"error": err}), 400
        entry.start_date = parsed

    if "completion_date" in data:
        parsed, err = _parse_date(data["completion_date"], "completion_date")
        if err:
            return jsonify({"error": err}), 400
        entry.completion_date = parsed

    if "year_played" in data:
        try:
            entry.year_played = _validate_year(data["year_played"])
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    if "hours_played" in data:
        try:
            entry.hours_played = _validate_bounded_int(
                data["hours_played"], "hours_played", MAX_HOURS_PLAYED
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    if "notes" in data:
        entry.notes = data["notes"]

    if "favorite" in data:
        entry.favorite = bool(data["favorite"])

    if "replay_count" in data:
        try:
            entry.replay_count = _validate_bounded_int(
                data["replay_count"], "replay_count", MAX_REPLAY_COUNT
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    if "platform_played" in data:
        entry.platform_played = data["platform_played"]

    if "tags" in data:
        entry.tags = data["tags"] or []

    db.session.commit()

    now_completed = entry.status == STATUS_COMPLETED
    was_completed = old_status == STATUS_COMPLETED

    if now_completed and not was_completed:
        leaderboards.record_completion(current_user.id, entry.effective_year)
        record_activity(current_user, entry.game, "completed")
    elif was_completed and not now_completed:
        leaderboards.remove_completion(current_user.id, old_effective_year)
    elif now_completed and was_completed:
        new_effective_year = entry.effective_year
        if new_effective_year != old_effective_year:
            leaderboards.remove_completion(current_user.id, old_effective_year)
            leaderboards.record_completion(current_user.id, new_effective_year)

    if "rating" in data:
        leaderboards.refresh_avg_rating(current_user.id)
        if entry.rating is not None and entry.rating != old_rating:
            record_activity(current_user, entry.game, "rated", rating=entry.rating)

    year_played_changed = "year_played" in data and entry.year_played != old_year_played
    if year_played_changed and entry.year_played is not None:
        record_activity(current_user, entry.game, "logged_year", year_played=entry.year_played)

    if "rating" in data or "favorite" in data:
        recommendation_service.invalidate_cache(current_user.id)

    return jsonify(entry.to_dict())


@entries_bp.route("/<int:entry_id>", methods=["DELETE"])
@login_required
def delete_entry(entry_id):
    entry = _entry_or_404(entry_id)
    if not entry:
        return jsonify({"error": "not found"}), 404

    was_completed = entry.status == STATUS_COMPLETED
    effective_year = entry.effective_year if was_completed else None
    had_rating = entry.rating is not None

    db.session.delete(entry)
    db.session.commit()

    if was_completed:
        leaderboards.remove_completion(current_user.id, effective_year)
    if had_rating:
        leaderboards.refresh_avg_rating(current_user.id)

    recommendation_service.invalidate_cache(current_user.id)

    return "", 204
