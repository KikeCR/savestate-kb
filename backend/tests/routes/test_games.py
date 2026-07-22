import json

import pytest
import requests

from app.services.rawg_client import RAWG_SEARCH_KEY_PREFIX

pytestmark = pytest.mark.integration


def test_search_requires_authentication(client):
    response = client.get("/api/games/search", query_string={"q": "hades"})

    assert response.status_code == 401


def test_search_requires_query_param(logged_in_client):
    response = logged_in_client.get("/api/games/search")

    assert response.status_code == 400


def test_search_returns_local_postgres_match(logged_in_client, make_game):
    make_game(title="Hollow Knight")

    response = logged_in_client.get("/api/games/search", query_string={"q": "hollow"})

    assert response.status_code == 200
    body = response.get_json()
    assert body["source"] == "postgres"
    assert body["results"][0]["title"] == "Hollow Knight"


def test_search_falls_back_to_rawg_and_persists_new_game(logged_in_client, mock_rawg_search):
    mock_rawg_search(
        results=[
            {
                "id": 123,
                "name": "Celeste",
                "background_image": "https://example.com/celeste.jpg",
                "platforms": [{"platform": {"name": "PC"}}],
                "genres": [{"name": "Platformer"}],
                "released": "2018-01-25",
            }
        ]
    )

    response = logged_in_client.get("/api/games/search", query_string={"q": "celeste"})

    assert response.status_code == 200
    body = response.get_json()
    assert body["source"] == "rawg"
    assert body["results"][0]["title"] == "Celeste"
    assert body["results"][0]["rawg_id"] == 123

    second = logged_in_client.get("/api/games/search", query_string={"q": "celeste"})
    assert second.get_json()["source"] == "postgres"


def test_search_uses_redis_cache_without_calling_rawg(
    logged_in_client, redis_container, monkeypatch
):
    # Deliberately don't use the requests_mock fixture here: it globally patches
    # `requests`, which also intercepts docker-py's calls to the Docker daemon that
    # redis_container.get_client() triggers. Instead, blank the RAWG key so that if
    # the cache-hit branch were skipped (bug), RawgClient() would raise -> 503,
    # which fails the 200 assertion below and proves RAWG was never reached.
    app = logged_in_client.application
    monkeypatch.setitem(app.config, "RAWG_API_KEY", "")

    cache_key = f"{RAWG_SEARCH_KEY_PREFIX}outer wilds"
    redis_container.get_client().set(
        cache_key,
        json.dumps(
            [
                {
                    "id": 456,
                    "name": "Outer Wilds",
                    "background_image": None,
                    "platforms": [],
                    "genres": [],
                    "released": None,
                }
            ]
        ),
    )

    response = logged_in_client.get("/api/games/search", query_string={"q": "Outer Wilds"})

    assert response.status_code == 200
    assert response.get_json()["results"][0]["title"] == "Outer Wilds"


def test_search_returns_503_when_rawg_key_missing(logged_in_client, monkeypatch):
    app = logged_in_client.application
    monkeypatch.setitem(app.config, "RAWG_API_KEY", "")

    response = logged_in_client.get("/api/games/search", query_string={"q": "no-key-game"})

    assert response.status_code == 503


def test_search_returns_502_on_rawg_request_failure(logged_in_client, mock_rawg_search):
    mock_rawg_search(exc=requests.exceptions.ConnectTimeout("timed out"))

    response = logged_in_client.get("/api/games/search", query_string={"q": "timeout-game"})

    assert response.status_code == 502


def test_popular_games_works_without_authentication(client, make_game):
    from app.constants import CATALOG_MIN_METACRITIC

    make_game(title="Acclaimed Game", metacritic=CATALOG_MIN_METACRITIC)

    response = client.get("/api/games/popular")

    assert response.status_code == 200
    body = response.get_json()
    assert any(g["title"] == "Acclaimed Game" for g in body["critics"])


def test_popular_games_excludes_owned_games_for_authenticated_user(
    logged_in_client, make_game, make_entry
):
    from app.constants import CATALOG_MIN_METACRITIC

    owned = make_game(title="Already Owned", metacritic=CATALOG_MIN_METACRITIC)
    make_entry(logged_in_client.user, owned)

    response = logged_in_client.get("/api/games/popular")

    assert response.status_code == 200
    body = response.get_json()
    assert not any(g["title"] == "Already Owned" for g in body["critics"])


def test_popular_games_does_not_exclude_anything_for_anonymous_user(client, make_game):
    from app.constants import CATALOG_MIN_METACRITIC

    make_game(title="Some Game", metacritic=CATALOG_MIN_METACRITIC)

    response = client.get("/api/games/popular")

    assert response.status_code == 200
    body = response.get_json()
    assert any(g["title"] == "Some Game" for g in body["critics"])
