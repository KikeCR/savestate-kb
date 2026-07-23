import pytest
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.review import Review
from tests.factories import build_review

pytestmark = pytest.mark.integration


def test_review_persists_expected_fields(app, make_user, make_game, make_review):
    user = make_user()
    game = make_game()

    review = make_review(user, game, body="A tight, brilliant metroidvania.")

    assert review.user_id == user.id
    assert review.game_id == game.id
    assert review.body == "A tight, brilliant metroidvania."
    assert review.created_at is not None
    assert review.updated_at is not None


def test_unique_constraint_on_user_and_game(app, make_user, make_game, make_review):
    user = make_user()
    game = make_game()
    make_review(user, game)

    with app.app_context():
        dupe = build_review(user, game)
        db.session.add(dupe)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


def test_to_dict_includes_author_public_dict_without_email(app, make_user, make_game, make_review):
    user = make_user()
    game = make_game()
    review = make_review(user, game, body="Loved it.")

    with app.app_context():
        data = db.session.get(Review, review.id).to_dict()

    assert data["author"]["username"] == user.username
    assert "email" not in data["author"]


def test_entry_rating_reflects_linked_entry(app, make_user, make_game, make_entry, make_review):
    user = make_user()
    game = make_game()
    make_entry(user, game, status="completed", rating=9)
    review = make_review(user, game)

    with app.app_context():
        data = db.session.get(Review, review.id).to_dict()

    assert data["rating"] == 9


def test_entry_rating_is_none_when_no_entry_exists(app, make_user, make_game, make_review):
    user = make_user()
    game = make_game()
    review = make_review(user, game)

    with app.app_context():
        data = db.session.get(Review, review.id).to_dict()

    assert data["rating"] is None
