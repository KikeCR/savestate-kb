import json

import requests
from flask import current_app

from app.constants import LLM_PROVIDER_DEEPSEEK, LLM_PROVIDER_KIMI
from app.services import llm_budget

REQUEST_TIMEOUT = 15
# Sized for RECOMMENDATION_RESERVE_LIMIT (20) {"index", "reason"} objects —
# recommendation_service asks for a full reserve batch in one call rather
# than just the RECOMMENDATION_RESULT_LIMIT (10) shown immediately, so this
# needs roughly double what 10 objects alone would require. A truncated
# response fails json.loads and is treated the same as any other provider
# failure (falls through to the next provider, then the templated
# fallback) — a silent quality regression rather than a crash, so this is
# worth re-checking if the reserve size ever grows further.
MAX_OUTPUT_TOKENS = 1600
# ~4 characters per token is a standard rough heuristic for English text —
# good enough to reserve a worst-case budget slice before a call, not meant
# to be an exact token count (the real one comes back in the response).
CHARS_PER_TOKEN_ESTIMATE = 4

_PROVIDER_CONFIG_KEYS = {
    LLM_PROVIDER_DEEPSEEK: {
        "api_key": "DEEPSEEK_API_KEY",
        "base_url": "DEEPSEEK_BASE_URL",
        "model": "DEEPSEEK_MODEL",
        "budget": "DEEPSEEK_MONTHLY_BUDGET_USD",
    },
    LLM_PROVIDER_KIMI: {
        "api_key": "KIMI_API_KEY",
        "base_url": "KIMI_BASE_URL",
        "model": "KIMI_MODEL",
        "budget": "KIMI_MONTHLY_BUDGET_USD",
    },
}


class LLMConfigError(RuntimeError):
    pass


class LLMResponseError(RuntimeError):
    pass


def _provider_config(provider):
    keys = _PROVIDER_CONFIG_KEYS[provider]
    api_key = current_app.config[keys["api_key"]]
    if not api_key:
        raise LLMConfigError(f"{keys['api_key']} is not configured")
    return {
        "api_key": api_key,
        "base_url": current_app.config[keys["base_url"]],
        "model": current_app.config[keys["model"]],
        "budget_usd": current_app.config[keys["budget"]],
    }


def chat_completion_json(provider, system_prompt, user_prompt):
    """Calls the given provider's OpenAI-compatible chat completions
    endpoint in JSON mode. Returns (parsed_json, usage_dict). Raises
    LLMConfigError if the provider's key isn't set, or LLMResponseError on
    an unparsable response body — callers that want the "fall through to
    the next provider" behavior should use try_chat_completion_json
    instead, which catches all of this.
    """
    config = _provider_config(provider)
    resp = requests.post(
        f"{config['base_url']}/chat/completions",
        headers={
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json",
        },
        json={
            "model": config["model"],
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": MAX_OUTPUT_TOKENS,
            "thinking": {"type": "disabled"},
        },
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    body = resp.json()

    try:
        content = body["choices"][0]["message"]["content"]
        parsed = json.loads(content)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise LLMResponseError(f"could not parse {provider} response: {exc}") from exc

    usage = body.get("usage") or {}
    usage_dict = {
        "prompt_tokens": usage.get("prompt_tokens", 0),
        "completion_tokens": usage.get("completion_tokens", 0),
    }
    return parsed, usage_dict


def try_chat_completion_json(provider, system_prompt, user_prompt, redis_client=None):
    """The safe wrapper recommendation_service uses to walk the provider
    chain: returns the parsed JSON on success, or None if the provider is
    unconfigured, already over its monthly budget, or the call/parse failed
    for any reason. Every one of those cases is treated identically by the
    caller — move on to the next provider (or the retrieval-only fallback).
    Budget usage is only recorded after a genuinely successful call, using
    the real token counts the provider reports.
    """
    try:
        config = _provider_config(provider)
    except LLMConfigError:
        return None

    estimated_prompt_tokens = (len(system_prompt) + len(user_prompt)) // CHARS_PER_TOKEN_ESTIMATE
    estimated_cost = llm_budget.estimate_cost_usd(
        provider, estimated_prompt_tokens, MAX_OUTPUT_TOKENS
    )
    if not llm_budget.try_reserve_budget(
        provider, config["budget_usd"], estimated_cost, redis_client=redis_client
    ):
        return None

    try:
        parsed, usage = chat_completion_json(provider, system_prompt, user_prompt)
    except (requests.RequestException, LLMResponseError):
        return None
    finally:
        llm_budget.release_reservation(provider, estimated_cost, redis_client=redis_client)

    llm_budget.record_usage(
        provider, usage["prompt_tokens"], usage["completion_tokens"], redis_client=redis_client
    )
    return parsed
