import json
import random
from datetime import datetime, timezone

from app import extensions
from app.constants import (
    CATALOG_MIN_METACRITIC,
    CATALOG_MIN_RATINGS_COUNT,
    FEEDBACK_DISLIKED,
    FEEDBACK_LIKED,
    LLM_PROVIDER_DEEPSEEK,
    LLM_PROVIDER_KIMI,
    RECOMMENDATION_CACHE_TTL_SECONDS,
    RECOMMENDATION_CANDIDATE_LIMIT,
    RECOMMENDATION_CANDIDATE_POOL_LIMIT,
    RECOMMENDATION_MIN_TASTE_SIGNALS,
    RECOMMENDATION_RECENTLY_SHOWN_WINDOW_SECONDS,
    RECOMMENDATION_REFRESH_COOLDOWN_SECONDS,
    RECOMMENDATION_RESERVE_LIMIT,
    RECOMMENDATION_SOURCE_RETRIEVAL_ONLY,
    RECOMMENDATION_TASTE_RATING_FLOOR,
    RECOMMENDATION_TOPUP_COOLDOWN_SECONDS,
    RECOMMENDATION_TOPUP_LIMIT,
    RECOMMENDATION_TOPUP_MAX_PER_WINDOW,
    RECOMMENDATION_VARIETY_DECAY,
)
from app.models.game import Game
from app.models.game_feedback import GameFeedback
from app.models.user_game_entry import UserGameEntry
from app.services import embeddings, llm_client

CACHE_KEY_PREFIX = "recs"
REFRESH_LOCK_KEY_PREFIX = "recs:refresh_lock"
SEEN_KEY_PREFIX = "recs:seen"
TOPUP_LOCK_KEY_PREFIX = "recs:topup_lock"
TOPUP_COUNT_KEY_PREFIX = "recs:topup_count"

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
    """A user's rated-highly-or-favorited library entries — one of two
    inputs (alongside liked-but-unowned suggestion feedback, see
    _liked_feedback_signals) to the taste-query embedding and the
    "is this user cold-start" check."""
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


def _disliked_game_ids(user_id):
    rows = GameFeedback.query.filter_by(user_id=user_id, sentiment=FEEDBACK_DISLIKED).with_entities(
        GameFeedback.game_id
    )
    return {row.game_id for row in rows}


def _excluded_game_ids(user_id, owned_game_ids):
    """Games that must never appear as a candidate: everything already
    owned, plus everything explicitly thumbs-downed as a suggestion. Unlike
    the variety layer's recently-shown de-prioritization (see
    _select_diverse_candidates), this is a hard exclusion.
    """
    return owned_game_ids | _disliked_game_ids(user_id)


def _liked_feedback_signals(user_id, owned_game_ids):
    """Games the user thumbs-upped as a suggestion but hasn't (yet) added to
    their library — an additional positive taste signal alongside rated/
    favorited library entries. Owned games are excluded here because a
    liked game that's since been added is already represented via
    _taste_signals (through its rating/favorite); without this filter it
    would be counted twice in the composed taste-query text.
    """
    query = GameFeedback.query.join(Game).filter(
        GameFeedback.user_id == user_id, GameFeedback.sentiment == FEEDBACK_LIKED
    )
    if owned_game_ids:
        query = query.filter(GameFeedback.game_id.notin_(owned_game_ids))
    return query.all()


def _build_taste_items(taste_signals, liked_feedback):
    """Normalizes both taste-signal sources (rated/favorited library
    entries, and liked-but-unowned suggestion feedback) into a common
    (game, descriptor) shape for _compose_taste_query_text and the
    cold-start threshold check.
    """
    items = [
        (entry.game, f"rated {entry.rating}/10" if entry.rating is not None else "favorite")
        for entry in taste_signals
    ]
    items += [(feedback.game, "liked recommendation") for feedback in liked_feedback]
    return items


def _compose_taste_query_text(taste_items):
    parts = []
    for game, descriptor in taste_items:
        genres = f" ({', '.join(game.genres)})" if game.genres else ""
        parts.append(f"{game.title}{genres}, {descriptor}")
    return "Loves: " + "; ".join(parts)


def _templated_reason(game):
    score = f"{game.metacritic} Metacritic" if game.metacritic is not None else "well reviewed"
    genres = ", ".join(game.genres[:2]) if game.genres else "your favorite genres"
    return f"Highly rated ({score}) and closely matches your taste in {genres}."


def _templated_top_picks(candidates, limit):
    return [(game, _templated_reason(game)) for game in candidates[:limit]]


def _popularity_fallback(excluded_game_ids, limit):
    query = Game.query.filter(_QUALITY_FLOOR)
    if excluded_game_ids:
        query = query.filter(Game.id.notin_(excluded_game_ids))
    return (
        query.order_by(Game.metacritic.desc().nullslast(), Game.rawg_ratings_count.desc())
        .limit(limit)
        .all()
    )


def _retrieve_candidates(query_vector, excluded_game_ids, limit):
    query = Game.query.filter(_QUALITY_FLOOR, Game.embedding.isnot(None))
    if excluded_game_ids:
        query = query.filter(Game.id.notin_(excluded_game_ids))
    return query.order_by(Game.embedding.cosine_distance(query_vector)).limit(limit).all()


def _weighted_sample_without_replacement(items, weights, k):
    items, weights = list(items), list(weights)
    chosen = []
    for _ in range(k):
        total = sum(weights)
        pick = random.uniform(0, total)
        upto = 0
        for i, weight in enumerate(weights):
            upto += weight
            if upto >= pick:
                chosen.append(items.pop(i))
                weights.pop(i)
                break
    return chosen


def _select_diverse_candidates(pool, recently_shown_game_ids, limit):
    """Narrows a wider nearest-neighbor pool down to `limit` candidates.
    Fresh (not recently-shown) games are preferred and picked via a
    position-weighted random sample (closer matches more likely, not
    guaranteed) so repeat refreshes vary; recently-shown games only pad the
    result if the fresh pool alone can't fill `limit` (small catalog / niche
    taste), since a soft de-prioritization is safer than a hard exclusion
    that could starve a thin candidate pool.
    """
    fresh = [game for game in pool if game.id not in recently_shown_game_ids]
    stale = [game for game in pool if game.id in recently_shown_game_ids]

    weights = [RECOMMENDATION_VARIETY_DECAY**i for i in range(len(fresh))]
    selected = _weighted_sample_without_replacement(fresh, weights, min(limit, len(fresh)))
    if len(selected) < limit:
        selected += stale[: limit - len(selected)]
    return selected


def _seen_key(user_id):
    return f"{SEEN_KEY_PREFIX}:{user_id}"


def _recently_shown_game_ids(user_id, redis_client):
    """Games shown to this user within RECOMMENDATION_RECENTLY_SHOWN_WINDOW_SECONDS,
    read from the recs:seen:{user_id} ZSET (member=game_id, score=unix
    timestamp shown). Lazily prunes stale members on every read rather than
    relying on a background job.
    """
    key = _seen_key(user_id)
    cutoff = datetime.now(timezone.utc).timestamp() - RECOMMENDATION_RECENTLY_SHOWN_WINDOW_SECONDS
    redis_client.zremrangebyscore(key, "-inf", cutoff)
    return {int(member) for member in redis_client.zrange(key, 0, -1)}


def _mark_games_shown(user_id, game_ids, redis_client):
    """Records that these games were just surfaced to the user, so future
    candidate pools deprioritize them. Only called with the games actually
    returned to the client — not the wider retrieval pool that was merely
    considered.
    """
    if not game_ids:
        return
    key = _seen_key(user_id)
    now = datetime.now(timezone.utc).timestamp()
    redis_client.zadd(key, {str(game_id): now for game_id in game_ids})
    redis_client.expire(key, RECOMMENDATION_RECENTLY_SHOWN_WINDOW_SECONDS)


def _prepare(user_id, redis_client=None):
    """Shared setup for the retrieval-only and full pipelines: builds the
    taste profile and retrieves a diversified candidate pool. Returns
    (taste_items, candidates), or (None, None) to signal cold start.
    """
    redis_client = _resolve_redis(redis_client)
    owned_game_ids = _owned_game_ids(user_id)
    excluded_game_ids = _excluded_game_ids(user_id, owned_game_ids)
    recently_shown_game_ids = _recently_shown_game_ids(user_id, redis_client)

    taste_signals = _taste_signals(user_id)
    liked_feedback = _liked_feedback_signals(user_id, owned_game_ids)
    taste_items = _build_taste_items(taste_signals, liked_feedback)

    if len(taste_items) < RECOMMENDATION_MIN_TASTE_SIGNALS:
        return None, None

    query_text = _compose_taste_query_text(taste_items)
    query_vector = embeddings.embed_text(query_text)

    pool = _retrieve_candidates(query_vector, excluded_game_ids, RECOMMENDATION_CANDIDATE_POOL_LIMIT)
    if not pool:
        pool = _popularity_fallback(excluded_game_ids, RECOMMENDATION_CANDIDATE_POOL_LIMIT)

    candidates = _select_diverse_candidates(
        pool, recently_shown_game_ids, RECOMMENDATION_CANDIDATE_LIMIT
    )
    return taste_items, candidates


def _build_user_prompt(taste_items, candidates, limit):
    taste_summary = _compose_taste_query_text(taste_items)
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
        f"Pick the {limit} best matches for this player."
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


def _generate_with_llm(taste_items, candidates, limit):
    """Walks the provider chain (DeepSeek -> Kimi), returning
    (provider_name, games_with_reasons) from the first provider that
    produces at least one valid pick, or (None, None) if every provider is
    unconfigured, over budget, or failed — signaling the caller to fall
    back to a pure retrieval ranking.
    """
    user_prompt = _build_user_prompt(taste_items, candidates, limit)

    for provider in (LLM_PROVIDER_DEEPSEEK, LLM_PROVIDER_KIMI):
        parsed = llm_client.try_chat_completion_json(provider, _SYSTEM_PROMPT, user_prompt)
        if parsed is None:
            continue
        games_with_reasons = _parse_llm_recommendations(parsed, candidates)
        if not games_with_reasons:
            continue
        games_with_reasons = _backfill(games_with_reasons, candidates, limit)
        return provider, games_with_reasons

    return None, None


def _resolve_redis(redis_client):
    return redis_client if redis_client is not None else extensions.redis_client


def _cache_key(user_id):
    return f"{CACHE_KEY_PREFIX}:{user_id}"


def _refresh_lock_key(user_id):
    return f"{REFRESH_LOCK_KEY_PREFIX}:{user_id}"


def _topup_lock_key(user_id):
    return f"{TOPUP_LOCK_KEY_PREFIX}:{user_id}"


def _topup_count_key(user_id):
    return f"{TOPUP_COUNT_KEY_PREFIX}:{user_id}"


def invalidate_cache(user_id, redis_client=None):
    """Called whenever a taste-profile input changes — a rating, a favorite
    toggle, a suggestion like/dislike, or a library entry being added/
    removed — so the next request recomputes instead of serving a stale
    cached set. See the call sites in app/routes/entries.py and
    app/routes/recommendations.py.
    """
    _resolve_redis(redis_client).delete(_cache_key(user_id))


def is_refresh_on_cooldown(user_id, redis_client=None):
    return bool(_resolve_redis(redis_client).exists(_refresh_lock_key(user_id)))


def get_refresh_cooldown_seconds_remaining(user_id, redis_client=None):
    """Seconds until the refresh cooldown lifts, or 0 if it isn't active.
    Used to give the 429 response an actual wait time instead of a vague
    "try again later" — Redis TTL returns -2 for a missing key, which we
    normalize to 0 rather than a nonsensical negative wait.
    """
    ttl = _resolve_redis(redis_client).ttl(_refresh_lock_key(user_id))
    return max(ttl, 0)


def start_refresh_cooldown(user_id, redis_client=None):
    _resolve_redis(redis_client).setex(
        _refresh_lock_key(user_id), RECOMMENDATION_REFRESH_COOLDOWN_SECONDS, "1"
    )


def is_topup_on_cooldown(user_id, redis_client=None):
    return bool(_resolve_redis(redis_client).exists(_topup_lock_key(user_id)))


def get_topup_cooldown_seconds_remaining(user_id, redis_client=None):
    ttl = _resolve_redis(redis_client).ttl(_topup_lock_key(user_id))
    return max(ttl, 0)


def start_topup_cooldown(user_id, redis_client=None):
    _resolve_redis(redis_client).setex(
        _topup_lock_key(user_id), RECOMMENDATION_TOPUP_COOLDOWN_SECONDS, "1"
    )


def try_reserve_topup_slot(user_id, redis_client=None):
    """Returns True and increments the per-cache-window topup counter if
    under RECOMMENDATION_TOPUP_MAX_PER_WINDOW, else False without further
    effect. The counter shares the recommendation cache's TTL so it
    naturally resets whenever the base batch is recomputed (manual refresh
    or natural cache expiry) rather than needing its own cleanup.
    """
    redis_client = _resolve_redis(redis_client)
    key = _topup_count_key(user_id)
    count = redis_client.incr(key)
    if count == 1:
        redis_client.expire(key, RECOMMENDATION_CACHE_TTL_SECONDS)
    if count > RECOMMENDATION_TOPUP_MAX_PER_WINDOW:
        redis_client.decr(key)
        return False
    return True


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


def _compute_recommendations(user_id, redis_client=None):
    """The full RAG pipeline — taste profile -> retrieval -> LLM ranking,
    falling back to a pure retrieval ranking if every LLM provider is
    unavailable. Uncached; get_recommendations wraps this with Redis
    caching. Requests a full RECOMMENDATION_RESERVE_LIMIT batch so the
    client can hold a reserve beyond the visible RECOMMENDATION_RESULT_LIMIT
    and swap in replacements without a new LLM round-trip.
    """
    redis_client = _resolve_redis(redis_client)
    taste_items, candidates = _prepare(user_id, redis_client)
    if taste_items is None:
        return _serialize(
            RECOMMENDATION_SOURCE_RETRIEVAL_ONLY, cold_start=True, games_with_reasons=[]
        )

    provider, games_with_reasons = _generate_with_llm(
        taste_items, candidates, RECOMMENDATION_RESERVE_LIMIT
    )
    if provider is None:
        provider = RECOMMENDATION_SOURCE_RETRIEVAL_ONLY
        games_with_reasons = _templated_top_picks(candidates, RECOMMENDATION_RESERVE_LIMIT)

    _mark_games_shown(user_id, [game.id for game, _ in games_with_reasons], redis_client)
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

    result = _compute_recommendations(user_id, redis_client)
    redis_client.setex(_cache_key(user_id), RECOMMENDATION_CACHE_TTL_SECONDS, json.dumps(result))
    return result


def get_retrieval_only_recommendations(user_id, redis_client=None):
    """The RAG pipeline's retrieval stage, standalone: taste profile ->
    embed -> pgvector similarity search -> templated reasons. No LLM call.
    A legitimate result on its own, and reused as the LLM-unavailable
    fallback inside get_recommendations.
    """
    redis_client = _resolve_redis(redis_client)
    taste_items, candidates = _prepare(user_id, redis_client)
    if taste_items is None:
        return _serialize(
            RECOMMENDATION_SOURCE_RETRIEVAL_ONLY, cold_start=True, games_with_reasons=[]
        )

    games_with_reasons = _templated_top_picks(candidates, RECOMMENDATION_RESERVE_LIMIT)
    _mark_games_shown(user_id, [game.id for game, _ in games_with_reasons], redis_client)
    return _serialize(
        RECOMMENDATION_SOURCE_RETRIEVAL_ONLY,
        cold_start=False,
        games_with_reasons=games_with_reasons,
    )


def get_topup_recommendations(user_id, exclude_game_ids=None, redis_client=None):
    """Computes a small additional batch to extend a client's local reserve
    once it runs out. Reuses the same taste/candidate pipeline as a full
    refresh (inheriting all exclusion/signal/variety logic) but deliberately
    does NOT touch the recs:{user_id} cache — the client merges this batch
    into its own local state; it doesn't replace the server's cached
    "source of truth" batch, so a plain page reload still serves the
    original cached set until it naturally expires or is force-refreshed.
    """
    redis_client = _resolve_redis(redis_client)
    taste_items, candidates = _prepare(user_id, redis_client)
    if taste_items is None:
        return _serialize(
            RECOMMENDATION_SOURCE_RETRIEVAL_ONLY, cold_start=True, games_with_reasons=[]
        )

    if exclude_game_ids:
        exclude_set = set(exclude_game_ids)
        candidates = [game for game in candidates if game.id not in exclude_set]

    provider, games_with_reasons = _generate_with_llm(
        taste_items, candidates, RECOMMENDATION_TOPUP_LIMIT
    )
    if provider is None:
        provider = RECOMMENDATION_SOURCE_RETRIEVAL_ONLY
        games_with_reasons = _templated_top_picks(candidates, RECOMMENDATION_TOPUP_LIMIT)

    _mark_games_shown(user_id, [game.id for game, _ in games_with_reasons], redis_client)
    return _serialize(provider, cold_start=False, games_with_reasons=games_with_reasons)
