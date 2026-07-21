import pytest

pytestmark = pytest.mark.integration


def test_requires_authentication(client):
    response = client.get("/api/recommendations")

    assert response.status_code == 401


def test_returns_cold_start_for_new_user(logged_in_client):
    response = logged_in_client.get("/api/recommendations")

    assert response.status_code == 200
    body = response.get_json()
    assert body["cold_start"] is True
    assert body["recommendations"] == []
    assert body["source"] == "retrieval_only"


def test_returns_recommendations_for_user_with_taste_signals(
    logged_in_client, make_game, make_entry, monkeypatch
):
    from app.constants import EMBEDDING_DIMENSIONS, RECOMMENDATION_MIN_TASTE_SIGNALS
    from app.services import recommendation_service

    vector = [0.0] * EMBEDDING_DIMENSIONS
    vector[0] = 1.0
    monkeypatch.setattr(recommendation_service.embeddings, "embed_text", lambda text: vector)

    user = logged_in_client.user
    for i in range(RECOMMENDATION_MIN_TASTE_SIGNALS):
        make_entry(user, make_game(title=f"Favorite {i}", genres=["RPG"]), rating=9, favorite=True)
    make_game(title="Great Pick", metacritic=90, embedding=vector)

    response = logged_in_client.get("/api/recommendations")

    assert response.status_code == 200
    body = response.get_json()
    # No DEEPSEEK_API_KEY/KIMI_API_KEY are configured in the test app, so
    # this exercises the full pipeline falling through to retrieval-only.
    assert body["source"] == "retrieval_only"
    assert body["cold_start"] is False
    assert any(r["game"]["title"] == "Great Pick" for r in body["recommendations"])


def test_refresh_requires_authentication(client):
    response = client.post("/api/recommendations/refresh")

    assert response.status_code == 401


def test_refresh_succeeds_on_first_call(logged_in_client):
    response = logged_in_client.post("/api/recommendations/refresh")

    assert response.status_code == 200
    assert response.get_json()["cold_start"] is True


def test_refresh_is_rate_limited_on_immediate_second_call(logged_in_client):
    first = logged_in_client.post("/api/recommendations/refresh")
    assert first.status_code == 200

    second = logged_in_client.post("/api/recommendations/refresh")

    assert second.status_code == 429
