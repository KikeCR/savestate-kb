from datetime import datetime, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from app.constants import VISIBILITY_PRIVATE, VISIBILITY_PUBLIC
from app.extensions import db
from app.models.user import User
from tests.factories import build_user


def test_set_password_and_check_password_roundtrip():
    user = build_user(password="s3cret-passw0rd")

    assert user.check_password("s3cret-passw0rd") is True
    assert user.check_password("wrong-password") is False


def test_to_public_dict_excludes_email():
    user = build_user(email="hidden@example.com", username="visible")
    user.id = 1
    user.created_at = datetime.now(timezone.utc)

    data = user.to_public_dict()

    assert data["username"] == "visible"
    assert "email" not in data


def test_to_public_dict_defaults_avatar_url_to_none():
    user = build_user()
    user.id = 1
    user.created_at = datetime.now(timezone.utc)

    data = user.to_public_dict()

    assert data["avatar_url"] is None


def test_to_public_dict_includes_avatar_url_when_set():
    user = build_user(avatar_url="https://example.com/avatar.png")
    user.id = 1
    user.created_at = datetime.now(timezone.utc)

    data = user.to_public_dict()

    assert data["avatar_url"] == "https://example.com/avatar.png"


def test_to_private_dict_includes_email():
    user = build_user(email="hidden@example.com", username="visible")
    user.id = 1
    user.created_at = datetime.now(timezone.utc)

    data = user.to_private_dict()

    assert data["email"] == "hidden@example.com"
    assert data["username"] == "visible"


@pytest.mark.integration
def test_duplicate_email_violates_unique_constraint(app, make_user):
    make_user(email="dupe@example.com", username="first")

    with app.app_context():
        dupe = build_user(email="dupe@example.com", username="second")
        db.session.add(dupe)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


@pytest.mark.integration
def test_duplicate_username_violates_unique_constraint(app, make_user):
    make_user(email="first@example.com", username="dupeuser")

    with app.app_context():
        dupe = build_user(email="second@example.com", username="dupeuser")
        db.session.add(dupe)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


@pytest.mark.integration
def test_profile_visibility_check_constraint_rejects_invalid_value(app):
    with app.app_context():
        user = build_user(profile_visibility="bogus")
        db.session.add(user)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


@pytest.mark.integration
def test_profile_visibility_check_constraint_accepts_valid_values(app):
    with app.app_context():
        for value in (VISIBILITY_PUBLIC, VISIBILITY_PRIVATE):
            user = build_user(profile_visibility=value)
            db.session.add(user)
            db.session.commit()

        assert User.query.count() == 2
