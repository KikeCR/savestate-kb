import pytest

pytestmark = pytest.mark.integration


def test_register_creates_user_and_logs_in(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "username": "newuser", "password": "hunter2222"},
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
        json={"email": "taken@example.com", "username": "different", "password": "hunter2222"},
    )

    assert response.status_code == 409


def test_register_rejects_duplicate_username(client, make_user):
    make_user(email="original@example.com", username="taken")

    response = client.post(
        "/api/auth/register",
        json={"email": "different@example.com", "username": "taken", "password": "hunter2222"},
    )

    assert response.status_code == 409


def test_login_with_valid_credentials(client):
    client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "username": "loginuser", "password": "hunter2222"},
    )
    client.post("/api/auth/logout")

    response = client.post(
        "/api/auth/login", json={"email": "login@example.com", "password": "hunter2222"}
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
