import pytest
from flask import Flask

from app.constants import LLM_PROVIDER_DEEPSEEK
from app.services import llm_client

# A bare Flask app (not the conftest `app` fixture) is enough here: llm_client
# only needs current_app.config, not a real DB/Redis, so these stay fast
# unit tests with no testcontainer dependency.

DEEPSEEK_URL = "https://fake-deepseek.test/chat/completions"


@pytest.fixture()
def configured_app():
    flask_app = Flask(__name__)
    flask_app.config.update(
        DEEPSEEK_API_KEY="test-key",
        DEEPSEEK_BASE_URL="https://fake-deepseek.test",
        DEEPSEEK_MODEL="deepseek-v4-flash",
        DEEPSEEK_MONTHLY_BUDGET_USD=1.0,
        KIMI_API_KEY="",
        KIMI_BASE_URL="https://fake-kimi.test",
        KIMI_MODEL="kimi-k2.6",
        KIMI_MONTHLY_BUDGET_USD=1.0,
    )
    return flask_app


class _FakeRedis:
    def __init__(self):
        self.values = {}

    def get(self, key):
        value = self.values.get(key)
        return str(value) if value is not None else None

    def incrby(self, key, amount):
        self.values[key] = self.values.get(key, 0) + amount
        return self.values[key]

    def incrbyfloat(self, key, amount):
        self.values[key] = float(self.values.get(key, 0)) + amount
        return self.values[key]

    def expire(self, key, ttl):
        pass


def _mock_success_response(requests_mock, content, prompt_tokens=100, completion_tokens=50):
    requests_mock.post(
        DEEPSEEK_URL,
        json={
            "choices": [{"message": {"content": content}}],
            "usage": {"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens},
        },
    )


def test_chat_completion_json_parses_content_and_usage(configured_app, requests_mock):
    _mock_success_response(requests_mock, '{"recommendations": []}')

    with configured_app.app_context():
        parsed, usage = llm_client.chat_completion_json(LLM_PROVIDER_DEEPSEEK, "system", "user")

    assert parsed == {"recommendations": []}
    assert usage == {"prompt_tokens": 100, "completion_tokens": 50}


def test_chat_completion_json_disables_thinking_mode(configured_app, requests_mock):
    # Regression test: both DeepSeek's and Kimi's current models default to
    # an extended chain-of-thought phase that can consume the entire
    # max_tokens budget before ever writing to `content`, leaving it empty
    # for any non-trivial prompt (confirmed against the real APIs). Also,
    # Kimi rejects any temperature other than 1, so it must not be sent.
    _mock_success_response(requests_mock, '{"recommendations": []}')

    with configured_app.app_context():
        llm_client.chat_completion_json(LLM_PROVIDER_DEEPSEEK, "system", "user")

    sent_body = requests_mock.last_request.json()
    assert sent_body["thinking"] == {"type": "disabled"}
    assert "temperature" not in sent_body


def test_chat_completion_json_raises_on_missing_api_key(configured_app):
    from app.constants import LLM_PROVIDER_KIMI

    with configured_app.app_context():
        with pytest.raises(llm_client.LLMConfigError):
            llm_client.chat_completion_json(LLM_PROVIDER_KIMI, "system", "user")


def test_chat_completion_json_raises_on_malformed_json_content(configured_app, requests_mock):
    _mock_success_response(requests_mock, "not valid json")

    with configured_app.app_context():
        with pytest.raises(llm_client.LLMResponseError):
            llm_client.chat_completion_json(LLM_PROVIDER_DEEPSEEK, "system", "user")


def test_chat_completion_json_raises_on_missing_choices(configured_app, requests_mock):
    requests_mock.post(DEEPSEEK_URL, json={"choices": []})

    with configured_app.app_context():
        with pytest.raises(llm_client.LLMResponseError):
            llm_client.chat_completion_json(LLM_PROVIDER_DEEPSEEK, "system", "user")


def test_chat_completion_json_raises_on_http_error(configured_app, requests_mock):
    requests_mock.post(DEEPSEEK_URL, status_code=500)

    with configured_app.app_context():
        with pytest.raises(Exception):  # requests.HTTPError, via raise_for_status
            llm_client.chat_completion_json(LLM_PROVIDER_DEEPSEEK, "system", "user")


def test_try_chat_completion_json_returns_none_when_unconfigured(configured_app):
    from app.constants import LLM_PROVIDER_KIMI

    with configured_app.app_context():
        result = llm_client.try_chat_completion_json(
            LLM_PROVIDER_KIMI, "system", "user", redis_client=_FakeRedis()
        )

    assert result is None


def test_try_chat_completion_json_returns_none_when_over_budget(configured_app, requests_mock):
    _mock_success_response(requests_mock, '{"recommendations": []}')
    redis_client = _FakeRedis()

    with configured_app.app_context():
        # Exhaust the budget first.
        from app.services import llm_budget

        llm_budget.record_usage(
            LLM_PROVIDER_DEEPSEEK, 10_000_000, 10_000_000, redis_client=redis_client
        )

        result = llm_client.try_chat_completion_json(
            LLM_PROVIDER_DEEPSEEK, "system", "user", redis_client=redis_client
        )

    assert result is None
    assert not requests_mock.called


def test_try_chat_completion_json_returns_none_on_call_failure(configured_app, requests_mock):
    requests_mock.post(DEEPSEEK_URL, status_code=500)
    redis_client = _FakeRedis()

    with configured_app.app_context():
        result = llm_client.try_chat_completion_json(
            LLM_PROVIDER_DEEPSEEK, "system", "user", redis_client=redis_client
        )

        from app.services import llm_budget

        prompt, completion = llm_budget.get_usage_tokens(
            LLM_PROVIDER_DEEPSEEK, redis_client=redis_client
        )

    assert result is None
    # No real usage recorded, and the pre-call reservation was fully released.
    assert (prompt, completion) == (0, 0)
    assert redis_client.values[llm_budget._reservation_key(LLM_PROVIDER_DEEPSEEK)] == 0


def test_try_chat_completion_json_records_usage_on_success(configured_app, requests_mock):
    _mock_success_response(
        requests_mock, '{"recommendations": []}', prompt_tokens=123, completion_tokens=45
    )
    redis_client = _FakeRedis()

    with configured_app.app_context():
        result = llm_client.try_chat_completion_json(
            LLM_PROVIDER_DEEPSEEK, "system", "user", redis_client=redis_client
        )

        from app.services import llm_budget

        prompt, completion = llm_budget.get_usage_tokens(
            LLM_PROVIDER_DEEPSEEK, redis_client=redis_client
        )

    assert result == {"recommendations": []}
    assert (prompt, completion) == (123, 45)
