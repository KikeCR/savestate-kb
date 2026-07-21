import pytest
from sqlalchemy import text
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer

from app import create_app
from app.config import Config
from app.extensions import db
from app.services.rawg_client import RAWG_BASE_URL
from tests.factories import build_entry, build_follow, build_game, build_user


@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("pgvector/pgvector:pg16", driver=None) as pg:
        yield pg


@pytest.fixture(scope="session")
def redis_container():
    with RedisContainer("redis:7-alpine") as rc:
        yield rc


@pytest.fixture(scope="session")
def app(postgres_container, redis_container):
    class TestConfig(Config):
        TESTING = True
        SECRET_KEY = "test-secret"
        RAWG_API_KEY = "test-rawg-key"
        SQLALCHEMY_DATABASE_URI = postgres_container.get_connection_url()
        REDIS_URL = (
            f"redis://{redis_container.get_container_host_ip()}:"
            f"{redis_container.get_exposed_port(6379)}/0"
        )

    application = create_app(TestConfig)
    with application.app_context():
        db.session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        db.session.commit()
        db.create_all()
    yield application


@pytest.fixture(autouse=True)
def _clean_db(request):
    yield
    if request.node.get_closest_marker("integration") is None:
        return
    app = request.getfixturevalue("app")
    with app.app_context():
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(text(f"TRUNCATE TABLE {table.name} RESTART IDENTITY CASCADE"))
        db.session.commit()


@pytest.fixture(autouse=True)
def _clean_redis(request):
    yield
    if request.node.get_closest_marker("integration") is None:
        return
    redis_container = request.getfixturevalue("redis_container")
    redis_container.get_client().flushdb()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def make_user(app):
    def _make(**overrides):
        with app.app_context():
            user = build_user(**overrides)
            db.session.add(user)
            db.session.commit()
            db.session.refresh(user)
            db.session.expunge(user)
            return user

    return _make


@pytest.fixture()
def make_game(app):
    def _make(**overrides):
        with app.app_context():
            game = build_game(**overrides)
            db.session.add(game)
            db.session.commit()
            db.session.refresh(game)
            db.session.expunge(game)
            return game

    return _make


@pytest.fixture()
def make_entry(app):
    def _make(user, game, **overrides):
        with app.app_context():
            entry = build_entry(user, game, **overrides)
            db.session.add(entry)
            db.session.commit()
            db.session.refresh(entry)
            db.session.expunge(entry)
            return entry

    return _make


@pytest.fixture()
def make_follow(app):
    def _make(follower, followed, **overrides):
        with app.app_context():
            follow = build_follow(follower, followed, **overrides)
            db.session.add(follow)
            db.session.commit()
            db.session.refresh(follow)
            db.session.expunge(follow)
            return follow

    return _make


@pytest.fixture()
def logged_in_client(client, make_user):
    user = make_user()
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user.id)
    client.user = user
    return client


@pytest.fixture()
def mock_rawg_search(requests_mock):
    def _mock(results=None, status_code=200, exc=None):
        url = f"{RAWG_BASE_URL}/games"
        if exc:
            requests_mock.get(url, exc=exc)
        else:
            requests_mock.get(url, json={"results": results or []}, status_code=status_code)

    return _mock
