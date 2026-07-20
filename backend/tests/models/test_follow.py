import pytest
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from tests.factories import build_follow

pytestmark = pytest.mark.integration


def test_follow_persists_expected_fields(app, make_user, make_follow):
    follower = make_user()
    followed = make_user()

    follow = make_follow(follower, followed)

    assert follow.follower_id == follower.id
    assert follow.followed_id == followed.id
    assert follow.created_at is not None


def test_unique_constraint_on_follower_and_followed(app, make_user, make_follow):
    follower = make_user()
    followed = make_user()
    make_follow(follower, followed)

    with app.app_context():
        dupe = build_follow(follower, followed)
        db.session.add(dupe)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


def test_check_constraint_rejects_self_follow(app, make_user):
    user = make_user()

    with app.app_context():
        follow = build_follow(user, user)
        db.session.add(follow)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()
