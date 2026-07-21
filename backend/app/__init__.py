from flask import Flask, jsonify
from flask_cors import CORS

from app.config import IS_PRODUCTION, Config
from app.extensions import csrf, db, init_redis, limiter, login_manager, migrate, talisman


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    init_redis(app)
    CORS(app, supports_credentials=True, origins=[app.config["FRONTEND_URL"]])
    csrf.init_app(app)
    limiter.init_app(app)
    # force_https/HSTS off outside prod so local http://localhost dev isn't
    # redirect-looped; if TLS ends up terminated by an upstream reverse proxy
    # instead of this app directly, force_https should stay False there too.
    talisman.init_app(
        app,
        force_https=IS_PRODUCTION,
        strict_transport_security=IS_PRODUCTION,
        session_cookie_secure=IS_PRODUCTION,
        content_security_policy={"default-src": "'none'"},
    )

    from app import models  # noqa: F401 registers models with SQLAlchemy metadata

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "authentication required"}), 401

    from app.routes.activity import activity_bp
    from app.routes.auth import auth_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.entries import entries_bp
    from app.routes.follows import follows_bp
    from app.routes.games import games_bp
    from app.routes.health import health_bp
    from app.routes.leaderboards import leaderboards_bp
    from app.routes.recommendations import recommendations_bp
    from app.routes.users import users_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(games_bp)
    app.register_blueprint(entries_bp)
    app.register_blueprint(leaderboards_bp)
    app.register_blueprint(activity_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(follows_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(recommendations_bp)

    from app.cli import register_cli

    register_cli(app)

    return app
