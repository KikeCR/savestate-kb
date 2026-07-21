import json

import pytest

from app.constants import EMBEDDING_DIMENSIONS, RECOMMENDATION_MIN_TASTE_SIGNALS
from app.services import recommendation_service

pytestmark = pytest.mark.integration


def _vector(first_dim_value):
    vector = [0.0] * EMBEDDING_DIMENSIONS
    vector[0] = first_dim_value
    return vector


@pytest.fixture(autouse=True)
def _fake_query_embedding(monkeypatch):
    monkeypatch.setattr(recommendation_service.embeddings, "embed_text", lambda text: _vector(1.0))


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    monkeypatch.setattr(
        recommendation_service.llm_client, "try_chat_completion_json", lambda *a, **k: None
    )


def _add_taste_signals(make_game, make_entry, user, count=RECOMMENDATION_MIN_TASTE_SIGNALS):
    for i in range(count):
        game = make_game(title=f"Owned Favorite {i}", genres=["RPG"])
        make_entry(user, game, rating=9, favorite=True)


def test_second_call_is_served_from_cache(app, make_user, make_game, make_entry, monkeypatch):
    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        make_game(title="Cached Pick", metacritic=80, embedding=_vector(1.0))

        call_count = {"n": 0}
        real_compute = recommendation_service._compute_recommendations

        def counting_compute(user_id):
            call_count["n"] += 1
            return real_compute(user_id)

        monkeypatch.setattr(recommendation_service, "_compute_recommendations", counting_compute)

        first = recommendation_service.get_recommendations(user.id)
        second = recommendation_service.get_recommendations(user.id)

    assert first == second
    assert call_count["n"] == 1


def test_force_refresh_recomputes_even_when_cached(
    app, make_user, make_game, make_entry, monkeypatch
):
    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        make_game(title="Cached Pick", metacritic=80, embedding=_vector(1.0))

        call_count = {"n": 0}
        real_compute = recommendation_service._compute_recommendations

        def counting_compute(user_id):
            call_count["n"] += 1
            return real_compute(user_id)

        monkeypatch.setattr(recommendation_service, "_compute_recommendations", counting_compute)

        recommendation_service.get_recommendations(user.id)
        recommendation_service.get_recommendations(user.id, force_refresh=True)

    assert call_count["n"] == 2


def test_invalidate_cache_clears_stored_response(app, make_user):
    user = make_user()
    with app.app_context():
        from app.extensions import redis_client

        redis_client.set(recommendation_service._cache_key(user.id), json.dumps({"stale": True}))

        recommendation_service.invalidate_cache(user.id)

        assert redis_client.get(recommendation_service._cache_key(user.id)) is None


def test_is_refresh_on_cooldown_reflects_lock_state(app, make_user):
    user = make_user()
    with app.app_context():
        assert recommendation_service.is_refresh_on_cooldown(user.id) is False

        recommendation_service.start_refresh_cooldown(user.id)

        assert recommendation_service.is_refresh_on_cooldown(user.id) is True


def test_get_refresh_cooldown_seconds_remaining_is_zero_when_not_on_cooldown(app, make_user):
    user = make_user()
    with app.app_context():
        assert recommendation_service.get_refresh_cooldown_seconds_remaining(user.id) == 0


def test_get_refresh_cooldown_seconds_remaining_reflects_ttl(app, make_user):
    from app.constants import RECOMMENDATION_REFRESH_COOLDOWN_SECONDS

    user = make_user()
    with app.app_context():
        recommendation_service.start_refresh_cooldown(user.id)

        remaining = recommendation_service.get_refresh_cooldown_seconds_remaining(user.id)

    assert 0 < remaining <= RECOMMENDATION_REFRESH_COOLDOWN_SECONDS
