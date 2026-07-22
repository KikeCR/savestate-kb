from datetime import datetime, timedelta, timezone

import pytest

from app.extensions import db
from app.models.password_reset_token import PasswordResetToken
from app.routes.auth import _hash_token

pytestmark = pytest.mark.integration

VALID_PASSWORD = "Hunter2222!"


def test_register_creates_user_and_logs_in(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "username": "newuser", "password": VALID_PASSWORD},
    )

    assert response.status_code == 201
    body = response.get_json()
    assert body["email"] == "new@example.com"
    assert body["username"] == "newuser"

    me = client.get("/api/auth/me")
    assert me.get_json()["user"]["username"] == "newuser"


def test_register_rejects_missing_fields(client):
    response = client.post("/api/auth/register", json={"email": "", "username": "", "password": ""})

    assert response.status_code == 400


def test_register_rejects_short_password(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "short@example.com", "username": "shortpw", "password": "short"},
    )

    assert response.status_code == 400


def test_register_rejects_duplicate_email(client, make_user):
    make_user(email="taken@example.com", username="original")

    response = client.post(
        "/api/auth/register",
        json={"email": "taken@example.com", "username": "different", "password": VALID_PASSWORD},
    )

    assert response.status_code == 409


def test_register_rejects_duplicate_username(client, make_user):
    make_user(email="original@example.com", username="taken")

    response = client.post(
        "/api/auth/register",
        json={"email": "different@example.com", "username": "taken", "password": VALID_PASSWORD},
    )

    assert response.status_code == 409


def test_login_with_valid_credentials(client):
    client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "username": "loginuser", "password": VALID_PASSWORD},
    )
    client.post("/api/auth/logout")

    response = client.post(
        "/api/auth/login", json={"email": "login@example.com", "password": VALID_PASSWORD}
    )

    assert response.status_code == 200
    assert response.get_json()["username"] == "loginuser"


def test_login_with_wrong_password(client, make_user):
    make_user(email="wrongpw@example.com", username="wrongpwuser", password="correct-password")

    response = client.post(
        "/api/auth/login", json={"email": "wrongpw@example.com", "password": "incorrect-password"}
    )

    assert response.status_code == 401


def test_login_with_unknown_email(client):
    response = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "whatever123"}
    )

    assert response.status_code == 401


def test_logout_requires_authentication(client):
    response = client.post("/api/auth/logout")

    assert response.status_code == 401


def test_logout_clears_session(logged_in_client):
    response = logged_in_client.post("/api/auth/logout")

    assert response.status_code == 204
    me = logged_in_client.get("/api/auth/me")
    assert me.get_json()["user"] is None


def test_me_when_not_authenticated(client):
    response = client.get("/api/auth/me")

    assert response.get_json() == {"user": None}


def test_update_me_changes_profile_visibility(logged_in_client):
    response = logged_in_client.patch("/api/auth/me", json={"profile_visibility": "private"})

    assert response.status_code == 200
    assert response.get_json()["profile_visibility"] == "private"


def test_update_me_rejects_invalid_visibility(logged_in_client):
    response = logged_in_client.patch("/api/auth/me", json={"profile_visibility": "invalid"})

    assert response.status_code == 400


def test_update_me_requires_authentication(client):
    response = client.patch("/api/auth/me", json={"profile_visibility": "private"})

    assert response.status_code == 401


def test_update_me_sets_avatar_url(logged_in_client):
    response = logged_in_client.patch(
        "/api/auth/me", json={"avatar_url": "https://example.com/avatar.png"}
    )

    assert response.status_code == 200
    assert response.get_json()["avatar_url"] == "https://example.com/avatar.png"


def test_update_me_clears_avatar_url(logged_in_client):
    logged_in_client.patch("/api/auth/me", json={"avatar_url": "https://example.com/avatar.png"})

    response = logged_in_client.patch("/api/auth/me", json={"avatar_url": ""})

    assert response.status_code == 200
    assert response.get_json()["avatar_url"] is None


def test_update_me_rejects_invalid_avatar_url(logged_in_client):
    response = logged_in_client.patch("/api/auth/me", json={"avatar_url": "not-a-url"})

    assert response.status_code == 400


def test_update_me_rejects_non_http_scheme_avatar_url(logged_in_client):
    response = logged_in_client.patch(
        "/api/auth/me", json={"avatar_url": "ftp://example.com/avatar.png"}
    )

    assert response.status_code == 400


def test_register_rejects_password_without_uppercase(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "noupper@example.com", "username": "noupper", "password": "hunter22!!"},
    )

    assert response.status_code == 400


def test_register_rejects_password_without_special_char(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "nospecial@example.com", "username": "nospecial", "password": "Hunter2222"},
    )

    assert response.status_code == 400


def _capture_reset_url(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        "app.services.email_service.send_password_reset_email",
        lambda to_email, username, reset_url: captured.update(reset_url=reset_url),
    )
    return captured


def test_forgot_password_returns_generic_message_for_unknown_email(client):
    response = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})

    assert response.status_code == 200
    assert "if that email is registered" in response.get_json()["message"]


def test_forgot_password_returns_same_generic_message_for_known_email(client, make_user):
    make_user(email="known@example.com")

    response = client.post("/api/auth/forgot-password", json={"email": "known@example.com"})

    assert response.status_code == 200
    assert "if that email is registered" in response.get_json()["message"]


def test_forgot_password_creates_a_reset_token_for_known_email(app, client, make_user):
    user = make_user(email="known2@example.com")

    client.post("/api/auth/forgot-password", json={"email": "known2@example.com"})

    with app.app_context():
        tokens = PasswordResetToken.query.filter_by(user_id=user.id).all()
        assert len(tokens) == 1
        assert tokens[0].used_at is None
        assert tokens[0].expires_at > datetime.now(timezone.utc)


def test_forgot_password_invalidates_prior_unused_tokens(app, client, make_user):
    user = make_user(email="known3@example.com")

    client.post("/api/auth/forgot-password", json={"email": "known3@example.com"})
    client.post("/api/auth/forgot-password", json={"email": "known3@example.com"})

    with app.app_context():
        tokens = PasswordResetToken.query.filter_by(user_id=user.id).all()
        assert len(tokens) == 1


def test_reset_password_updates_password_and_logs_in(client, make_user, monkeypatch):
    make_user(email="reset@example.com", password="OldPass123!")
    captured = _capture_reset_url(monkeypatch)

    client.post("/api/auth/forgot-password", json={"email": "reset@example.com"})
    raw_token = captured["reset_url"].rsplit("/", 1)[-1]

    response = client.post(
        "/api/auth/reset-password", json={"token": raw_token, "password": "NewPass123!"}
    )

    assert response.status_code == 200
    assert response.get_json()["email"] == "reset@example.com"

    me = client.get("/api/auth/me")
    assert me.get_json()["user"]["email"] == "reset@example.com"


def test_reset_password_rejects_weak_new_password(client, make_user, monkeypatch):
    make_user(email="resetweak@example.com", password="OldPass123!")
    captured = _capture_reset_url(monkeypatch)

    client.post("/api/auth/forgot-password", json={"email": "resetweak@example.com"})
    raw_token = captured["reset_url"].rsplit("/", 1)[-1]

    response = client.post(
        "/api/auth/reset-password", json={"token": raw_token, "password": "weak"}
    )

    assert response.status_code == 400


def test_reset_password_token_cannot_be_reused(client, make_user, monkeypatch):
    make_user(email="reuse@example.com", password="OldPass123!")
    captured = _capture_reset_url(monkeypatch)

    client.post("/api/auth/forgot-password", json={"email": "reuse@example.com"})
    raw_token = captured["reset_url"].rsplit("/", 1)[-1]

    first = client.post(
        "/api/auth/reset-password", json={"token": raw_token, "password": "NewPass123!"}
    )
    second = client.post(
        "/api/auth/reset-password", json={"token": raw_token, "password": "AnotherPass1!"}
    )

    assert first.status_code == 200
    assert second.status_code == 400


def test_reset_password_rejects_unknown_token(client):
    response = client.post(
        "/api/auth/reset-password", json={"token": "not-a-real-token", "password": "NewPass123!"}
    )

    assert response.status_code == 400


def test_reset_password_rejects_expired_token(app, client, make_user):
    user = make_user(email="expired@example.com")
    raw_token = "some-raw-token-value"

    with app.app_context():
        db.session.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=_hash_token(raw_token),
                expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            )
        )
        db.session.commit()

    response = client.post(
        "/api/auth/reset-password", json={"token": raw_token, "password": "NewPass123!"}
    )

    assert response.status_code == 400


def test_change_password_succeeds_with_correct_current_password(client, make_user):
    make_user(email="changepw@example.com", username="changepw", password="OldPass123!")
    client.post(
        "/api/auth/login", json={"email": "changepw@example.com", "password": "OldPass123!"}
    )

    response = client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "NewPass123!"},
    )

    assert response.status_code == 200

    client.post("/api/auth/logout")
    relogin = client.post(
        "/api/auth/login", json={"email": "changepw@example.com", "password": "NewPass123!"}
    )
    assert relogin.status_code == 200


def test_change_password_rejects_wrong_current_password(logged_in_client):
    response = logged_in_client.post(
        "/api/auth/change-password",
        json={"current_password": "WrongPass1!", "new_password": "NewPass123!"},
    )

    assert response.status_code == 401


def test_change_password_rejects_weak_new_password(client, make_user):
    make_user(email="weakchange@example.com", username="weakchange", password="OldPass123!")
    client.post(
        "/api/auth/login", json={"email": "weakchange@example.com", "password": "OldPass123!"}
    )

    response = client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "weak"},
    )

    assert response.status_code == 400


def test_change_password_requires_authentication(client):
    response = client.post(
        "/api/auth/change-password",
        json={"current_password": "whatever", "new_password": "NewPass123!"},
    )

    assert response.status_code == 401
