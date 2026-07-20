from datetime import date, datetime, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.user_game_entry import UserGameEntry
from tests.factories import build_entry, build_game


def test_effective_year_prefers_year_played():
    entry = UserGameEntry(year_played=2019, completion_date=date(2021, 6, 1))

    assert entry.effective_year == 2019


def test_effective_year_falls_back_to_completion_date():
    entry = UserGameEntry(year_played=None, completion_date=date(2021, 6, 1))

    assert entry.effective_year == 2021


def test_effective_year_falls_back_to_today_when_neither_set():
    entry = UserGameEntry(year_played=None, completion_date=None)

    assert entry.effective_year == date.today().year


def test_to_dict_includes_nested_game():
    game = build_game(rawg_id=7, title="Outer Wilds")
    game.id = 3
    entry = UserGameEntry(
        id=10,
        user_id=1,
        game_id=3,
        status="completed",
        rating=9,
        hours_played=12.5,
        tags=["indie"],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    entry.game = game

    data = entry.to_dict()

    assert data["id"] == 10
    assert data["status"] == "completed"
    assert data["rating"] == 9
    assert data["game"]["title"] == "Outer Wilds"


def test_to_dict_handles_no_game_and_no_tags():
    entry = UserGameEntry(
        id=10,
        user_id=1,
        game_id=3,
        tags=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    data = entry.to_dict()

    assert data["game"] is None
    assert data["tags"] == []


@pytest.mark.integration
def test_unique_constraint_on_user_and_game(app, make_user, make_game, make_entry):
    user = make_user()
    game = make_game()
    make_entry(user, game)

    with app.app_context():
        dupe = build_entry(user, game)
        db.session.add(dupe)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


@pytest.mark.integration
def test_status_check_constraint_rejects_invalid_value(app, make_user, make_game):
    user = make_user()
    game = make_game()

    with app.app_context():
        entry = build_entry(user, game, status="not-a-real-status")
        db.session.add(entry)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


@pytest.mark.integration
def test_rating_check_constraint_rejects_out_of_range_value(app, make_user, make_game):
    user = make_user()
    game = make_game()

    with app.app_context():
        entry = build_entry(user, game, rating=11)
        db.session.add(entry)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


@pytest.mark.integration
def test_year_played_check_constraint_rejects_too_old_value(app, make_user, make_game):
    user = make_user()
    game = make_game()

    with app.app_context():
        entry = build_entry(user, game, year_played=1969)
        db.session.add(entry)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()
