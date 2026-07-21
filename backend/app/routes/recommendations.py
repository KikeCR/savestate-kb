from flask import Blueprint, jsonify
from flask_login import current_user, login_required

from app.services import recommendation_service

recommendations_bp = Blueprint("recommendations", __name__, url_prefix="/api/recommendations")


@recommendations_bp.route("", methods=["GET"])
@login_required
def get_recommendations():
    return jsonify(recommendation_service.get_recommendations(current_user.id))


@recommendations_bp.route("/refresh", methods=["POST"])
@login_required
def refresh_recommendations():
    if recommendation_service.is_refresh_on_cooldown(current_user.id):
        return jsonify({"error": "refresh is rate-limited, try again later"}), 429

    # Set before computing, not after: bounds worst-case LLM call volume
    # from a burst of refresh clicks even if the pipeline itself is slow.
    recommendation_service.start_refresh_cooldown(current_user.id)
    return jsonify(recommendation_service.get_recommendations(current_user.id, force_refresh=True))
