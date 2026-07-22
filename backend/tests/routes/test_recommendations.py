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
    from app.constants import RECOMMENDATION_REFRESH_COOLDOWN_SECONDS

    first = logged_in_client.post("/api/recommendations/refresh")
    assert first.status_code == 200

    second = logged_in_client.post("/api/recommendations/refresh")

    assert second.status_code == 429
    body = second.get_json()
    assert 0 < body["retry_after_seconds"] <= RECOMMENDATION_REFRESH_COOLDOWN_SECONDS
    assert str(body["retry_after_seconds"]) in body["error"] or "minute" in body["error"]


def test_set_feedback_requires_authentication(client, make_game):
    game = make_game()

    response = client.put(f"/api/recommendations/feedback/{game.id}", json={"sentiment": "liked"})

    assert response.status_code == 401


def test_set_feedback_rejects_invalid_sentiment(logged_in_client, make_game):
    game = make_game()

    response = logged_in_client.put(
        f"/api/recommendations/feedback/{game.id}", json={"sentiment": "meh"}
    )

    assert response.status_code == 400


def test_set_feedback_returns_404_for_unknown_game(logged_in_client):
    response = logged_in_client.put(
        "/api/recommendations/feedback/999999", json={"sentiment": "liked"}
    )

    assert response.status_code == 404


def test_set_feedback_persists_and_invalidates_cache(logged_in_client, make_game, monkeypatch):
    from app.services import recommendation_service

    invalidated = {"called": False}
    monkeypatch.setattr(
        recommendation_service,
        "invalidate_cache",
        lambda user_id, redis_client=None: invalidated.__setitem__("called", True),
    )
    game = make_game()

    response = logged_in_client.put(
        f"/api/recommendations/feedback/{game.id}", json={"sentiment": "liked"}
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["game_id"] == game.id
    assert body["sentiment"] == "liked"
    assert invalidated["called"] is True


def test_set_feedback_upserts_existing_row(logged_in_client, make_game):
    game = make_game()
    logged_in_client.put(f"/api/recommendations/feedback/{game.id}", json={"sentiment": "liked"})

    response = logged_in_client.put(
        f"/api/recommendations/feedback/{game.id}", json={"sentiment": "disliked"}
    )

    assert response.status_code == 200
    assert response.get_json()["sentiment"] == "disliked"


def test_clear_feedback_requires_authentication(client, make_game):
    game = make_game()

    response = client.delete(f"/api/recommendations/feedback/{game.id}")

    assert response.status_code == 401


def test_clear_feedback_is_a_no_op_when_no_row_exists(logged_in_client, make_game):
    game = make_game()

    response = logged_in_client.delete(f"/api/recommendations/feedback/{game.id}")

    assert response.status_code == 204


def test_clear_feedback_removes_row_and_invalidates_cache(
    logged_in_client, make_game, monkeypatch
):
    from app.services import recommendation_service

    invalidated = {"called": False}
    monkeypatch.setattr(
        recommendation_service,
        "invalidate_cache",
        lambda user_id, redis_client=None: invalidated.__setitem__("called", True),
    )
    game = make_game()
    logged_in_client.put(f"/api/recommendations/feedback/{game.id}", json={"sentiment": "liked"})
    invalidated["called"] = False

    response = logged_in_client.delete(f"/api/recommendations/feedback/{game.id}")

    assert response.status_code == 204
    assert invalidated["called"] is True


def test_topup_requires_authentication(client):
    response = client.post("/api/recommendations/topup")

    assert response.status_code == 401


def test_topup_rejects_malformed_exclude_game_ids(logged_in_client):
    response = logged_in_client.post(
        "/api/recommendations/topup", json={"exclude_game_ids": "not-a-list"}
    )

    assert response.status_code == 400


def test_topup_succeeds_on_first_call(logged_in_client):
    response = logged_in_client.post("/api/recommendations/topup", json={"exclude_game_ids": []})

    assert response.status_code == 200
    assert response.get_json()["cold_start"] is True


def test_topup_is_rate_limited_independently_from_refresh(logged_in_client):
    from app.constants import RECOMMENDATION_TOPUP_COOLDOWN_SECONDS

    refresh = logged_in_client.post("/api/recommendations/refresh")
    assert refresh.status_code == 200

    first_topup = logged_in_client.post("/api/recommendations/topup")
    assert first_topup.status_code == 200

    second_topup = logged_in_client.post("/api/recommendations/topup")

    assert second_topup.status_code == 429
    body = second_topup.get_json()
    assert 0 < body["retry_after_seconds"] <= RECOMMENDATION_TOPUP_COOLDOWN_SECONDS


def test_topup_enforces_max_per_window(logged_in_client, monkeypatch):
    from app.services import recommendation_service

    monkeypatch.setattr(
        recommendation_service, "get_topup_cooldown_seconds_remaining", lambda *a, **k: 0
    )
    monkeypatch.setattr(recommendation_service, "try_reserve_topup_slot", lambda *a, **k: False)

    response = logged_in_client.post("/api/recommendations/topup")

    assert response.status_code == 429
