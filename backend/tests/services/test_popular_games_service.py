import pytest

from app.constants import (
    CATALOG_MIN_METACRITIC,
    HOME_POPULAR_MIN_DISTINCT_USERS,
    HOME_POPULAR_RESULT_LIMIT,
)
from app.services import popular_games_service

pytestmark = pytest.mark.integration


def _add_players(make_user, make_entry, game, count):
    for _ in range(count):
        user = make_user()
        make_entry(user, game)


def test_community_unavailable_below_min_distinct_users(app, make_user, make_game, make_entry):
    with app.app_context():
        game = make_game(title="Thin Signal")
        _add_players(make_user, make_entry, game, HOME_POPULAR_MIN_DISTINCT_USERS - 1)

        result = popular_games_service.get_popular_games()

    assert result["community_available"] is False
    assert result["community"] == []


def test_community_available_at_min_distinct_users(app, make_user, make_game, make_entry):
    with app.app_context():
        game = make_game(title="Enough Signal")
        _add_players(make_user, make_entry, game, HOME_POPULAR_MIN_DISTINCT_USERS)

        result = popular_games_service.get_popular_games()

    assert result["community_available"] is True
    assert any(g["title"] == "Enough Signal" for g in result["community"])


def test_community_games_ordered_by_entry_count_desc(app, make_user, make_game, make_entry):
    with app.app_context():
        popular = make_game(title="Most Added")
        less_popular = make_game(title="Less Added")
        _add_players(make_user, make_entry, popular, HOME_POPULAR_MIN_DISTINCT_USERS + 2)
        _add_players(make_user, make_entry, less_popular, HOME_POPULAR_MIN_DISTINCT_USERS)

        result = popular_games_service.get_popular_games()

    titles = [g["title"] for g in result["community"]]
    assert titles.index("Most Added") < titles.index("Less Added")


def test_community_respects_exclude_game_ids(app, make_user, make_game, make_entry):
    with app.app_context():
        excluded = make_game(title="Owned Already")
        _add_players(make_user, make_entry, excluded, HOME_POPULAR_MIN_DISTINCT_USERS)

        result = popular_games_service.get_popular_games(exclude_game_ids={excluded.id})

    titles = [g["title"] for g in result["community"]]
    assert "Owned Already" not in titles


def test_critics_list_available_with_zero_users(app, make_game):
    with app.app_context():
        make_game(title="Acclaimed Game", metacritic=CATALOG_MIN_METACRITIC)

        result = popular_games_service.get_popular_games()

    assert result["community_available"] is False
    titles = [g["title"] for g in result["critics"]]
    assert "Acclaimed Game" in titles


def test_critics_list_excludes_low_quality_games(app, make_game):
    with app.app_context():
        make_game(title="Mediocre Game", metacritic=40, rawg_ratings_count=5)

        result = popular_games_service.get_popular_games()

    titles = [g["title"] for g in result["critics"]]
    assert "Mediocre Game" not in titles


def test_critics_ordered_by_metacritic_desc(app, make_game):
    with app.app_context():
        make_game(title="Lower Score", metacritic=CATALOG_MIN_METACRITIC)
        make_game(title="Higher Score", metacritic=99)

        result = popular_games_service.get_popular_games()

    titles = [g["title"] for g in result["critics"]]
    assert titles.index("Higher Score") < titles.index("Lower Score")


def test_critics_list_never_duplicates_a_community_pick(app, make_user, make_game, make_entry):
    with app.app_context():
        game = make_game(title="Both Popular And Acclaimed", metacritic=99)
        _add_players(make_user, make_entry, game, HOME_POPULAR_MIN_DISTINCT_USERS)

        result = popular_games_service.get_popular_games()

    assert any(g["title"] == "Both Popular And Acclaimed" for g in result["community"])
    assert not any(g["title"] == "Both Popular And Acclaimed" for g in result["critics"])


def test_results_are_capped_at_limit(app, make_game):
    with app.app_context():
        for i in range(HOME_POPULAR_RESULT_LIMIT + 5):
            make_game(title=f"Acclaimed {i}", metacritic=CATALOG_MIN_METACRITIC)

        result = popular_games_service.get_popular_games()

    assert len(result["critics"]) == HOME_POPULAR_RESULT_LIMIT
