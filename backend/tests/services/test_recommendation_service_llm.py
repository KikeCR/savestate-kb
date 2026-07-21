import pytest

from app.constants import (
    CATALOG_MIN_METACRITIC,
    EMBEDDING_DIMENSIONS,
    LLM_PROVIDER_DEEPSEEK,
    LLM_PROVIDER_KIMI,
    RECOMMENDATION_MIN_TASTE_SIGNALS,
)
from app.models.game import Game
from app.services import recommendation_service


def _candidate(id, title="Game", **overrides):
    game = Game(title=title, genres=["RPG"], **overrides)
    game.id = id
    return game


# --- Pure-function tests: anti-hallucination filter + backfill. No app/DB
# needed since these operate on plain (transient, unsaved) Game objects. ---


def test_parse_drops_out_of_range_index():
    candidates = [_candidate(1), _candidate(2)]
    parsed = {
        "recommendations": [{"index": 0, "reason": "great fit"}, {"index": 99, "reason": "x"}]
    }

    results = recommendation_service._parse_llm_recommendations(parsed, candidates)

    assert [game.id for game, _ in results] == [1]


def test_parse_dedupes_repeated_indices():
    candidates = [_candidate(1), _candidate(2)]
    parsed = {"recommendations": [{"index": 0, "reason": "a"}, {"index": 0, "reason": "b"}]}

    results = recommendation_service._parse_llm_recommendations(parsed, candidates)

    assert len(results) == 1


def test_parse_uses_llm_reason_when_present():
    candidates = [_candidate(1)]
    parsed = {"recommendations": [{"index": 0, "reason": "Because you loved similar RPGs"}]}

    results = recommendation_service._parse_llm_recommendations(parsed, candidates)

    assert results[0][1] == "Because you loved similar RPGs"


def test_parse_falls_back_to_templated_reason_when_missing():
    candidates = [_candidate(1, metacritic=90)]
    parsed = {"recommendations": [{"index": 0, "reason": ""}]}

    results = recommendation_service._parse_llm_recommendations(parsed, candidates)

    assert "90" in results[0][1]


def test_parse_rejects_non_integer_or_boolean_index():
    candidates = [_candidate(1)]
    parsed = {"recommendations": [{"index": "0", "reason": "a"}, {"index": True, "reason": "b"}]}

    results = recommendation_service._parse_llm_recommendations(parsed, candidates)

    assert results == []


def test_parse_handles_malformed_top_level_shape():
    candidates = [_candidate(1)]

    assert recommendation_service._parse_llm_recommendations(None, candidates) == []
    assert recommendation_service._parse_llm_recommendations({}, candidates) == []
    assert (
        recommendation_service._parse_llm_recommendations({"recommendations": "nope"}, candidates)
        == []
    )


def test_backfill_fills_shortfall_from_untouched_candidates():
    candidates = [_candidate(1), _candidate(2), _candidate(3)]
    games_with_reasons = [(candidates[0], "llm reason")]

    filled = recommendation_service._backfill(games_with_reasons, candidates, limit=3)

    assert [game.id for game, _ in filled] == [1, 2, 3]


def test_backfill_does_not_exceed_limit():
    candidates = [_candidate(i) for i in range(5)]

    filled = recommendation_service._backfill([], candidates, limit=2)

    assert len(filled) == 2


def test_backfill_skips_games_already_used():
    candidates = [_candidate(1), _candidate(2)]
    games_with_reasons = [(candidates[1], "already picked")]

    filled = recommendation_service._backfill(games_with_reasons, candidates, limit=2)

    assert [game.id for game, _ in filled] == [2, 1]


# --- Integration tests: the full get_recommendations provider chain. Mocks
# llm_client.try_chat_completion_json directly (its own HTTP behavior is
# covered by test_llm_client.py) so these focus purely on orchestration:
# which provider wins, and the retrieval-only fallback. ---


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
    monkeypatch.setattr(recommendation_service.embeddings, "embed_text", lambda text: _vector(1.0))


@pytest.mark.integration
def test_get_recommendations_uses_deepseek_when_it_succeeds(
    app, make_user, make_game, make_entry, monkeypatch
):
    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        make_game(title="Deepseek Pick", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(1.0))

        def fake_try(provider, system_prompt, user_prompt, redis_client=None):
            if provider == LLM_PROVIDER_DEEPSEEK:
                return {"recommendations": [{"index": 0, "reason": "DeepSeek says so"}]}
            raise AssertionError("Kimi should not be called when DeepSeek succeeds")

        monkeypatch.setattr(recommendation_service.llm_client, "try_chat_completion_json", fake_try)

        result = recommendation_service.get_recommendations(user.id)

    assert result["source"] == LLM_PROVIDER_DEEPSEEK
    assert result["recommendations"][0]["reason"] == "DeepSeek says so"


@pytest.mark.integration
def test_get_recommendations_falls_back_to_kimi_when_deepseek_unavailable(
    app, make_user, make_game, make_entry, monkeypatch
):
    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        make_game(title="Kimi Pick", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(1.0))

        def fake_try(provider, system_prompt, user_prompt, redis_client=None):
            if provider == LLM_PROVIDER_DEEPSEEK:
                return None
            return {"recommendations": [{"index": 0, "reason": "Kimi says so"}]}

        monkeypatch.setattr(recommendation_service.llm_client, "try_chat_completion_json", fake_try)

        result = recommendation_service.get_recommendations(user.id)

    assert result["source"] == LLM_PROVIDER_KIMI
    assert result["recommendations"][0]["reason"] == "Kimi says so"


@pytest.mark.integration
def test_get_recommendations_falls_back_to_retrieval_only_when_both_providers_fail(
    app, make_user, make_game, make_entry, monkeypatch
):
    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        make_game(title="Fallback Pick", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(1.0))

        monkeypatch.setattr(
            recommendation_service.llm_client,
            "try_chat_completion_json",
            lambda *a, **k: None,
        )

        result = recommendation_service.get_recommendations(user.id)

    assert result["source"] == "retrieval_only"
    assert result["cold_start"] is False
    assert any(r["game"]["title"] == "Fallback Pick" for r in result["recommendations"])


@pytest.mark.integration
def test_get_recommendations_backfills_when_llm_returns_partial_hallucinated_picks(
    app, make_user, make_game, make_entry, monkeypatch
):
    user = make_user()
    with app.app_context():
        _add_taste_signals(make_game, make_entry, user)
        make_game(title="Valid Pick", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(1.0))
        make_game(
            title="Backfill Candidate", metacritic=CATALOG_MIN_METACRITIC, embedding=_vector(0.9)
        )

        def fake_try(provider, system_prompt, user_prompt, redis_client=None):
            # index 0 is valid; index 99 is out of range (simulated
            # hallucination) and must be dropped, then backfilled.
            return {
                "recommendations": [
                    {"index": 0, "reason": "Valid"},
                    {"index": 99, "reason": "Hallucinated"},
                ]
            }

        monkeypatch.setattr(recommendation_service.llm_client, "try_chat_completion_json", fake_try)

        result = recommendation_service.get_recommendations(user.id)

    titles = [r["game"]["title"] for r in result["recommendations"]]
    assert "Valid Pick" in titles
    assert "Backfill Candidate" in titles
    assert len(titles) == 2


@pytest.mark.integration
def test_get_recommendations_cold_start_never_calls_llm(app, make_user, monkeypatch):
    user = make_user()
    with app.app_context():

        def fail_if_called(*args, **kwargs):
            raise AssertionError("LLM should never be called for a cold-start user")

        monkeypatch.setattr(
            recommendation_service.llm_client, "try_chat_completion_json", fail_if_called
        )

        result = recommendation_service.get_recommendations(user.id)

    assert result["cold_start"] is True
