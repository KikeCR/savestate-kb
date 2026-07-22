import pytest
from sqlalchemy.exc import IntegrityError

from app.constants import FEEDBACK_DISLIKED, FEEDBACK_LIKED
from app.extensions import db
from tests.factories import build_game_feedback

pytestmark = pytest.mark.integration


def test_game_feedback_persists_expected_fields(app, make_user, make_game, make_game_feedback):
    user = make_user()
    game = make_game()

    feedback = make_game_feedback(user, game, sentiment=FEEDBACK_DISLIKED)

    assert feedback.user_id == user.id
    assert feedback.game_id == game.id
    assert feedback.sentiment == FEEDBACK_DISLIKED
    assert feedback.created_at is not None
    assert feedback.updated_at is not None


def test_unique_constraint_on_user_and_game(app, make_user, make_game, make_game_feedback):
    user = make_user()
    game = make_game()
    make_game_feedback(user, game)

    with app.app_context():
        dupe = build_game_feedback(user, game)
        db.session.add(dupe)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


def test_check_constraint_rejects_invalid_sentiment(app, make_user, make_game):
    user = make_user()
    game = make_game()

    with app.app_context():
        feedback = build_game_feedback(user, game, sentiment="meh")
        db.session.add(feedback)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


def test_liked_sentiment_persists(app, make_user, make_game, make_game_feedback):
    user = make_user()
    game = make_game()

    feedback = make_game_feedback(user, game, sentiment=FEEDBACK_LIKED)

    assert feedback.sentiment == FEEDBACK_LIKED
