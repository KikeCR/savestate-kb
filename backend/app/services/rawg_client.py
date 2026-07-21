from datetime import datetime

import requests
from flask import current_app

RAWG_BASE_URL = "https://api.rawg.io/api"
REQUEST_TIMEOUT = 5
RAWG_SEARCH_CACHE_TTL_SECONDS = 6 * 60 * 60
RAWG_SEARCH_KEY_PREFIX = "rawg:search:"

# RAWG returns far more tags per game than are useful for an embedding's
# source text (many are noisy/low-signal, e.g. "Singleplayer"); cap how many
# we keep to the highest-relevance ones, which RAWG already orders first.
MAX_TAGS_PER_GAME = 8


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

    def list_games(self, ordering, genres=None, page=1, page_size=40):
        """Used by catalog_sync to pull well-rated games for the
        recommendation candidate pool — no `search` term, just an ordering
        (e.g. "-metacritic", "-rating") and an optional genre filter."""
        params = {
            "key": self.api_key,
            "ordering": ordering,
            "page": page,
            "page_size": page_size,
        }
        if genres:
            params["genres"] = genres
        resp = requests.get(
            f"{RAWG_BASE_URL}/games",
            params=params,
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
    tags = [tag["name"] for tag in (data.get("tags") or [])[:MAX_TAGS_PER_GAME] if tag.get("name")]

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
        "metacritic": data.get("metacritic"),
        "rawg_rating": data.get("rating"),
        "rawg_ratings_count": data.get("ratings_count"),
        "tags": tags,
    }


def build_embedding_text(normalized_game):
    """Composes the structured text embedded for RAG retrieval. Deliberately
    built from list/search-endpoint fields only (title, genres, tags,
    platforms, metacritic) — RAWG's full description text lives behind the
    much more expensive per-game detail endpoint, which isn't worth the RAWG
    quota for a candidate pool of thousands of games."""
    parts = [normalized_game["title"]]
    if normalized_game["genres"]:
        parts.append(f"Genres: {', '.join(normalized_game['genres'])}.")
    if normalized_game["tags"]:
        parts.append(f"Tags: {', '.join(normalized_game['tags'])}.")
    if normalized_game["platforms"]:
        parts.append(f"Platforms: {', '.join(normalized_game['platforms'])}.")
    if normalized_game["metacritic"] is not None:
        parts.append(f"Metacritic: {normalized_game['metacritic']}.")
    return " ".join(parts)
