from datetime import datetime

import requests
from flask import current_app

RAWG_BASE_URL = "https://api.rawg.io/api"
REQUEST_TIMEOUT = 5
RAWG_SEARCH_CACHE_TTL_SECONDS = 6 * 60 * 60
RAWG_SEARCH_KEY_PREFIX = "rawg:search:"


class RawgConfigError(RuntimeError):
    pass


class RawgClient:
    # Only catches a missing key, not an invalid one — RAWG doesn't expose a
    # cheap "is this key valid" check, so a garbage/placeholder key (e.g. the
    # .env.example default) passes this and only fails per-request with a 401
    # from RAWG itself, which routes/games.py turns into a 502. Before prod,
    # confirm search actually works end-to-end with the real key, not just
    # that the app boots.
    def __init__(self, api_key=None):
        self.api_key = api_key or current_app.config["RAWG_API_KEY"]
        if not self.api_key:
            raise RawgConfigError("RAWG_API_KEY is not configured")

    def search_games(self, query, page=1, page_size=10):
        resp = requests.get(
            f"{RAWG_BASE_URL}/games",
            params={"key": self.api_key, "search": query, "page": page, "page_size": page_size},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json()


def normalize_rawg_game(data):
    platforms = sorted(
        {
            entry["platform"]["name"]
            for entry in data.get("platforms") or []
            if entry.get("platform")
        }
    )
    genres = sorted({genre["name"] for genre in data.get("genres") or []})

    released = data.get("released")
    release_date = None
    if released:
        try:
            release_date = datetime.strptime(released, "%Y-%m-%d").date()
        except ValueError:
            release_date = None

    return {
        "rawg_id": data["id"],
        "title": data["name"],
        "cover_image_url": data.get("background_image"),
        "platforms": platforms,
        "genres": genres,
        "release_date": release_date,
    }
