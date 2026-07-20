from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user

from app.constants import AVATAR_URL_MAX_LENGTH, MIN_PASSWORD_LENGTH, PROFILE_VISIBILITIES
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
    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify(
            {"error": f"password must be at least {MIN_PASSWORD_LENGTH} characters"}
        ), 400

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


@auth_bp.route("/me", methods=["PATCH"])
@login_required
def update_me():
    data = request.get_json(silent=True) or {}

    if "profile_visibility" in data:
        value = data["profile_visibility"]
        if value not in PROFILE_VISIBILITIES:
            return jsonify(
                {"error": f"profile_visibility must be one of {PROFILE_VISIBILITIES}"}
            ), 400
        current_user.profile_visibility = value

    if "avatar_url" in data:
        value = data["avatar_url"]
        if value in (None, ""):
            current_user.avatar_url = None
        elif (
            not isinstance(value, str)
            or len(value) > AVATAR_URL_MAX_LENGTH
            or not value.startswith(("http://", "https://"))
        ):
            return jsonify({"error": "avatar_url must be an http(s) URL"}), 400
        else:
            current_user.avatar_url = value

    db.session.commit()
    return jsonify(current_user.to_private_dict())
