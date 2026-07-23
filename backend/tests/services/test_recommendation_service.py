import pytest

from app.constants import (
    CATALOG_MIN_METACRITIC,
    EMBEDDING_DIMENSIONS,
    RECOMMENDATION_MIN_TASTE_SIGNALS,
    RECOMMENDATION_RECENTLY_SHOWN_WINDOW_SECONDS,
    RECOMMENDATION_RESERVE_LIMIT,
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


def test_orders_candidates_by_similarity_closest_first(
    app, make_user, make_game, make_entry, monkeypatch
):
    from app.services import recommendation_service

    # The variety-sampling step (_select_diverse_candidates) picks among the
    # retrieved pool with weighted randomness, so pinning random.uniform to 0
    # forces it to always take the highest-weighted (closest-match) item
    # first — this test is about similarity ordering, not variety, which
    # gets its own dedicated coverage below.
    monkeypatch.setattr(recommendation_service.random, "uniform", lambda a, b: 0.0)

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


def test_results_are_capped_at_reserve_limit(app, make_user, make_game, make_entry):
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        for i in range(RECOMMENDATION_RESERVE_LIMIT + 5):
            make_game(
                title=f"Candidate {i}",
                metacritic=CATALOG_MIN_METACRITIC,
                embedding=_vector(0.5),
            )

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    assert len(result["recommendations"]) == RECOMMENDATION_RESERVE_LIMIT


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


# --- Feedback (thumbs up/down) ---


def test_excludes_disliked_games_even_if_embedding_matches(
    app, make_user, make_game, make_entry, make_game_feedback
):
    from app.constants import FEEDBACK_DISLIKED
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        disliked = make_game(
            title="Disliked Perfect Match",
            metacritic=CATALOG_MIN_METACRITIC,
            embedding=_vector(1.0),
        )
        make_game_feedback(user, disliked, sentiment=FEEDBACK_DISLIKED)
        make_game(
            title="Unowned Candidate",
            metacritic=CATALOG_MIN_METACRITIC,
            embedding=_vector(0.9),
        )

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    titles = [r["game"]["title"] for r in result["recommendations"]]
    assert "Disliked Perfect Match" not in titles
    assert "Unowned Candidate" in titles


def test_liked_unowned_game_counts_toward_taste_signal_threshold(
    app, make_user, make_game, make_game_feedback
):
    from app.constants import FEEDBACK_LIKED, RECOMMENDATION_MIN_TASTE_SIGNALS
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        # Zero rated/favorited library entries, but enough liked-suggestion
        # feedback rows to clear the cold-start threshold on its own.
        for i in range(RECOMMENDATION_MIN_TASTE_SIGNALS):
            liked_game = make_game(title=f"Liked Suggestion {i}", genres=["RPG"])
            make_game_feedback(user, liked_game, sentiment=FEEDBACK_LIKED)

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    assert result["cold_start"] is False


def test_liked_unowned_game_excluded_from_signals_once_owned(
    app, make_user, make_game, make_entry, make_game_feedback
):
    from app.constants import FEEDBACK_LIKED
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        liked_game = make_game(title="Liked Then Owned", genres=["RPG"])
        make_game_feedback(user, liked_game, sentiment=FEEDBACK_LIKED)
        make_entry(user, liked_game, rating=9)

        owned_game_ids = recommendation_service._owned_game_ids(user.id)
        liked_signals = recommendation_service._liked_feedback_signals(user.id, owned_game_ids)

    # Once owned, the game is represented via _taste_signals (through its
    # rating) — _liked_feedback_signals must not also surface it, or it
    # would be double-counted in the composed taste-query text.
    assert liked_signals == []


# --- Variety (recently-shown de-prioritization) ---


def test_recently_shown_games_are_deprioritized_when_enough_fresh_alternatives_exist(
    app, make_user, make_game, make_entry
):
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        shown_before = make_game(
            title="Shown Before", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(1.0)
        )
        # Enough fresh alternatives to fully satisfy the final output quota
        # (RECOMMENDATION_RESERVE_LIMIT) on their own, so the recently-shown
        # game — merely soft-deprioritized, appended only as padding after
        # every fresh candidate — never makes the final slice.
        for i in range(RECOMMENDATION_RESERVE_LIMIT):
            make_game(
                title=f"Fresh Alternative {i}",
                metacritic=CATALOG_MIN_METACRITIC,
                embedding=_vector(0.9),
            )
        recommendation_service._mark_games_shown(
            user.id, [shown_before.id], recommendation_service.extensions.redis_client
        )

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    titles = [r["game"]["title"] for r in result["recommendations"]]
    assert "Shown Before" not in titles
    assert len(titles) == RECOMMENDATION_RESERVE_LIMIT


def test_recently_shown_games_still_appear_when_no_fresh_alternative_exists(
    app, make_user, make_game, make_entry
):
    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        only_candidate = make_game(
            title="Only Candidate", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(1.0)
        )
        recommendation_service._mark_games_shown(
            user.id, [only_candidate.id], recommendation_service.extensions.redis_client
        )

        result = recommendation_service.get_retrieval_only_recommendations(user.id)

    # A thin candidate pool must not be starved by the soft de-prioritization
    # — it's a preference, not a hard exclusion like dislikes/ownership.
    titles = [r["game"]["title"] for r in result["recommendations"]]
    assert "Only Candidate" in titles


# --- Preferred platforms threaded through _prepare ---


def test_prepare_returns_users_preferred_platforms(app, make_user, make_game, make_entry):
    from app.services import recommendation_service

    user = make_user(preferred_platforms=["PC", "Nintendo Switch"])
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)

        _taste_items, _candidates, preferred_platforms = recommendation_service._prepare(user.id)

    assert preferred_platforms == ["PC", "Nintendo Switch"]


def test_prepare_returns_none_platforms_for_cold_start(app, make_user):
    from app.services import recommendation_service

    user = make_user(preferred_platforms=["PC"])
    with app.app_context():
        taste_items, candidates, preferred_platforms = recommendation_service._prepare(user.id)

    assert taste_items is None
    assert candidates is None
    assert preferred_platforms is None


# --- Retrieval-stage platform tiering (_retrieve_candidates, _popularity_fallback) ---


def test_retrieve_candidates_surfaces_platform_matches_ahead_of_closer_non_matches(app, make_game):
    from app.services import recommendation_service

    with app.app_context():
        # "Close Non-Match" is a near-perfect embedding match but on a
        # platform the user doesn't own; "Far Match" is a weaker embedding
        # match but on a platform they do — tiering must still put the
        # platform match first, ahead of a closer non-match.
        make_game(
            title="Close Non-Match",
            metacritic=CATALOG_MIN_METACRITIC,
            platforms=["Xbox One"],
            embedding=_vector(1.0),
        )
        make_game(
            title="Far Match",
            metacritic=CATALOG_MIN_METACRITIC,
            platforms=["Nintendo Switch"],
            embedding=_vector(0.1),
        )

        results = recommendation_service._retrieve_candidates(
            _vector(1.0), excluded_game_ids=set(), limit=10, preferred_platforms=["Nintendo Switch"]
        )

    titles = [g.title for g in results]
    assert titles.index("Far Match") < titles.index("Close Non-Match")


def test_retrieve_candidates_orders_purely_by_distance_when_no_platform_preference(app, make_game):
    from app.services import recommendation_service

    with app.app_context():
        make_game(title="Closest", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(1.0))
        make_game(title="Farthest", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(0.1))

        results = recommendation_service._retrieve_candidates(
            _vector(1.0), excluded_game_ids=set(), limit=10
        )

    titles = [g.title for g in results]
    assert titles == ["Closest", "Farthest"]


def test_popularity_fallback_surfaces_platform_matches_ahead_of_higher_metacritic(app, make_game):
    from app.services import recommendation_service

    with app.app_context():
        make_game(title="Higher Score Non-Match", metacritic=95, platforms=["Xbox One"])
        make_game(title="Lower Score Match", metacritic=80, platforms=["Nintendo Switch"])

        results = recommendation_service._popularity_fallback(
            excluded_game_ids=set(), limit=10, preferred_platforms=["Nintendo Switch"]
        )

    titles = [g.title for g in results]
    assert titles.index("Lower Score Match") < titles.index("Higher Score Non-Match")


def test_recently_shown_window_expires(app, make_user, make_game, make_entry, monkeypatch):
    from datetime import datetime, timedelta, timezone

    from app.services import recommendation_service

    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        game = make_game(
            title="Old Shown Game", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(1.0)
        )
        redis_client = recommendation_service.extensions.redis_client
        stale_timestamp = (
            datetime.now(timezone.utc)
            - timedelta(seconds=RECOMMENDATION_RECENTLY_SHOWN_WINDOW_SECONDS + 60)
        ).timestamp()
        redis_client.zadd(
            recommendation_service._seen_key(user.id), {str(game.id): stale_timestamp}
        )

        recently_shown = recommendation_service._recently_shown_game_ids(user.id, redis_client)

    assert recently_shown == set()
