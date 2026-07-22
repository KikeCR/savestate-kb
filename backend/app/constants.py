ENTRY_STATUSES = ["backlog", "playing", "completed", "dropped", "replaying"]
DEFAULT_ENTRY_STATUS = "backlog"
STATUS_COMPLETED = "completed"

PROFILE_VISIBILITIES = ["public", "private"]
VISIBILITY_PUBLIC = "public"
VISIBILITY_PRIVATE = "private"
DEFAULT_PROFILE_VISIBILITY = VISIBILITY_PUBLIC

RATING_MIN = 1
RATING_MAX = 10
MIN_YEAR_PLAYED = 1970
MIN_PASSWORD_LENGTH = 8
MAX_HOURS_PLAYED = 100_000
MAX_REPLAY_COUNT = 1_000

PASSWORD_POLICY_HINT = (
    f"at least {MIN_PASSWORD_LENGTH} characters, including one uppercase "
    "letter and one special character"
)
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 60

ACTIVITY_ACTIONS = ["added", "completed", "rated", "logged_year"]

AVATAR_URL_MAX_LENGTH = 500
DASHBOARD_CURRENTLY_PLAYING_LIMIT = 5

# --- Recommendations (RAG pipeline) ---
EMBEDDING_DIMENSIONS = 384

# A library entry counts as a "taste signal" (used to build the recommendation
# query) if its rating meets this floor or it's marked a favorite.
RECOMMENDATION_TASTE_RATING_FLOOR = 7
# Below this many taste signals, results would be too thin to be meaningful —
# show a cold-start empty state instead of a weak/generic recommendation set.
RECOMMENDATION_MIN_TASTE_SIGNALS = 3

RECOMMENDATION_CANDIDATE_LIMIT = 30
RECOMMENDATION_RESULT_LIMIT = 10
RECOMMENDATION_CACHE_TTL_SECONDS = 24 * 60 * 60
# NOTE: shortened from 1 hour for active development/testing — dial this back
# up (e.g. 15-30 min) before considering the feature production-ready.
RECOMMENDATION_REFRESH_COOLDOWN_SECONDS = 60

# A candidate must clear one of these floors to be considered "highly rated"
# enough to recommend. RAWG's metacritic is 0-100 and not every game has one
# (hence the ratings_count fallback for games RAWG users rated but Metacritic
# never scored).
CATALOG_MIN_METACRITIC = 75
CATALOG_MIN_RATINGS_COUNT = 500

# catalog_sync pulls a few pages per (ordering, genre) pass rather than one
# single ordering, so the candidate pool isn't a monoculture of whatever one
# metric happens to rank first. RAWG's genre slugs, per their /genres list.
CATALOG_SYNC_ORDERINGS = ["-metacritic", "-rating"]
CATALOG_SYNC_GENRES = [
    "action",
    "adventure",
    "rpg",
    "strategy",
    "shooter",
    "puzzle",
    "platformer",
    "indie",
    "simulation",
    "racing",
]
CATALOG_SYNC_PAGE_SIZE = 40
CATALOG_SYNC_PAGES_PER_PASS = 2

LLM_PROVIDER_DEEPSEEK = "deepseek"
LLM_PROVIDER_KIMI = "kimi"
RECOMMENDATION_SOURCE_RETRIEVAL_ONLY = "retrieval_only"

# USD per 1M tokens. Verify against each provider's current pricing page
# before relying on this for anything beyond a rough budget-guard estimate —
# these change over time and this table is not fetched live.
LLM_PRICING_USD_PER_MILLION_TOKENS = {
    LLM_PROVIDER_DEEPSEEK: {"input": 0.14, "output": 0.28},
    LLM_PROVIDER_KIMI: {"input": 0.95, "output": 4.00},
}
