from datetime import date

from flask import Blueprint, jsonify, request
from flask_login import login_required

from app.extensions import db
from app.models.user import User
from app.services import leaderboards

leaderboards_bp = Blueprint("leaderboards", __name__, url_prefix="/api/leaderboards")

MAX_LIMIT = 50


def _serialize(entries):
    results = []
    for user_id_str, score in entries:
        user = db.session.get(User, int(user_id_str))
        if not user:
            continue
        results.append({"user": user.to_public_dict(), "score": score})
    return results


@leaderboards_bp.route("/completions")
@login_required
def completions():
    year = request.args.get("year", type=int) or date.today().year
    limit = min(request.args.get("limit", default=10, type=int), MAX_LIMIT)
    entries = leaderboards.get_completions_leaderboard(year=year, limit=limit)
    return jsonify({"year": year, "results": _serialize(entries)})


@leaderboards_bp.route("/avg-rating")
@login_required
def avg_rating():
    limit = min(request.args.get("limit", default=10, type=int), MAX_LIMIT)
    entries = leaderboards.get_avg_rating_leaderboard(limit=limit)
    results = _serialize(entries)
    for result in results:
        result["score"] = round(result["score"], 2)
    return jsonify({"results": results})
