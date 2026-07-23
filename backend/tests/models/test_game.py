from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from tests.factories import build_game


def test_to_dict_serializes_all_fields():
    game = build_game(
        rawg_id=99,
        title="Celeste",
        cover_image_url="https://example.com/celeste.jpg",
        platforms=["PC", "Switch"],
        genres=["Platformer"],
        release_date=date(2018, 1, 25),
        metacritic=92,
        rawg_rating=4.4,
        tags=["Difficult", "Great Soundtrack"],
    )
    game.id = 1

    data = game.to_dict()

    assert data == {
        "id": 1,
        "rawg_id": 99,
        "title": "Celeste",
        "cover_image_url": "https://example.com/celeste.jpg",
        "platforms": ["PC", "Switch"],
        "genres": ["Platformer"],
        "release_date": "2018-01-25",
        "metacritic": 92,
        "rawg_rating": 4.4,
        "tags": ["Difficult", "Great Soundtrack"],
        "description": None,
        "esrb_rating": None,
        "developers": [],
        "publishers": [],
        "website": None,
    }


def test_to_dict_handles_missing_release_date_and_lists():
    game = build_game(platforms=None, genres=None, tags=None, release_date=None)
    game.id = 1

    data = game.to_dict()

    assert data["release_date"] is None
    assert data["platforms"] == []
    assert data["genres"] == []
    assert data["tags"] == []


def test_to_dict_includes_detail_metadata_when_set():
    game = build_game(
        description="A great game.",
        esrb_rating="Teen",
        developers=["Studio A"],
        publishers=["Publisher A"],
        website="https://example.com",
    )
    game.id = 1

    data = game.to_dict()

    assert data["description"] == "A great game."
    assert data["esrb_rating"] == "Teen"
    assert data["developers"] == ["Studio A"]
    assert data["publishers"] == ["Publisher A"]
    assert data["website"] == "https://example.com"


def test_to_dict_excludes_detail_fetched_at():
    from datetime import datetime, timezone

    game = build_game(detail_fetched_at=datetime.now(timezone.utc))
    game.id = 1

    data = game.to_dict()

    assert "detail_fetched_at" not in data


def test_to_dict_excludes_embedding_fields():
    game = build_game(embedding_text="Celeste — Genres: Platformer.", embedding=[0.1] * 384)
    game.id = 1

    data = game.to_dict()

    assert "embedding" not in data
    assert "embedding_text" not in data


@pytest.mark.integration
def test_duplicate_rawg_id_violates_unique_constraint(app, make_game):
    make_game(rawg_id=555)

    with app.app_context():
        dupe = build_game(rawg_id=555)
        db.session.add(dupe)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()
