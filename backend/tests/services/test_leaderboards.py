import pytest

pytestmark = pytest.mark.integration


def test_record_completion_increments_score(app, make_user):
    from app.services.leaderboards import get_completions_leaderboard, record_completion

    user = make_user()
    with app.app_context():
        record_completion(user.id, 2026)
        record_completion(user.id, 2026)

        leaderboard = get_completions_leaderboard(year=2026)

    assert (str(user.id), 2.0) in leaderboard


def test_remove_completion_removes_entry_once_score_reaches_zero(app, make_user):
    from app.services.leaderboards import (
        get_completions_leaderboard,
        record_completion,
        remove_completion,
    )

    user = make_user()
    with app.app_context():
        record_completion(user.id, 2026)
        remove_completion(user.id, 2026)

        leaderboard = get_completions_leaderboard(year=2026)

    assert leaderboard == []


def test_get_completions_leaderboard_orders_by_score_descending(app, make_user):
    from app.services.leaderboards import get_completions_leaderboard, record_completion

    leader = make_user()
    runner_up = make_user()
    with app.app_context():
        record_completion(leader.id, 2026)
        record_completion(leader.id, 2026)
        record_completion(runner_up.id, 2026)

        leaderboard = get_completions_leaderboard(year=2026)

    assert leaderboard[0][0] == str(leader.id)


def test_refresh_avg_rating_computes_mean_of_ratings(app, make_user, make_game, make_entry):
    from app.services.leaderboards import get_avg_rating_leaderboard, refresh_avg_rating

    user = make_user()
    game_a = make_game()
    game_b = make_game()
    make_entry(user, game_a, rating=6)
    make_entry(user, game_b, rating=10)

    with app.app_context():
        refresh_avg_rating(user.id)
        leaderboard = get_avg_rating_leaderboard()

    assert (str(user.id), 8.0) in leaderboard


def test_refresh_avg_rating_removes_user_when_no_ratings_remain(app, make_user):
    from app.services.leaderboards import get_avg_rating_leaderboard, refresh_avg_rating

    user = make_user()
    with app.app_context():
        refresh_avg_rating(user.id)
        leaderboard = get_avg_rating_leaderboard()

    assert leaderboard == []
