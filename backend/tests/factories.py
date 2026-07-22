import itertools

from app.constants import DEFAULT_ENTRY_STATUS, DEFAULT_PROFILE_VISIBILITY, FEEDBACK_LIKED
from app.models.follow import Follow
from app.models.game import Game
from app.models.game_feedback import GameFeedback
from app.models.user import User
from app.models.user_game_entry import UserGameEntry

_user_seq = itertools.count(1)
_game_seq = itertools.count(1)


def build_user(**overrides):
    n = next(_user_seq)
    password = overrides.pop("password", "correct-horse-battery")
    defaults = {
        "email": f"user{n}@example.com",
        "username": f"user{n}",
        "profile_visibility": DEFAULT_PROFILE_VISIBILITY,
    }
    defaults.update(overrides)
    user = User(**defaults)
    user.set_password(password)
    return user


def build_game(**overrides):
    n = next(_game_seq)
    defaults = {
        "rawg_id": n,
        "title": f"Game {n}",
        "cover_image_url": None,
        "platforms": [],
        "genres": [],
        "release_date": None,
    }
    defaults.update(overrides)
    return Game(**defaults)


def build_entry(user, game, **overrides):
    defaults = {
        "user_id": user.id,
        "game_id": game.id,
        "status": DEFAULT_ENTRY_STATUS,
    }
    defaults.update(overrides)
    return UserGameEntry(**defaults)


def build_follow(follower, followed, **overrides):
    defaults = {
        "follower_id": follower.id,
        "followed_id": followed.id,
    }
    defaults.update(overrides)
    return Follow(**defaults)


def build_game_feedback(user, game, **overrides):
    defaults = {
        "user_id": user.id,
        "game_id": game.id,
        "sentiment": FEEDBACK_LIKED,
    }
    defaults.update(overrides)
    return GameFeedback(**defaults)
