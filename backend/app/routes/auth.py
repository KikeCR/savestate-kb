from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user

from app.extensions import db
from app.models.user import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not email or not username or not password:
        return jsonify({"error": "email, username, and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "password must be at least 8 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 409
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "username already taken"}), 409

    user = User(email=email, username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    login_user(user)
    return jsonify(user.to_private_dict()), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "invalid email or password"}), 401

    login_user(user)
    return jsonify(user.to_private_dict())


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return "", 204


@auth_bp.route("/me")
def me():
    if not current_user.is_authenticated:
        return jsonify({"user": None})
    return jsonify({"user": current_user.to_private_dict()})
