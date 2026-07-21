import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://savestate:savestate@localhost:5432/savestate"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # Free key from https://rawg.io/apidocs. Required for GET /api/games/search
    # whenever a title isn't already cached in Postgres. Unset/placeholder values
    # aren't caught at startup — see RawgClient in app/services/rawg_client.py.
    RAWG_API_KEY = os.environ.get("RAWG_API_KEY", "")
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # DeepSeek — primary LLM for recommendation ranking/explanations. Key from
    # https://platform.deepseek.com/api_keys. Unset/placeholder values aren't
    # caught at startup — see LlmClient in app/services/llm_client.py.
    DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")
    DEEPSEEK_MONTHLY_BUDGET_USD = float(os.environ.get("DEEPSEEK_MONTHLY_BUDGET_USD", "1.0"))

    # Kimi (Moonshot AI) — fallback LLM, used only when DeepSeek is over budget
    # or errors. Key from https://platform.moonshot.ai/console/api-keys.
    KIMI_API_KEY = os.environ.get("KIMI_API_KEY", "")
    KIMI_BASE_URL = os.environ.get("KIMI_BASE_URL", "https://api.moonshot.ai/v1")
    KIMI_MODEL = os.environ.get("KIMI_MODEL", "kimi-k2.6")
    KIMI_MONTHLY_BUDGET_USD = float(os.environ.get("KIMI_MONTHLY_BUDGET_USD", "1.0"))

    # Local embedding model (fastembed/ONNX) used for RAG retrieval — runs
    # in-process, no external API cost. Downloaded on first use if not already
    # cached in the image/container.
    EMBEDDING_MODEL_NAME = os.environ.get("EMBEDDING_MODEL_NAME", "BAAI/bge-small-en-v1.5")
