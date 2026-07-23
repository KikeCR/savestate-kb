import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from flask_wtf.csrf import generate_csrf

from app.constants import (
    AVATAR_URL_MAX_LENGTH,
    PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
    PLATFORMS,
    PROFILE_VISIBILITIES,
)
from app.extensions import db, limiter
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.services import password_policy

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _hash_token(raw_token):
    return hashlib.sha256(raw_token.encode()).hexdigest()


@auth_bp.route("/csrf")
def csrf_token():
    return jsonify({"csrf_token": generate_csrf()})


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not email or not username or not password:
        return jsonify({"error": "email, username, and password are required"}), 400
    password_error = password_policy.validate_password(password)
    if password_error:
        return jsonify({"error": password_error}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 409
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "username already taken"}), 409

    user = User(email=email, username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    login_user(user)

    from app.tasks import send_welcome_email_task

    send_welcome_email_task.delay(user.id)

    return jsonify(user.to_private_dict()), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "invalid email or password"}), 401

    login_user(user)
    return jsonify(user.to_private_dict())


@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("5 per minute")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    # Always the same response regardless of whether the email exists, so
    # this endpoint can't be used to enumerate registered accounts.
    generic_response = jsonify(
        {"message": "if that email is registered, a reset link has been sent"}
    )

    user = User.query.filter_by(email=email).first() if email else None
    if user:
        PasswordResetToken.query.filter_by(user_id=user.id, used_at=None).delete()

        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=PASSWORD_RESET_TOKEN_EXPIRY_MINUTES
        )
        db.session.add(
            PasswordResetToken(
                user_id=user.id, token_hash=_hash_token(raw_token), expires_at=expires_at
            )
        )
        db.session.commit()

        from app.tasks import send_password_reset_email_task

        send_password_reset_email_task.delay(user.id, raw_token)

    return generic_response


@auth_bp.route("/reset-password", methods=["POST"])
@limiter.limit("10 per minute")
def reset_password():
    data = request.get_json(silent=True) or {}
    raw_token = data.get("token") or ""
    password = data.get("password") or ""

    if not raw_token:
        return jsonify({"error": "token is required"}), 400
    password_error = password_policy.validate_password(password)
    if password_error:
        return jsonify({"error": password_error}), 400

    reset_token = PasswordResetToken.query.filter_by(token_hash=_hash_token(raw_token)).first()
    if not reset_token or not reset_token.is_valid():
        return jsonify({"error": "this reset link is invalid or has expired"}), 400

    user = db.session.get(User, reset_token.user_id)
    user.set_password(password)
    reset_token.used_at = datetime.now(timezone.utc)
    db.session.commit()

    login_user(user)

    from app.tasks import send_password_changed_email_task

    send_password_changed_email_task.delay(user.id)

    return jsonify(user.to_private_dict())


@auth_bp.route("/change-password", methods=["POST"])
@login_required
@limiter.limit("10 per minute")
def change_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if not current_user.check_password(current_password):
        return jsonify({"error": "current password is incorrect"}), 401

    password_error = password_policy.validate_password(new_password)
    if password_error:
        return jsonify({"error": password_error}), 400

    current_user.set_password(new_password)
    db.session.commit()

    from app.tasks import send_password_changed_email_task

    send_password_changed_email_task.delay(current_user.id)

    return jsonify(current_user.to_private_dict())


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

    if "preferred_platforms" in data:
        value = data["preferred_platforms"]
        if not isinstance(value, list) or any(item not in PLATFORMS for item in value):
            return jsonify(
                {"error": f"preferred_platforms must be a list of values from {PLATFORMS}"}
            ), 400
        current_user.preferred_platforms = value

    db.session.commit()
    return jsonify(current_user.to_private_dict())
