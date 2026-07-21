import pytest

from app.constants import EMBEDDING_DIMENSIONS
from app.models.game import Game

pytestmark = pytest.mark.integration


def _raw_game(id, metacritic=None, ratings_count=0, **overrides):
    defaults = {
        "id": id,
        "name": f"Game {id}",
        "background_image": None,
        "platforms": [{"platform": {"name": "PC"}}],
        "genres": [{"name": "RPG"}],
        "released": "2020-01-01",
        "metacritic": metacritic,
        "rating": 4.0,
        "ratings_count": ratings_count,
        "tags": [{"name": "Great Soundtrack"}],
    }
    defaults.update(overrides)
    return defaults


@pytest.fixture(autouse=True)
def _fake_embeddings(monkeypatch):
    from app.services import embeddings as embeddings_module

    def _fake_embed_texts(texts):
        return [[0.1] * EMBEDDING_DIMENSIONS for _ in texts]

    monkeypatch.setattr(embeddings_module, "embed_texts", _fake_embed_texts)


def test_run_sync_upserts_only_games_meeting_the_quality_floor(app, mock_rawg_search):
    mock_rawg_search(
        results=[
            _raw_game(1, metacritic=90),
            _raw_game(2, metacritic=40, ratings_count=10),
        ]
    )

    with app.app_context():
        from app.services import catalog_sync

        catalog_sync.run_sync()

        titles = {g.title for g in Game.query.all()}

    assert titles == {"Game 1"}


def test_run_sync_falls_back_to_ratings_count_floor_when_no_metacritic(app, mock_rawg_search):
    mock_rawg_search(results=[_raw_game(3, metacritic=None, ratings_count=1000)])

    with app.app_context():
        from app.services import catalog_sync

        catalog_sync.run_sync()

        game = Game.query.filter_by(rawg_id=3).first()

    assert game is not None


def test_run_sync_dedupes_games_seen_across_multiple_passes(app, mock_rawg_search):
    # The same mocked response is returned for every (ordering, genre) pass
    # catalog_sync makes, so a game appearing in many passes must still only
    # be upserted once.
    mock_rawg_search(results=[_raw_game(1, metacritic=90)])

    with app.app_context():
        from app.services import catalog_sync

        result = catalog_sync.run_sync()

        game_count = Game.query.count()

    assert result["upserted"] == 1
    assert game_count == 1


def test_run_sync_sets_embedding_and_synced_at(app, mock_rawg_search):
    mock_rawg_search(results=[_raw_game(1, metacritic=90)])

    with app.app_context():
        from app.services import catalog_sync

        catalog_sync.run_sync()

        game = Game.query.filter_by(rawg_id=1).first()

    assert game.synced_at is not None
    assert game.embedding is not None
    assert len(game.embedding) == EMBEDDING_DIMENSIONS
    assert "Game 1" in game.embedding_text


def test_run_sync_updates_existing_game_in_place(app, mock_rawg_search, make_game):
    make_game(rawg_id=1, title="Old Title", metacritic=None)
    mock_rawg_search(results=[_raw_game(1, metacritic=95)])

    with app.app_context():
        from app.services import catalog_sync

        catalog_sync.run_sync()

        games = Game.query.filter_by(rawg_id=1).all()

    assert len(games) == 1
    assert games[0].title == "Game 1"
    assert games[0].metacritic == 95


def test_run_sync_returns_fetched_and_upserted_counts(app, mock_rawg_search):
    mock_rawg_search(results=[_raw_game(1, metacritic=90), _raw_game(2, metacritic=85)])

    with app.app_context():
        from app.services import catalog_sync

        result = catalog_sync.run_sync()

    assert result["fetched"] == 2
    assert result["upserted"] == 2
