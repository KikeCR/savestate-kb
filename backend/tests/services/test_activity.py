import pytest

pytestmark = pytest.mark.integration


def test_record_activity_pushes_event_with_expected_shape(app, make_user, make_game):
    from app.services.activity import get_recent_activity, record_activity

    user = make_user()
    game = make_game(title="Disco Elysium")
    with app.app_context():
        record_activity(user, game, "added")

        events = get_recent_activity()

    assert len(events) == 1
    event = events[0]
    assert event["user_id"] == user.id
    assert event["username"] == user.username
    assert event["game_title"] == "Disco Elysium"
    assert event["action"] == "added"


def test_record_activity_includes_extra_details(app, make_user, make_game):
    from app.services.activity import get_recent_activity, record_activity

    user = make_user()
    game = make_game()
    with app.app_context():
        record_activity(user, game, "rated", rating=7)

        events = get_recent_activity()

    assert events[0]["rating"] == 7


def test_record_activity_is_most_recent_first(app, make_user, make_game):
    from app.services.activity import get_recent_activity, record_activity

    user = make_user()
    game_a = make_game(title="First")
    game_b = make_game(title="Second")
    with app.app_context():
        record_activity(user, game_a, "added")
        record_activity(user, game_b, "added")

        events = get_recent_activity()

    assert events[0]["game_title"] == "Second"
    assert events[1]["game_title"] == "First"


def test_record_activity_trims_feed_to_max_length(app, make_user, make_game):
    from app.services.activity import ACTIVITY_FEED_MAX_LENGTH, get_recent_activity, record_activity

    user = make_user()
    game = make_game()
    with app.app_context():
        for _ in range(ACTIVITY_FEED_MAX_LENGTH + 10):
            record_activity(user, game, "added")

        events = get_recent_activity(limit=ACTIVITY_FEED_MAX_LENGTH + 50)

    assert len(events) == ACTIVITY_FEED_MAX_LENGTH


def test_get_recent_activity_respects_limit(app, make_user, make_game):
    from app.services.activity import get_recent_activity, record_activity

    user = make_user()
    game = make_game()
    with app.app_context():
        for _ in range(5):
            record_activity(user, game, "added")

        events = get_recent_activity(limit=2)

    assert len(events) == 2
