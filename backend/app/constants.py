ENTRY_STATUSES = ["backlog", "playing", "completed", "dropped", "replaying"]
DEFAULT_ENTRY_STATUS = "backlog"
STATUS_COMPLETED = "completed"

PROFILE_VISIBILITIES = ["public", "private"]
VISIBILITY_PUBLIC = "public"
VISIBILITY_PRIVATE = "private"
DEFAULT_PROFILE_VISIBILITY = VISIBILITY_PUBLIC

# Curated platform names a user can pick as "preferred platforms" — a subset
# of the freeform strings RAWG returns in Game.platforms (that field has no
# fixed vocabulary). Keep these spelled exactly as RAWG returns them, since
# the recommendation platform-boost matches by exact string intersection.
PLATFORMS = [
    "PC",
    "PlayStation 5",
    "PlayStation 4",
    "Xbox Series S/X",
    "Xbox One",
    "Nintendo Switch",
    "macOS",
    "Linux",
    "iOS",
    "Android",
]

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

ACTIVITY_ACTIONS = ["added", "completed", "rated", "logged_year", "reviewed"]

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

# Total ranked recommendations computed & cached per batch. Only the first
# RECOMMENDATION_RESULT_LIMIT are shown immediately; the rest are held as a
# client-side reserve so adding/disliking a card can be replaced instantly
# without a new LLM round-trip.
RECOMMENDATION_RESERVE_LIMIT = 20

# Retrieval draws this many nearest neighbors before the variety-sampling
# step (_select_diverse_candidates) narrows it down to
# RECOMMENDATION_CANDIDATE_LIMIT — the wider pool is what makes sampling
# meaningfully different call to call instead of picking from the same
# deterministic top-30 every time.
RECOMMENDATION_CANDIDATE_POOL_LIMIT = 60

# Geometric weight decay per pool position when variety-sampling candidates:
# position 0 has weight 1, position i has weight DECAY**i. Keeps the sample
# biased toward closer taste matches while still varying which subset of the
# pool is chosen across refreshes.
RECOMMENDATION_VARIETY_DECAY = 0.9

# Secondary weight multiplier applied in _select_diverse_candidates to a
# candidate whose platforms overlap the user's preferred_platforms — layered
# on top of _platform_tier_order's retrieval-stage prioritization
# (recommendation_service.py), which does the primary work of surfacing
# matches at all. This just biases which matches vs. non-matches win the
# variety-sampling step within an already platform-front-loaded pool. Never
# a hard filter — a great match on a different platform can still be picked.
RECOMMENDATION_PLATFORM_BOOST_MULTIPLIER = 4.0

# Games shown to a user in the last N seconds are de-prioritized (not
# hard-excluded — see _select_diverse_candidates) from future candidate
# pools, tracked in a Redis ZSET (recs:seen:{user_id}) separate from the
# per-request recs:{user_id} cache.
RECOMMENDATION_RECENTLY_SHOWN_WINDOW_SECONDS = 7 * 24 * 60 * 60

# Smaller batch size for the reserve-exhaustion topup endpoint, vs a full
# refresh's RECOMMENDATION_RESERVE_LIMIT — a topup is meant to be a quick
# extension, not a full recompute.
RECOMMENDATION_TOPUP_LIMIT = 10

# Shorter than RECOMMENDATION_REFRESH_COOLDOWN_SECONDS: a topup is a natural
# consequence of the user adding/disliking several suggestions in one
# sitting, not manual refresh-button spam, so it gets a lighter cooldown —
# but still needs one, since it can call the LLM.
RECOMMENDATION_TOPUP_COOLDOWN_SECONDS = 20

# Extra guardrail bounding worst-case LLM calls from one user's topups
# within a single cache TTL window (the counter key shares that TTL — see
# try_reserve_topup_slot in recommendation_service.py).
RECOMMENDATION_TOPUP_MAX_PER_WINDOW = 5

# --- Recommendation feedback (thumbs up/down on a suggestion) ---
FEEDBACK_LIKED = "liked"
FEEDBACK_DISLIKED = "disliked"
FEEDBACK_SENTIMENTS = [FEEDBACK_LIKED, FEEDBACK_DISLIKED]

# --- Reviews ---
# How many reviews the game detail page shows at once — enough for a small
# grid with no scrolling. The specific subset shown is randomized
# server-side (ORDER BY random()) on each request rather than always being
# the same REVIEW_DISPLAY_LIMIT reviews.
REVIEW_DISPLAY_LIMIT = 6
REVIEW_BODY_MAX_LENGTH = 5000

# --- Home page: popular games ---
HOME_POPULAR_RESULT_LIMIT = 12
# Below this many distinct users with at least one library entry, "popular
# with players" would just reflect a handful of individual libraries rather
# than genuine cross-user signal — that section is hidden below this floor
# and the homepage leans on the critically-acclaimed (metacritic-based)
# list alone. See popular_games_service.get_popular_games.
HOME_POPULAR_MIN_DISTINCT_USERS = 5

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
