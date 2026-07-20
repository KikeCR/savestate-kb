from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.constants import VISIBILITY_PRIVATE
from app.models.user import User
from app.services import follows

follows_bp = Blueprint("follows", __name__, url_prefix="/api/users")

MAX_LIMIT = 100


def _user_or_404(username):
    return User.query.filter_by(username=username).first()


def _serialize_list(users, viewer_id):
    return [
        {
            "user": user.to_public_dict(),
            "is_following": follows.is_following(viewer_id, user.id) if viewer_id else False,
        }
        for user in users
    ]


def _list_response(username, direction):
    user = _user_or_404(username)
    if not user:
        return jsonify({"error": "user not found"}), 404

    is_owner = current_user.is_authenticated and current_user.id == user.id
    if user.profile_visibility == VISIBILITY_PRIVATE and not is_owner:
        return jsonify({"error": "this profile is private"}), 403

    limit = min(request.args.get("limit", default=50, type=int), MAX_LIMIT)
    offset = request.args.get("offset", default=0, type=int)
    viewer_id = current_user.id if current_user.is_authenticated else None

    if direction == "followers":
        users = follows.get_followers(user.id, limit=limit, offset=offset)
        count = follows.follower_count(user.id)
    else:
        users = follows.get_following(user.id, limit=limit, offset=offset)
        count = follows.following_count(user.id)

    return jsonify({"results": _serialize_list(users, viewer_id), "count": count})


@follows_bp.route("/<username>/follow", methods=["POST"])
@login_required
def follow(username):
    target = _user_or_404(username)
    if not target:
        return jsonify({"error": "user not found"}), 404

    try:
        follows.follow_user(current_user.id, target.id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except follows.AlreadyFollowingError as exc:
        return jsonify({"error": str(exc)}), 409

    return jsonify(
        {"is_following": True, "follower_count": follows.follower_count(target.id)}
    ), 201


@follows_bp.route("/<username>/follow", methods=["DELETE"])
@login_required
def unfollow(username):
    target = _user_or_404(username)
    if not target:
        return jsonify({"error": "user not found"}), 404

    if not follows.unfollow_user(current_user.id, target.id):
        return jsonify({"error": "not following this user"}), 404

    return jsonify({"is_following": False, "follower_count": follows.follower_count(target.id)})


@follows_bp.route("/<username>/followers")
def followers(username):
    return _list_response(username, "followers")


@follows_bp.route("/<username>/following")
def following(username):
    return _list_response(username, "following")
