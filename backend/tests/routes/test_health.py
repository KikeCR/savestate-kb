import pytest


@pytest.mark.integration
def test_health_returns_200_when_db_and_redis_are_up(client):
    response = client.get("/health")

    assert response.status_code == 200
    body = response.get_json()
    assert body == {"status": "ok", "postgres": "ok", "redis": "ok"}
