from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.extensions import db, login_manager, init_redis


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    login_manager.init_app(app)
    init_redis(app)
    CORS(app, supports_credentials=True)

    from app.routes.health import health_bp

    app.register_blueprint(health_bp)

    return app
