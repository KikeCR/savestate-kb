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
    }


def test_to_dict_handles_missing_release_date_and_lists():
    game = build_game(platforms=None, genres=None, release_date=None)
    game.id = 1

    data = game.to_dict()

    assert data["release_date"] is None
    assert data["platforms"] == []
    assert data["genres"] == []


@pytest.mark.integration
def test_duplicate_rawg_id_violates_unique_constraint(app, make_game):
    make_game(rawg_id=555)

    with app.app_context():
        dupe = build_game(rawg_id=555)
        db.session.add(dupe)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()
