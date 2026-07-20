from collections import Counter
from datetime import date

from flask import Blueprint, jsonify
from flask_login import current_user, login_required

from app.constants import DASHBOARD_CURRENTLY_PLAYING_LIMIT, ENTRY_STATUSES, STATUS_COMPLETED
from app.models.user_game_entry import UserGameEntry

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def _compute_dashboard_summary(entries):
    current_year = date.today().year
    status_counts = Counter(entry.status for entry in entries)
    total_hours_played = sum(entry.hours_played or 0 for entry in entries)
    completed_this_year = sum(
        1
        for entry in entries
        if entry.status == STATUS_COMPLETED and entry.effective_year == current_year
    )
    currently_playing = sorted(
        (entry for entry in entries if entry.status == "playing"),
        key=lambda entry: entry.updated_at,
        reverse=True,
    )[:DASHBOARD_CURRENTLY_PLAYING_LIMIT]

    return {
        "status_counts": {status: status_counts.get(status, 0) for status in ENTRY_STATUSES},
        "completed_this_year": completed_this_year,
        "total_hours_played": total_hours_played,
        "currently_playing": [entry.to_dict() for entry in currently_playing],
    }


@dashboard_bp.route("/summary")
@login_required
def get_summary():
    entries = UserGameEntry.query.filter_by(user_id=current_user.id).all()
    return jsonify(_compute_dashboard_summary(entries))
