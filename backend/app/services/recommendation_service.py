import json
from datetime import datetime, timezone

from app import extensions
from app.constants import (
    CATALOG_MIN_METACRITIC,
    CATALOG_MIN_RATINGS_COUNT,
    LLM_PROVIDER_DEEPSEEK,
    LLM_PROVIDER_KIMI,
    RECOMMENDATION_CACHE_TTL_SECONDS,
    RECOMMENDATION_CANDIDATE_LIMIT,
    RECOMMENDATION_MIN_TASTE_SIGNALS,
    RECOMMENDATION_REFRESH_COOLDOWN_SECONDS,
    RECOMMENDATION_RESULT_LIMIT,
    RECOMMENDATION_SOURCE_RETRIEVAL_ONLY,
    RECOMMENDATION_TASTE_RATING_FLOOR,
)
from app.models.game import Game
from app.models.user_game_entry import UserGameEntry
from app.services import embeddings, llm_client

CACHE_KEY_PREFIX = "recs"
REFRESH_LOCK_KEY_PREFIX = "recs:refresh_lock"

_QUALITY_FLOOR = (Game.metacritic >= CATALOG_MIN_METACRITIC) | (
    Game.rawg_ratings_count >= CATALOG_MIN_RATINGS_COUNT
)

_SYSTEM_PROMPT = (
    "You are a game recommendation assistant for a game-tracking app. You "
    "will be given a player's taste profile and a numbered list of "
    "candidate games. Choose the best matches for this player and give a "
    "one-sentence reason for each. Respond with strict JSON only, in "
    'exactly this shape: {"recommendations": [{"index": <int>, "reason": '
    '"<string>"}]}. Only ever use "index" values from the candidate list '
    "provided — never invent a game, and never reference a game by name."
)


def _taste_signals(user_id):
    """A user's rated-highly-or-favorited library entries — the input to
    both the taste-query embedding and the "is this user cold-start"
    check."""
    return (
        UserGameEntry.query.join(Game)
        .filter(
            UserGameEntry.user_id == user_id,
            (UserGameEntry.rating >= RECOMMENDATION_TASTE_RATING_FLOOR)
            | (UserGameEntry.favorite.is_(True)),
        )
        .all()
    )


def _owned_game_ids(user_id):
    rows = UserGameEntry.query.filter_by(user_id=user_id).with_entities(UserGameEntry.game_id)
    return {row.game_id for row in rows}


def _compose_taste_query_text(taste_signals):
    parts = []
    for entry in taste_signals:
        game = entry.game
        descriptor = f"rated {entry.rating}/10" if entry.rating is not None else "favorite"
        genres = f" ({', '.join(game.genres)})" if game.genres else ""
        parts.append(f"{game.title}{genres}, {descriptor}")
    return "Loves: " + "; ".join(parts)


def _templated_reason(game):
    score = f"{game.metacritic} Metacritic" if game.metacritic is not None else "well reviewed"
    genres = ", ".join(game.genres[:2]) if game.genres else "your favorite genres"
    return f"Highly rated ({score}) and closely matches your taste in {genres}."


def _templated_top_picks(candidates, limit=RECOMMENDATION_RESULT_LIMIT):
    return [(game, _templated_reason(game)) for game in candidates[:limit]]


def _popularity_fallback(owned_game_ids, limit):
    query = Game.query.filter(_QUALITY_FLOOR)
    if owned_game_ids:
        query = query.filter(Game.id.notin_(owned_game_ids))
    return (
        query.order_by(Game.metacritic.desc().nullslast(), Game.rawg_ratings_count.desc())
        .limit(limit)
        .all()
    )


def _retrieve_candidates(query_vector, owned_game_ids, limit):
    query = Game.query.filter(_QUALITY_FLOOR, Game.embedding.isnot(None))
    if owned_game_ids:
        query = query.filter(Game.id.notin_(owned_game_ids))
    return query.order_by(Game.embedding.cosine_distance(query_vector)).limit(limit).all()


def _serialize(source, cold_start, games_with_reasons):
    return {
        "source": source,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cold_start": cold_start,
        "recommendations": [
            {"game": game.to_dict(), "reason": reason, "rank": rank}
            for rank, (game, reason) in enumerate(games_with_reasons, start=1)
        ],
    }


def _prepare(user_id):
    """Shared setup for both the retrieval-only and full pipelines: builds
    the taste profile and retrieves the candidate pool. Returns
    (taste_signals, candidates), or (None, None) to signal cold start.
    """
    owned_game_ids = _owned_game_ids(user_id)
    taste_signals = _taste_signals(user_id)

    if len(taste_signals) < RECOMMENDATION_MIN_TASTE_SIGNALS:
        return None, None

    query_text = _compose_taste_query_text(taste_signals)
    query_vector = embeddings.embed_text(query_text)

    candidates = _retrieve_candidates(query_vector, owned_game_ids, RECOMMENDATION_CANDIDATE_LIMIT)
    if not candidates:
        candidates = _popularity_fallback(owned_game_ids, RECOMMENDATION_CANDIDATE_LIMIT)

    return taste_signals, candidates


def _build_user_prompt(taste_signals, candidates):
    taste_summary = _compose_taste_query_text(taste_signals)
    lines = []
    for index, game in enumerate(candidates):
        meta = (
            f"Metacritic {game.metacritic}"
            if game.metacritic is not None
            else "unrated by Metacritic"
        )
        genres = ", ".join(game.genres) if game.genres else "Unknown genre"
        lines.append(f"{index}: {game.title} — {genres}. {meta}.")
    candidates_block = "\n".join(lines)
    return (
        f"Player taste profile:\n{taste_summary}\n\n"
        f"Candidate games (reference only by their leading index number):\n{candidates_block}\n\n"
        f"Pick the {RECOMMENDATION_RESULT_LIMIT} best matches for this player."
    )


def _parse_llm_recommendations(parsed_json, candidates):
    """Anti-hallucination filter: keeps only in-range, non-duplicate
    indices, in the order the model returned them. Any index outside the
    candidate list, or a malformed response shape, is silently dropped
    rather than surfaced as an error — the caller backfills any shortfall
    from the untouched candidate list.
    """
    if not isinstance(parsed_json, dict):
        return []
    raw_items = parsed_json.get("recommendations")
    if not isinstance(raw_items, list):
        return []

    results = []
    seen_indices = set()
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        index = item.get("index")
        if not isinstance(index, int) or isinstance(index, bool):
            continue
        if index in seen_indices or not (0 <= index < len(candidates)):
            continue
        seen_indices.add(index)

        reason = item.get("reason")
        game = candidates[index]
        if not isinstance(reason, str) or not reason.strip():
            reason = _templated_reason(game)
        results.append((game, reason))
    return results


def _backfill(games_with_reasons, candidates, limit):
    used_game_ids = {game.id for game, _ in games_with_reasons}
    for game in candidates:
        if len(games_with_reasons) >= limit:
            break
        if game.id in used_game_ids:
            continue
        games_with_reasons.append((game, _templated_reason(game)))
        used_game_ids.add(game.id)
    return games_with_reasons[:limit]


def _generate_with_llm(taste_signals, candidates):
    """Walks the provider chain (DeepSeek -> Kimi), returning
    (provider_name, games_with_reasons) from the first provider that
    produces at least one valid pick, or (None, None) if every provider is
    unconfigured, over budget, or failed — signaling the caller to fall
    back to a pure retrieval ranking.
    """
    user_prompt = _build_user_prompt(taste_signals, candidates)

    for provider in (LLM_PROVIDER_DEEPSEEK, LLM_PROVIDER_KIMI):
        parsed = llm_client.try_chat_completion_json(provider, _SYSTEM_PROMPT, user_prompt)
        if parsed is None:
            continue
        games_with_reasons = _parse_llm_recommendations(parsed, candidates)
        if not games_with_reasons:
            continue
        games_with_reasons = _backfill(games_with_reasons, candidates, RECOMMENDATION_RESULT_LIMIT)
        return provider, games_with_reasons

    return None, None


def _resolve_redis(redis_client):
    return redis_client if redis_client is not None else extensions.redis_client


def _cache_key(user_id):
    return f"{CACHE_KEY_PREFIX}:{user_id}"


def _refresh_lock_key(user_id):
    return f"{REFRESH_LOCK_KEY_PREFIX}:{user_id}"


def invalidate_cache(user_id, redis_client=None):
    """Called whenever a taste-profile input changes — a rating, a favorite
    toggle, or a library entry being added/removed — so the next request
    recomputes instead of serving a stale cached set. See the call sites in
    app/routes/entries.py.
    """
    _resolve_redis(redis_client).delete(_cache_key(user_id))


def is_refresh_on_cooldown(user_id, redis_client=None):
    return bool(_resolve_redis(redis_client).exists(_refresh_lock_key(user_id)))


def start_refresh_cooldown(user_id, redis_client=None):
    _resolve_redis(redis_client).setex(
        _refresh_lock_key(user_id), RECOMMENDATION_REFRESH_COOLDOWN_SECONDS, "1"
    )


def _compute_recommendations(user_id):
    """The full RAG pipeline — taste profile -> retrieval -> LLM ranking,
    falling back to a pure retrieval ranking if every LLM provider is
    unavailable. Uncached; get_recommendations wraps this with Redis
    caching.
    """
    taste_signals, candidates = _prepare(user_id)
    if taste_signals is None:
        return _serialize(
            RECOMMENDATION_SOURCE_RETRIEVAL_ONLY, cold_start=True, games_with_reasons=[]
        )

    provider, games_with_reasons = _generate_with_llm(taste_signals, candidates)
    if provider is None:
        return _serialize(
            RECOMMENDATION_SOURCE_RETRIEVAL_ONLY,
            cold_start=False,
            games_with_reasons=_templated_top_picks(candidates),
        )

    return _serialize(provider, cold_start=False, games_with_reasons=games_with_reasons)


def get_recommendations(user_id, force_refresh=False, redis_client=None):
    """Public entrypoint used by the /api/recommendations route. Serves a
    cached response (TTL RECOMMENDATION_CACHE_TTL_SECONDS) unless
    force_refresh is set or nothing is cached yet, in which case it recomputes
    the full pipeline and re-caches the result.
    """
    redis_client = _resolve_redis(redis_client)

    if not force_refresh:
        cached = redis_client.get(_cache_key(user_id))
        if cached:
            return json.loads(cached)

    result = _compute_recommendations(user_id)
    redis_client.setex(_cache_key(user_id), RECOMMENDATION_CACHE_TTL_SECONDS, json.dumps(result))
    return result


def get_retrieval_only_recommendations(user_id):
    """The RAG pipeline's retrieval stage, standalone: taste profile ->
    embed -> pgvector similarity search -> templated reasons. No LLM call.
    A legitimate result on its own, and reused as the LLM-unavailable
    fallback inside get_recommendations.
    """
    taste_signals, candidates = _prepare(user_id)
    if taste_signals is None:
        return _serialize(
            RECOMMENDATION_SOURCE_RETRIEVAL_ONLY, cold_start=True, games_with_reasons=[]
        )

    return _serialize(
        RECOMMENDATION_SOURCE_RETRIEVAL_ONLY,
        cold_start=False,
        games_with_reasons=_templated_top_picks(candidates),
    )
