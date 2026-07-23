from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.constants import REVIEW_BODY_MAX_LENGTH, STATUS_COMPLETED
from app.extensions import db
from app.models.game import Game
from app.models.review import Review
from app.models.user_game_entry import UserGameEntry
from app.services.activity import record_activity

reviews_bp = Blueprint("reviews", __name__, url_prefix="/api/reviews")


def _has_completed_and_rated_entry(user_id, game_id):
    return (
        UserGameEntry.query.filter_by(user_id=user_id, game_id=game_id, status=STATUS_COMPLETED)
        .filter(UserGameEntry.rating.isnot(None))
        .first()
        is not None
    )


@reviews_bp.route("/<int:game_id>", methods=["GET"])
@login_required
def get_review(game_id):
    review = Review.query.filter_by(user_id=current_user.id, game_id=game_id).first()
    if not review:
        return jsonify({"error": "not found"}), 404
    return jsonify(review.to_dict())


@reviews_bp.route("/<int:game_id>", methods=["PUT"])
@login_required
def set_review(game_id):
    data = request.get_json(silent=True) or {}
    body = (data.get("body") or "").strip()

    if not body:
        return jsonify({"error": "body is required"}), 400
    if len(body) > REVIEW_BODY_MAX_LENGTH:
        return jsonify({"error": f"body must be at most {REVIEW_BODY_MAX_LENGTH} characters"}), 400

    game = db.session.get(Game, game_id)
    if not game:
        return jsonify({"error": "game not found"}), 404

    if not _has_completed_and_rated_entry(current_user.id, game_id):
        return jsonify({"error": "you can only review games you've completed and rated"}), 409

    review = Review.query.filter_by(user_id=current_user.id, game_id=game_id).first()
    is_new = review is None
    if review:
        review.body = body
    else:
        review = Review(user_id=current_user.id, game_id=game_id, body=body)
        db.session.add(review)

    db.session.commit()

    if is_new:
        record_activity(current_user, game, "reviewed")

    return jsonify(review.to_dict())


@reviews_bp.route("/<int:game_id>", methods=["DELETE"])
@login_required
def delete_review(game_id):
    review = Review.query.filter_by(user_id=current_user.id, game_id=game_id).first()
    if review:
        db.session.delete(review)
        db.session.commit()
    return "", 204
