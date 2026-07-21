import pytest

from app.constants import (
    CATALOG_MIN_METACRITIC,
    EMBEDDING_DIMENSIONS,
    RECOMMENDATION_MIN_TASTE_SIGNALS,
    RECOMMENDATION_RESULT_LIMIT,
)

pytestmark = pytest.mark.integration


def _vector(first_dim_value):
    vector = [0.0] * EMBEDDING_DIMENSIONS
    vector[0] = first_dim_value
    vector[1] = 1.0 - first_dim_value
    return vector


def _add_taste_signals(make_game, make_entry, user, count=RECOMMENDATION_MIN_TASTE_SIGNALS):
    for i in range(count):
        game = make_game(title=f"Owned Favorite {i}", genres=["RPG"])
        make_entry(user, game, rating=9, favorite=True)


@pytest.fixture(autouse=True)
def _fake_query_embedding(monkeypatch):
    from app.services import recommendation_service

    monkeypatch.setattr(recommendation_service.embeddings, "embed_text", lambda text: _vector(1.0))


def test_cold_start_with_no_library_entries(app, make_user):
    from app.services import recommendation_service

    with app.app_context():
        result = recommendation_service.get_retrieval_only_recommendations(make_user().id)

    assert result["cold_start"] is True
    assert result["recommendations"] == []


def test_cold_start_below_minimum_taste_signals(app, make_user, make_game, make_entry):
    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user, count=RECOMMENDATION_MIN_TASTE_SIGNALS - 1)
        from app.services import recommendation_service

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    assert result["cold_start"] is True


def test_excludes_already_owned_games(app, make_user, make_game, make_entry):
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        owned_perfect_match = make_game(
            title="Owned Perfect Match",
            metacritic=CATALOG_MIN_METACRITIC,
            embedding=_vector(1.0),
        )
        make_entry(user, owned_perfect_match, rating=10)
        make_game(
            title="Unowned Candidate",
            metacritic=CATALOG_MIN_METACRITIC,
            embedding=_vector(0.9),
        )

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    titles = [r["game"]["title"] for r in result["recommendations"]]
    assert "Owned Perfect Match" not in titles
    assert "Unowned Candidate" in titles


def test_orders_candidates_by_similarity_closest_first(app, make_user, make_game, make_entry):
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        make_game(title="Close Match", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(0.95))
        make_game(title="Far Match", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(0.1))

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    titles = [r["game"]["title"] for r in result["recommendations"]]
    assert titles.index("Close Match") < titles.index("Far Match")


def test_filters_out_candidates_below_quality_floor(app, make_user, make_game, make_entry):
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        make_game(
            title="Low Quality",
            metacritic=40,
            rawg_ratings_count=10,
            embedding=_vector(1.0),
        )

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    titles = [r["game"]["title"] for r in result["recommendations"]]
    assert "Low Quality" not in titles


def test_falls_back_to_popularity_when_no_embedded_candidates(
    app, make_user, make_game, make_entry
):
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        make_game(title="Unembedded But Great", metacritic=95, embedding=None)

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    titles = [r["game"]["title"] for r in result["recommendations"]]
    assert "Unembedded But Great" in titles


def test_results_are_capped_at_result_limit(app, make_user, make_game, make_entry):
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        for i in range(RECOMMENDATION_RESULT_LIMIT + 5):
            make_game(
                title=f"Candidate {i}",
                metacritic=CATALOG_MIN_METACRITIC,
                embedding=_vector(0.5),
            )

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    assert len(result["recommendations"]) == RECOMMENDATION_RESULT_LIMIT


def test_each_recommendation_has_a_reason_and_rank(app, make_user, make_game, make_entry):
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        make_game(title="Reasoned Pick", metacritic=88, genres=["RPG"], embedding=_vector(1.0))

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    rec = next(r for r in result["recommendations"] if r["game"]["title"] == "Reasoned Pick")
    assert "88" in rec["reason"]
    assert rec["rank"] == 1
    assert result["source"] == "retrieval_only"
    assert result["cold_start"] is False
