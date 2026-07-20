from datetime import datetime, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.activity import Activity

pytestmark = pytest.mark.integration


def test_to_dict_includes_rating_and_year_played_as_none_when_unset(make_user, make_game):
    user = make_user()
    game = make_game(title="Hades")
    activity = Activity(
        user_id=user.id,
        game_id=game.id,
        action="added",
        created_at=datetime.now(timezone.utc),
    )
    activity.user = user
    activity.game = game

    data = activity.to_dict()

    assert data["username"] == user.username
    assert data["game_title"] == "Hades"
    assert data["action"] == "added"
    assert data["rating"] is None
    assert data["year_played"] is None


def test_to_dict_includes_rating_and_year_played_when_set(make_user, make_game):
    user = make_user()
    game = make_game()
    activity = Activity(
        user_id=user.id,
        game_id=game.id,
        action="rated",
        rating=8,
        year_played=2023,
        created_at=datetime.now(timezone.utc),
    )
    activity.user = user
    activity.game = game

    data = activity.to_dict()

    assert data["rating"] == 8
    assert data["year_played"] == 2023


def test_check_constraint_rejects_invalid_action(app, make_user, make_game):
    user = make_user()
    game = make_game()

    with app.app_context():
        activity = Activity(user_id=user.id, game_id=game.id, action="not-a-real-action")
        db.session.add(activity)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()
