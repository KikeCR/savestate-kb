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
