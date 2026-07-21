import time

from app.constants import LLM_PROVIDER_DEEPSEEK, LLM_PROVIDER_KIMI
from app.services import llm_budget


class _FakeRedis:
    """Minimal dict-backed stand-in for redis-py, covering only the get/
    incrby/expire calls llm_budget makes. Lets these tests exercise the
    budget arithmetic without needing the real Postgres+Redis testcontainer
    stack — this module's logic is pure counters and math."""

    def __init__(self):
        self.values = {}
        self.expiries = {}

    def get(self, key):
        # Mirrors the real client, which is constructed with
        # decode_responses=True (see app/extensions.py) and so returns str.
        value = self.values.get(key)
        return str(value) if value is not None else None

    def incrby(self, key, amount):
        self.values[key] = self.values.get(key, 0) + amount
        return self.values[key]

    def incrbyfloat(self, key, amount):
        self.values[key] = float(self.values.get(key, 0)) + amount
        return self.values[key]

    def expire(self, key, ttl):
        self.expiries[key] = ttl


def test_get_usage_tokens_defaults_to_zero_when_unset():
    redis_client = _FakeRedis()

    prompt, completion = llm_budget.get_usage_tokens(
        LLM_PROVIDER_DEEPSEEK, redis_client=redis_client
    )

    assert (prompt, completion) == (0, 0)


def test_record_usage_accumulates_across_calls():
    redis_client = _FakeRedis()

    llm_budget.record_usage(LLM_PROVIDER_DEEPSEEK, 100, 50, redis_client=redis_client)
    llm_budget.record_usage(LLM_PROVIDER_DEEPSEEK, 200, 25, redis_client=redis_client)

    prompt, completion = llm_budget.get_usage_tokens(
        LLM_PROVIDER_DEEPSEEK, redis_client=redis_client
    )
    assert (prompt, completion) == (300, 75)


def test_record_usage_sets_a_self_expiring_ttl():
    redis_client = _FakeRedis()

    llm_budget.record_usage(LLM_PROVIDER_DEEPSEEK, 100, 50, redis_client=redis_client)

    for key in redis_client.expiries:
        assert redis_client.expiries[key] == llm_budget.USAGE_TTL_SECONDS


def test_record_usage_keeps_providers_independent():
    redis_client = _FakeRedis()

    llm_budget.record_usage(LLM_PROVIDER_DEEPSEEK, 1000, 1000, redis_client=redis_client)
    llm_budget.record_usage(LLM_PROVIDER_KIMI, 5, 5, redis_client=redis_client)

    deepseek_prompt, _ = llm_budget.get_usage_tokens(
        LLM_PROVIDER_DEEPSEEK, redis_client=redis_client
    )
    kimi_prompt, _ = llm_budget.get_usage_tokens(LLM_PROVIDER_KIMI, redis_client=redis_client)
    assert deepseek_prompt == 1000
    assert kimi_prompt == 5


def test_estimate_cost_uses_per_provider_pricing():
    deepseek_cost = llm_budget.estimate_cost_usd(LLM_PROVIDER_DEEPSEEK, 1_000_000, 1_000_000)
    kimi_cost = llm_budget.estimate_cost_usd(LLM_PROVIDER_KIMI, 1_000_000, 1_000_000)

    # Kimi's per-token pricing is substantially higher than DeepSeek's,
    # which is exactly why DeepSeek is the primary provider.
    assert kimi_cost > deepseek_cost


def test_is_within_budget_true_when_under_ceiling():
    redis_client = _FakeRedis()
    llm_budget.record_usage(LLM_PROVIDER_DEEPSEEK, 100, 50, redis_client=redis_client)

    assert llm_budget.is_within_budget(
        LLM_PROVIDER_DEEPSEEK, budget_usd=1.0, redis_client=redis_client
    )


def test_is_within_budget_false_once_ceiling_is_crossed():
    redis_client = _FakeRedis()
    # Enough tokens to exceed a $0.01 budget at DeepSeek's real pricing.
    llm_budget.record_usage(LLM_PROVIDER_DEEPSEEK, 1_000_000, 1_000_000, redis_client=redis_client)

    assert not llm_budget.is_within_budget(
        LLM_PROVIDER_DEEPSEEK, budget_usd=0.01, redis_client=redis_client
    )


def test_record_usage_skips_zero_counts():
    redis_client = _FakeRedis()

    llm_budget.record_usage(LLM_PROVIDER_DEEPSEEK, 0, 0, redis_client=redis_client)

    assert redis_client.values == {}


def test_usage_key_is_scoped_to_the_current_month():
    key = llm_budget._usage_key(LLM_PROVIDER_DEEPSEEK, "prompt")

    assert time.strftime("%Y-%m") in key


def test_try_reserve_budget_holds_when_under_ceiling():
    redis_client = _FakeRedis()

    held = llm_budget.try_reserve_budget(
        LLM_PROVIDER_DEEPSEEK, budget_usd=1.0, estimated_cost_usd=0.1, redis_client=redis_client
    )

    assert held
    assert redis_client.values[llm_budget._reservation_key(LLM_PROVIDER_DEEPSEEK)] == 0.1


def test_try_reserve_budget_rolls_back_when_it_would_exceed_ceiling():
    redis_client = _FakeRedis()
    llm_budget.record_usage(LLM_PROVIDER_DEEPSEEK, 1_000_000, 1_000_000, redis_client=redis_client)

    held = llm_budget.try_reserve_budget(
        LLM_PROVIDER_DEEPSEEK, budget_usd=0.01, estimated_cost_usd=0.1, redis_client=redis_client
    )

    assert not held
    assert redis_client.values[llm_budget._reservation_key(LLM_PROVIDER_DEEPSEEK)] == 0


def test_release_reservation_decrements_the_reserved_total():
    redis_client = _FakeRedis()
    llm_budget.try_reserve_budget(
        LLM_PROVIDER_DEEPSEEK, budget_usd=1.0, estimated_cost_usd=0.1, redis_client=redis_client
    )

    llm_budget.release_reservation(LLM_PROVIDER_DEEPSEEK, 0.1, redis_client=redis_client)

    assert redis_client.values[llm_budget._reservation_key(LLM_PROVIDER_DEEPSEEK)] == 0
