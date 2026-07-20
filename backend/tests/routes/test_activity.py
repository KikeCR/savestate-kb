import pytest

pytestmark = pytest.mark.integration


def test_activity_requires_authentication(client):
    response = client.get("/api/activity")

    assert response.status_code == 401


def test_activity_returns_recent_events(logged_in_client, make_game):
    from app.services.activity import record_activity

    game = make_game(title="Return of the Obra Dinn")
    app = logged_in_client.application
    with app.app_context():
        record_activity(logged_in_client.user, game, "added")

    response = logged_in_client.get("/api/activity")

    assert response.status_code == 200
    results = response.get_json()["results"]
    assert results[0]["action"] == "added"
    assert results[0]["game_title"] == "Return of the Obra Dinn"


def test_activity_limit_is_capped_at_max(logged_in_client, make_game):
    from app.services.activity import record_activity

    game = make_game()
    app = logged_in_client.application
    with app.app_context():
        for _ in range(5):
            record_activity(logged_in_client.user, game, "added")

    response = logged_in_client.get("/api/activity", query_string={"limit": 500})

    assert response.status_code == 200
    assert len(response.get_json()["results"]) <= 100
