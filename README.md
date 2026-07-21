# SaveState

A multi-user game completion tracker, basically a Backloggery/Grouvee-style app for keeping tabs on your backlog, what you're playing, and what you've finished. Search for a game, drag it around a Kanban board as your status changes, rate it, and it shows up on your public profile and the site-wide activity feed.

Built as a portfolio project targeting a React + Flask + SQLAlchemy + Redis stack.

## Features

- **Auth**: session/cookie-based (Flask-Login), not JWT
- **Game search**: backed by the [RAWG](https://rawg.io) API, cached in Postgres and Redis so repeat lookups don't hit RAWG's rate limit
- **Kanban board**: drag-and-drop across Backlog / Playing / Completed / Dropped / Replaying
- **Full tracking data**: rating, hours played, dates, notes, favorites, replay count, platform, tags
- **Leaderboards**: Redis sorted sets for most games completed this year and highest average rating given
- **Activity feed**: a live-updating "X just completed Y" feed, backed by a Redis list
- **Public profiles**: shareable, with a visibility toggle (public/private) and a stats dashboard (genre breakdown, rating distribution, completions per year)
- **AI recommendations**: a RAG pipeline (local embeddings + pgvector retrieval + DeepSeek/Kimi ranking) suggests highly-rated games similar to what you already love — see [AI Recommendations](#ai-recommendations) below

## Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + TypeScript, functional components + hooks |
| Backend | Flask, application factory pattern |
| ORM | SQLAlchemy via Flask-SQLAlchemy, migrations via Flask-Migrate |
| Auth | Flask-Login, session/cookie-based |
| Database | PostgreSQL 16 + [pgvector](https://github.com/pgvector/pgvector) |
| Cache / real-time | Redis 7 |
| External data | [RAWG API](https://rawg.io/apidocs) for game metadata |
| Embeddings | [fastembed](https://github.com/qdrant/fastembed) (local, ONNX-based — no external API cost) |
| Recommendation LLMs | [DeepSeek](https://platform.deepseek.com) (primary), [Kimi/Moonshot](https://platform.moonshot.ai) (fallback) |
| Containerization | Docker Compose (`db`, `redis`, `backend`, `frontend`) |

## Prerequisites

- Docker and Docker Compose
- A free [RAWG API key](https://rawg.io/apidocs). You'll need this for game search to return anything beyond what's already cached locally.
- Optional, for AI recommendations: a [DeepSeek API key](https://platform.deepseek.com/api_keys) and/or a [Kimi/Moonshot API key](https://platform.moonshot.ai/console/api-keys). Without these, `/recommendations` still works — it just always uses the non-LLM retrieval ranking. See [AI Recommendations](#ai-recommendations).

## Setup

1. **Clone and configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   - `SECRET_KEY`: any random string (used to sign Flask session cookies)
   - `RAWG_API_KEY`: your key from [rawg.io/apidocs](https://rawg.io/apidocs)
   - `DEEPSEEK_API_KEY` / `KIMI_API_KEY`: optional, for AI recommendations — see [AI Recommendations](#ai-recommendations)

   The Postgres credentials in `.env.example` are fine for local development as-is.

2. **Start everything**

   ```bash
   docker compose up -d --build
   ```

   This boots four containers: `db` (Postgres, using the `pgvector/pgvector:pg16` image), `redis`, `backend` (Flask, port `5001`), `frontend` (Vite dev server, port `5173`).

3. **Run database migrations**

   ```bash
   docker compose exec backend flask db upgrade
   ```

4. **Populate the recommendation catalog** (optional, needed for `/recommendations` to return anything beyond a cold-start message)

   ```bash
   docker compose exec backend flask sync-catalog
   ```

5. **Open the app**

   - Frontend: http://localhost:5173
   - Backend health check: http://localhost:5001/health (confirms both Postgres and Redis are reachable)

### Ports

The backend is mapped to host port **5001** instead of 5000. On macOS, port 5000 is commonly claimed by the AirPlay Receiver (ControlCenter), so this dodges that conflict. The frontend's `VITE_API_URL` in `docker-compose.yml` points at `5001` accordingly.

## Development notes

- **Pre-commit formatting check.** A git hook blocks commits that touch unformatted frontend files (Prettier `--check` on staged files only, skipped entirely for backend-only commits). Enable it once per clone:

  ```bash
  git config core.hooksPath .githooks
  ```

- **Editor tooling needs a local `npm install` too.** The frontend container's `node_modules` lives in a Docker-only anonymous volume that never syncs back to the host, so your editor's TypeScript server won't resolve anything until you also run `npm install` inside `frontend/` on your host machine.
- **Changing `.env` requires recreating the backend container, not just restarting it.** `docker compose restart backend` reuses the container's existing (stale) environment. After editing `.env`, run `docker compose up -d backend` instead, which recreates the container and re-reads `env_file`.
- **Database migrations**: after changing a model, generate a migration and apply it:

  ```bash
  docker compose exec backend flask db migrate -m "describe the change"
  docker compose exec backend flask db upgrade
  ```

- **Frontend tooling**: TypeScript strict mode, Prettier (no semicolons, single quotes, tabs, see `.prettierrc` for the full config), no ESLint. Useful commands from `frontend/`:

  ```bash
  npm run format        # prettier --write
  npm run format:check  # prettier --check
  npx tsc -b             # typecheck (not wired into `npm run build`, matches this repo's convention)
  ```

- **Backend tooling**: Ruff for linting + formatting (Black-compatible), see `backend/pyproject.toml` for the full config. Install it via `backend/requirements-dev.txt` (kept separate from `requirements.txt` so the runtime image stays lean). Useful commands:

  ```bash
  docker compose exec backend ruff check app/ tests/           # lint
  docker compose exec backend ruff check --fix app/ tests/     # lint, autofixing what it can
  docker compose exec backend ruff format app/ tests/          # format
  docker compose exec backend ruff format --check app/ tests/  # format, check only
  ```

- **Backend tests**: pytest, using `testcontainers` to spin up ephemeral Postgres + Redis containers per test session (isolated from the dev `db`/`redis` services above). Requires Docker running on the host; run from `backend/` in a host-side virtualenv, not inside the `backend` container (it doesn't have access to the Docker socket):

  ```bash
  cd backend
  python3.12 -m venv .venv && source .venv/bin/activate
  pip install -r requirements-dev.txt
  pytest                          # full suite
  pytest -m "not integration"     # fast subset that doesn't need Docker
  pytest --cov=app --cov-report=term-missing
  ```

  The recommendation tests mock the embedding model, so they don't need network access — but the real `fastembed` model (used by `flask sync-catalog` and the live app) downloads from Hugging Face on first use if it isn't already cached, so make sure whichever host runs it has outbound network access at least once.

## AI Recommendations

`/recommendations` suggests games you don't own yet, built as a proper RAG (retrieval-augmented generation) pipeline rather than just asking an LLM for game names:

1. **Corpus**: `flask sync-catalog` pulls a broad pool of well-rated games from RAWG (filtered to a Metacritic/ratings-count floor) into the `games` table, and embeds each one locally (via [fastembed](https://github.com/qdrant/fastembed) — no external API call, no cost).
2. **Retrieval**: your taste profile (games you've rated ≥7 or favorited) is embedded the same way and compared against the catalog with pgvector cosine similarity, excluding games you already own.
3. **Generation**: the top candidates are handed to an LLM (DeepSeek first, Kimi as fallback) to rank and explain in one sentence each — constrained to *only* the retrieved candidates, so it can't invent a game that doesn't exist. If both providers are unconfigured, over budget, or fail, the app falls back to the retrieval ranking alone (an "algorithm picks" badge appears on the page instead of "AI curated").

**Budget guard**: real token usage from each API response is tracked in Redis per provider per month and compared against `DEEPSEEK_MONTHLY_BUDGET_USD` / `KIMI_MONTHLY_BUDGET_USD` (both default to `$1.00`). Once a provider's monthly spend would cross that ceiling, it's skipped automatically — the feature degrades gracefully rather than erroring. Set a spend/balance cap on each provider's own dashboard too, as a backstop.

**Keeping the catalog fresh**: there's no in-process scheduler, so run `flask sync-catalog` on whatever cadence you like (weekly is reasonable) via cron or a CI scheduled job:

```bash
docker compose exec backend flask sync-catalog
```

## Project structure

```
backend/
  app/
    constants.py  # shared enum-like values (entry status, rating bounds, recommendation tuning)
    cli.py        # flask sync-catalog command
    models/       # User, Game (+ RAG fields: embedding, metacritic, tags), UserGameEntry
    routes/       # auth, games, entries, leaderboards, activity, users, recommendations
    services/     # RAWG client, Redis leaderboards/activity, embeddings (fastembed),
                   # catalog_sync, llm_client (DeepSeek/Kimi), llm_budget, recommendation_service
  migrations/      # Flask-Migrate / Alembic

frontend/
  src/
    api/          # typed fetch client
    components/   # one folder per component (Component.tsx + .css + index.ts),
                   # e.g. GameCard/, RecommendationCard/, NavBar/, YearSelect/, kanban/
    context/      # AuthContext, ThemeContext
    hooks/        # useLocalStorageState, useToggleState, useAvailableYears
    pages/        # Home, Login, Register, Dashboard, Library, Board, Leaderboards,
                   # Activity, Profile, Recommendations (each with its own .css)
    styles/       # shared.css (utility classes reused across pages)
```

## Data attribution

Game data (titles, cover art, platforms, genres, release dates) is provided by the [RAWG Video Games Database API](https://rawg.io).
