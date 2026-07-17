from flask import Blueprint, jsonify
from sqlalchemy import text

from app.extensions import db, redis_client

health_bp = Blueprint("health", __name__)


@health_bp.route("/health")
def health():
    status = {"status": "ok", "postgres": "unknown", "redis": "unknown"}
    http_status = 200

    try:
        db.session.execute(text("SELECT 1"))
        status["postgres"] = "ok"
    except Exception as exc:
        status["postgres"] = f"error: {exc}"
        status["status"] = "error"
        http_status = 503

    try:
        redis_client.ping()
        status["redis"] = "ok"
    except Exception as exc:
        status["redis"] = f"error: {exc}"
        status["status"] = "error"
        http_status = 503

    return jsonify(status), http_status
