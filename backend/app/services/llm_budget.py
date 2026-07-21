from datetime import datetime, timezone

from app import extensions
from app.constants import LLM_PRICING_USD_PER_MILLION_TOKENS

USAGE_KEY_PREFIX = "llm_usage"
# Counters self-expire rather than needing a cron to reset them monthly — a
# little over a month of TTL so a slow-moving month never gets truncated.
USAGE_TTL_SECONDS = 35 * 24 * 60 * 60


def _current_month():
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _usage_key(provider, token_type, month=None):
    return f"{USAGE_KEY_PREFIX}:{provider}:{month or _current_month()}:{token_type}_tokens"


def _reservation_key(provider, month=None):
    return f"{USAGE_KEY_PREFIX}:{provider}:{month or _current_month()}:reserved_usd"


def _resolve_redis(redis_client):
    # Explicit param (not a module-level `from app.extensions import
    # redis_client`) so unit tests can inject a lightweight fake instead of
    # needing the real Postgres+Redis testcontainer stack. Falls through to
    # the app's real client, read fresh off the module at call time.
    return redis_client if redis_client is not None else extensions.redis_client


def get_usage_tokens(provider, redis_client=None):
    redis_client = _resolve_redis(redis_client)
    prompt_tokens = int(redis_client.get(_usage_key(provider, "prompt")) or 0)
    completion_tokens = int(redis_client.get(_usage_key(provider, "completion")) or 0)
    return prompt_tokens, completion_tokens


def estimate_cost_usd(provider, prompt_tokens, completion_tokens):
    pricing = LLM_PRICING_USD_PER_MILLION_TOKENS[provider]
    return (prompt_tokens * pricing["input"] + completion_tokens * pricing["output"]) / 1_000_000


def is_within_budget(provider, budget_usd, redis_client=None):
    prompt_tokens, completion_tokens = get_usage_tokens(provider, redis_client=redis_client)
    spent_so_far = estimate_cost_usd(provider, prompt_tokens, completion_tokens)
    return spent_so_far < budget_usd


def record_usage(provider, prompt_tokens, completion_tokens, redis_client=None):
    redis_client = _resolve_redis(redis_client)
    for token_type, count in (("prompt", prompt_tokens), ("completion", completion_tokens)):
        if not count:
            continue
        key = _usage_key(provider, token_type)
        redis_client.incrby(key, count)
        redis_client.expire(key, USAGE_TTL_SECONDS)


def try_reserve_budget(provider, budget_usd, estimated_cost_usd, redis_client=None):
    """Atomically reserves `estimated_cost_usd` against the monthly budget
    before the (slow) LLM call is made, closing the TOCTOU window between
    checking `is_within_budget` and `record_usage` running only after the
    call returns — without this, two concurrent requests could each observe
    "under budget" before either's real usage is recorded.

    Returns True if the reservation held (caller must release it via
    release_reservation once the call finishes, success or failure); False
    if honoring it would exceed the budget, in which case nothing is held.
    """
    redis_client = _resolve_redis(redis_client)
    key = _reservation_key(provider)
    # INCRBYFLOAT is atomic in Redis, so concurrent callers serialize here
    # rather than each reading a stale total before either commits.
    reserved_total = float(redis_client.incrbyfloat(key, estimated_cost_usd))
    redis_client.expire(key, USAGE_TTL_SECONDS)

    prompt_tokens, completion_tokens = get_usage_tokens(provider, redis_client=redis_client)
    already_spent = estimate_cost_usd(provider, prompt_tokens, completion_tokens)

    if already_spent + reserved_total > budget_usd:
        redis_client.incrbyfloat(key, -estimated_cost_usd)
        return False
    return True


def release_reservation(provider, estimated_cost_usd, redis_client=None):
    redis_client = _resolve_redis(redis_client)
    redis_client.incrbyfloat(_reservation_key(provider), -estimated_cost_usd)
