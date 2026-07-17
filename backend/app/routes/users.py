from collections import Counter

from flask import Blueprint, jsonify
from flask_login import current_user

from app.models.user import User
from app.models.user_game_entry import UserGameEntry

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


def _compute_stats(entries):
    completions_per_year = Counter()
    games_per_year = Counter()
    genre_counts = Counter()
    rating_counts = Counter()

    for entry in entries:
        if entry.status == "completed":
            completions_per_year[entry.effective_year] += 1
        if entry.year_played:
            games_per_year[entry.year_played] += 1
        for genre in entry.game.genres or []:
            genre_counts[genre] += 1
        if entry.rating is not None:
            rating_counts[entry.rating] += 1

    return {
        "completions_per_year": [
            {"year": year, "count": count} for year, count in sorted(completions_per_year.items())
        ],
        "games_per_year": [
            {"year": year, "count": count} for year, count in sorted(games_per_year.items())
        ],
        "genre_breakdown": [
            {"genre": genre, "count": count} for genre, count in genre_counts.most_common()
        ],
        "rating_distribution": [
            {"rating": rating, "count": rating_counts.get(rating, 0)} for rating in range(1, 11)
        ],
    }


@users_bp.route("/<username>")
def get_profile(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "user not found"}), 404

    is_owner = current_user.is_authenticated and current_user.id == user.id
    if user.profile_visibility == "private" and not is_owner:
        return jsonify({"error": "this profile is private"}), 403

    entries = (
        UserGameEntry.query.filter_by(user_id=user.id)
        .order_by(UserGameEntry.updated_at.desc())
        .all()
    )

    return jsonify(
        {
            "user": user.to_public_dict(),
            "is_owner": is_owner,
            "entries": [entry.to_dict() for entry in entries],
            "stats": _compute_stats(entries),
        }
    )
