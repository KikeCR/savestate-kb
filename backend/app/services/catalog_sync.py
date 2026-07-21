from datetime import datetime, timezone

from app.constants import (
    CATALOG_MIN_METACRITIC,
    CATALOG_MIN_RATINGS_COUNT,
    CATALOG_SYNC_GENRES,
    CATALOG_SYNC_ORDERINGS,
    CATALOG_SYNC_PAGE_SIZE,
    CATALOG_SYNC_PAGES_PER_PASS,
)
from app.extensions import db
from app.models.game import Game
from app.services import embeddings
from app.services.rawg_client import RawgClient, build_embedding_text, normalize_rawg_game


def _meets_quality_floor(raw_game):
    metacritic = raw_game.get("metacritic")
    ratings_count = raw_game.get("ratings_count") or 0
    if metacritic is not None and metacritic >= CATALOG_MIN_METACRITIC:
        return True
    return ratings_count >= CATALOG_MIN_RATINGS_COUNT


def _fetch_candidate_raw_games(client):
    # Keyed by rawg_id to dedupe games that surface in more than one
    # (ordering, genre) pass — e.g. a top-metacritic RPG shows up both in the
    # "-metacritic" pass and the "rpg" genre pass.
    raw_games_by_id = {}

    for ordering in CATALOG_SYNC_ORDERINGS:
        for page in range(1, CATALOG_SYNC_PAGES_PER_PASS + 1):
            data = client.list_games(ordering=ordering, page=page, page_size=CATALOG_SYNC_PAGE_SIZE)
            for raw_game in data.get("results", []):
                if _meets_quality_floor(raw_game):
                    raw_games_by_id[raw_game["id"]] = raw_game

    for genre in CATALOG_SYNC_GENRES:
        data = client.list_games(
            ordering="-metacritic", genres=genre, page=1, page_size=CATALOG_SYNC_PAGE_SIZE
        )
        for raw_game in data.get("results", []):
            if _meets_quality_floor(raw_game):
                raw_games_by_id[raw_game["id"]] = raw_game

    return list(raw_games_by_id.values())


def run_sync(client=None):
    """Pulls a broad pool of well-rated games from RAWG into the local
    `games` table with embeddings, for use as the recommendation candidate
    pool. Intended to be run occasionally (e.g. weekly) via `flask
    sync-catalog` — see app/cli.py — not on a request path.
    """
    client = client or RawgClient()
    raw_games = _fetch_candidate_raw_games(client)

    normalized_games = [normalize_rawg_game(raw) for raw in raw_games]
    embedding_texts = [build_embedding_text(normalized) for normalized in normalized_games]
    vectors = embeddings.embed_texts(embedding_texts)

    now = datetime.now(timezone.utc)
    upserted = 0
    for normalized, embedding_text, vector in zip(normalized_games, embedding_texts, vectors):
        game = Game.query.filter_by(rawg_id=normalized["rawg_id"]).first()
        if not game:
            game = Game(rawg_id=normalized["rawg_id"])
            db.session.add(game)

        for field in (
            "title",
            "cover_image_url",
            "platforms",
            "genres",
            "release_date",
            "metacritic",
            "rawg_rating",
            "rawg_ratings_count",
            "tags",
        ):
            setattr(game, field, normalized[field])
        game.embedding_text = embedding_text
        game.embedding = vector
        game.synced_at = now
        upserted += 1

    db.session.commit()
    return {"fetched": len(raw_games), "upserted": upserted}
