import pytest


@pytest.fixture()
def csrf_client(app):
    # The shared `app` fixture disables CSRF (see conftest.py) so the rest of
    # the suite can hit routes directly; flip it on just for these tests,
    # restoring it afterward since `app` is session-scoped and shared.
    app.config["WTF_CSRF_ENABLED"] = True
    try:
        yield app.test_client()
    finally:
        app.config["WTF_CSRF_ENABLED"] = False


def test_post_without_csrf_token_is_rejected(csrf_client):
    response = csrf_client.post("/api/auth/register", json={})

    assert response.status_code == 400


def test_csrf_token_endpoint_issues_a_token_that_is_accepted(csrf_client):
    token = csrf_client.get("/api/auth/csrf").get_json()["csrf_token"]

    response = csrf_client.post(
        "/api/auth/register",
        json={},
        headers={"X-CSRFToken": token},
    )

    # Rejected for missing register fields (400), not a CSRF failure —
    # proves the token round-trip itself works.
    assert response.status_code == 400
    assert "csrf" not in (response.get_json().get("error") or "").lower()
