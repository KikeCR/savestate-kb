from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.services.activity import get_recent_activity

activity_bp = Blueprint("activity", __name__, url_prefix="/api/activity")

MAX_LIMIT = 100


@activity_bp.route("")
@login_required
def list_activity():
    limit = min(request.args.get("limit", default=20, type=int), MAX_LIMIT)
    return jsonify({"results": get_recent_activity(current_user.id, limit=limit)})
