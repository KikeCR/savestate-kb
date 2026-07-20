import pytest

pytestmark = pytest.mark.integration


def test_completions_requires_authentication(client):
    response = client.get("/api/leaderboards/completions")

    assert response.status_code == 401


def test_completions_returns_serialized_users(logged_in_client, make_user):
    from app.services.leaderboards import record_completion

    other = make_user(username="rival")
    app = logged_in_client.application
    with app.app_context():
        record_completion(logged_in_client.user.id, 2026)
        record_completion(other.id, 2026)
        record_completion(other.id, 2026)

    response = logged_in_client.get("/api/leaderboards/completions", query_string={"year": 2026})

    assert response.status_code == 200
    body = response.get_json()
    assert body["year"] == 2026
    assert body["results"][0]["user"]["username"] == "rival"
    assert body["results"][0]["score"] == 2.0


def test_avg_rating_rounds_score(logged_in_client):
    from app.services.leaderboards import get_avg_rating_leaderboard

    app = logged_in_client.application
    with app.app_context():
        from app.extensions import redis_client

        redis_client.zadd("leaderboard:avg_rating", {str(logged_in_client.user.id): 7.6666})
        assert get_avg_rating_leaderboard()

    response = logged_in_client.get("/api/leaderboards/avg-rating")

    assert response.status_code == 200
    assert response.get_json()["results"][0]["score"] == 7.67
