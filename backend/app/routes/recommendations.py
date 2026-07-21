from flask import Blueprint, jsonify
from flask_login import current_user, login_required

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
