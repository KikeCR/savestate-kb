from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.constants import FEEDBACK_SENTIMENTS
from app.extensions import db
from app.models.game import Game
from app.models.game_feedback import GameFeedback
from app.services import recommendation_service

recommendations_bp = Blueprint("recommendations", __name__, url_prefix="/api/recommendations")


@recommendations_bp.route("", methods=["GET"])
@login_required
def get_recommendations():
    return jsonify(recommendation_service.get_recommendations(current_user.id))


def _format_wait(seconds):
    if seconds >= 60:
        minutes = -(-seconds // 60)  # ceil division, so "1 minute" isn't shown for 119s
        unit = "minute" if minutes == 1 else "minutes"
        return f"{minutes} {unit}"
    return f"{seconds} second{'' if seconds == 1 else 's'}"


@recommendations_bp.route("/refresh", methods=["POST"])
@login_required
def refresh_recommendations():
    seconds_remaining = recommendation_service.get_refresh_cooldown_seconds_remaining(
        current_user.id
    )
    if seconds_remaining > 0:
        return jsonify(
            {
                "error": f"you can refresh again in {_format_wait(seconds_remaining)}",
                "retry_after_seconds": seconds_remaining,
            }
        ), 429

    # Set before computing, not after: bounds worst-case LLM call volume
    # from a burst of refresh clicks even if the pipeline itself is slow.
    recommendation_service.start_refresh_cooldown(current_user.id)
    return jsonify(recommendation_service.get_recommendations(current_user.id, force_refresh=True))


@recommendations_bp.route("/feedback/<int:game_id>", methods=["PUT"])
@login_required
def set_feedback(game_id):
    data = request.get_json(silent=True) or {}
    sentiment = data.get("sentiment")
    if sentiment not in FEEDBACK_SENTIMENTS:
        return jsonify({"error": f"sentiment must be one of {FEEDBACK_SENTIMENTS}"}), 400

    game = db.session.get(Game, game_id)
    if not game:
        return jsonify({"error": "game not found"}), 404

    feedback = GameFeedback.query.filter_by(user_id=current_user.id, game_id=game_id).first()
    if feedback:
        feedback.sentiment = sentiment
    else:
        feedback = GameFeedback(user_id=current_user.id, game_id=game_id, sentiment=sentiment)
        db.session.add(feedback)
    db.session.commit()

    recommendation_service.invalidate_cache(current_user.id)
    return jsonify(feedback.to_dict())


@recommendations_bp.route("/feedback/<int:game_id>", methods=["DELETE"])
@login_required
def clear_feedback(game_id):
    feedback = GameFeedback.query.filter_by(user_id=current_user.id, game_id=game_id).first()
    if feedback:
        db.session.delete(feedback)
        db.session.commit()
        recommendation_service.invalidate_cache(current_user.id)
    return "", 204


@recommendations_bp.route("/topup", methods=["POST"])
@login_required
def topup_recommendations():
    seconds_remaining = recommendation_service.get_topup_cooldown_seconds_remaining(
        current_user.id
    )
    if seconds_remaining > 0:
        return jsonify(
            {
                "error": f"you can top up again in {_format_wait(seconds_remaining)}",
                "retry_after_seconds": seconds_remaining,
            }
        ), 429

    data = request.get_json(silent=True) or {}
    exclude_game_ids = data.get("exclude_game_ids") or []
    if not isinstance(exclude_game_ids, list) or not all(
        isinstance(game_id, int) and not isinstance(game_id, bool) for game_id in exclude_game_ids
    ):
        return jsonify({"error": "exclude_game_ids must be a list of integers"}), 400

    if not recommendation_service.try_reserve_topup_slot(current_user.id):
        return jsonify(
            {"error": "you've reached the top-up limit for now — try refreshing instead"}
        ), 429

    # Set before computing, not after: bounds worst-case LLM call volume the
    # same way the refresh cooldown does.
    recommendation_service.start_topup_cooldown(current_user.id)
    return jsonify(
        recommendation_service.get_topup_recommendations(
            current_user.id, exclude_game_ids=exclude_game_ids
        )
    )
