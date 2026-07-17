from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models.game import Game
from app.models.user_game_entry import STATUS_VALUES, UserGameEntry

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
    if not isinstance(value, int) or not (1 <= value <= 10):
        raise ValueError("rating must be an integer between 1 and 10")
    return value


def _entry_or_404(entry_id):
    return UserGameEntry.query.filter_by(id=entry_id, user_id=current_user.id).first()


@entries_bp.route("", methods=["GET"])
@login_required
def list_entries():
    query = UserGameEntry.query.filter_by(user_id=current_user.id)

    status = request.args.get("status")
    if status:
        if status not in STATUS_VALUES:
            return jsonify({"error": f"status must be one of {STATUS_VALUES}"}), 400
        query = query.filter_by(status=status)

    entries = query.order_by(UserGameEntry.updated_at.desc()).all()
    return jsonify({"results": [e.to_dict() for e in entries]})


@entries_bp.route("", methods=["POST"])
@login_required
def create_entry():
    data = request.get_json(silent=True) or {}
    game_id = data.get("game_id")
    status = data.get("status", "backlog")

    if not game_id:
        return jsonify({"error": "game_id is required"}), 400
    if status not in STATUS_VALUES:
        return jsonify({"error": f"status must be one of {STATUS_VALUES}"}), 400

    game = db.session.get(Game, game_id)
    if not game:
        return jsonify({"error": "game not found"}), 404

    if UserGameEntry.query.filter_by(user_id=current_user.id, game_id=game_id).first():
        return jsonify({"error": "this game is already in your library"}), 409

    try:
        rating = _validate_rating(data.get("rating"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    start_date, err = _parse_date(data.get("start_date"), "start_date")
    if err:
        return jsonify({"error": err}), 400
    completion_date, err = _parse_date(data.get("completion_date"), "completion_date")
    if err:
        return jsonify({"error": err}), 400

    entry = UserGameEntry(
        user_id=current_user.id,
        game_id=game_id,
        status=status,
        rating=rating,
        start_date=start_date,
        completion_date=completion_date,
        hours_played=data.get("hours_played") or 0,
        notes=data.get("notes"),
        favorite=bool(data.get("favorite", False)),
        replay_count=data.get("replay_count") or 0,
        platform_played=data.get("platform_played"),
        tags=data.get("tags") or [],
    )
    db.session.add(entry)
    db.session.commit()
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

    if "status" in data:
        if data["status"] not in STATUS_VALUES:
            return jsonify({"error": f"status must be one of {STATUS_VALUES}"}), 400
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

    if "hours_played" in data:
        entry.hours_played = data["hours_played"] or 0

    if "notes" in data:
        entry.notes = data["notes"]

    if "favorite" in data:
        entry.favorite = bool(data["favorite"])

    if "replay_count" in data:
        entry.replay_count = data["replay_count"] or 0

    if "platform_played" in data:
        entry.platform_played = data["platform_played"]

    if "tags" in data:
        entry.tags = data["tags"] or []

    db.session.commit()
    return jsonify(entry.to_dict())


@entries_bp.route("/<int:entry_id>", methods=["DELETE"])
@login_required
def delete_entry(entry_id):
    entry = _entry_or_404(entry_id)
    if not entry:
        return jsonify({"error": "not found"}), 404
    db.session.delete(entry)
    db.session.commit()
    return "", 204
