import logging

from flask import current_app

from app.celery_app import celery
from app.extensions import db
from app.models.user import User
from app.services import email_service

logger = logging.getLogger(__name__)


def _load_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        logger.warning("task received unknown user_id=%s — skipping", user_id)
    return user


@celery.task(name="send_welcome_email")
def send_welcome_email_task(user_id):
    user = _load_user(user_id)
    if user:
        email_service.send_welcome_email(user.email, user.username)


@celery.task(name="send_password_reset_email")
def send_password_reset_email_task(user_id, raw_token):
    user = _load_user(user_id)
    if user:
        reset_url = f"{current_app.config['FRONTEND_URL']}/reset-password/{raw_token}"
        email_service.send_password_reset_email(user.email, user.username, reset_url)


@celery.task(name="send_password_changed_email")
def send_password_changed_email_task(user_id):
    user = _load_user(user_id)
    if user:
        email_service.send_password_changed_email(user.email, user.username)
