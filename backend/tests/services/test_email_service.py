from unittest.mock import MagicMock, patch

import pytest
from flask import Flask

from app.services import email_service

# A bare Flask app is enough here: email_service only needs current_app.config
# and smtplib (mocked below), not a real DB/Redis — fast unit tests, no
# testcontainer dependency.


def _make_app(**config_overrides):
    flask_app = Flask(__name__)
    defaults = {
        "SMTP_HOST": "smtp.test",
        "SMTP_PORT": 1025,
        "SMTP_USERNAME": "",
        "SMTP_PASSWORD": "",
        "SMTP_USE_TLS": False,
        "EMAIL_FROM_ADDRESS": "noreply@savestate.local",
        "FRONTEND_URL": "https://savestate.example",
    }
    flask_app.config.update({**defaults, **config_overrides})
    return flask_app


@pytest.fixture()
def configured_app():
    return _make_app()


@pytest.fixture()
def unconfigured_app():
    return _make_app(SMTP_HOST="")


def _sent_message(mock_server):
    return mock_server.send_message.call_args[0][0]


def _text_part(message):
    return message.get_body(preferencelist=("plain",)).get_content()


def _html_part(message):
    return message.get_body(preferencelist=("html",)).get_content()


def test_send_welcome_email_no_ops_when_smtp_host_unset(unconfigured_app):
    with unconfigured_app.app_context(), patch("smtplib.SMTP") as mock_smtp:
        email_service.send_welcome_email("player@example.com", "player")

    mock_smtp.assert_not_called()


def test_send_welcome_email_sends_via_smtp(configured_app):
    mock_server = MagicMock()
    with configured_app.app_context(), patch("smtplib.SMTP") as mock_smtp:
        mock_smtp.return_value.__enter__.return_value = mock_server
        email_service.send_welcome_email("player@example.com", "player")

    mock_smtp.assert_called_once_with("smtp.test", 1025)
    message = _sent_message(mock_server)
    assert message["To"] == "player@example.com"
    assert message["Subject"] == "Welcome to SaveState"
    assert message.is_multipart()


def test_send_welcome_email_html_includes_brand_and_cta(configured_app):
    mock_server = MagicMock()
    with configured_app.app_context(), patch("smtplib.SMTP") as mock_smtp:
        mock_smtp.return_value.__enter__.return_value = mock_server
        email_service.send_welcome_email("player@example.com", "player")

    html = _html_part(_sent_message(mock_server))
    assert "SaveState" in html
    assert "<svg" in html  # branded logo mark, not a boilerplate template
    assert "https://savestate.example" in html
    assert "player" in html


def test_send_password_reset_email_includes_reset_url_in_both_parts(configured_app):
    mock_server = MagicMock()
    with configured_app.app_context(), patch("smtplib.SMTP") as mock_smtp:
        mock_smtp.return_value.__enter__.return_value = mock_server
        email_service.send_password_reset_email(
            "player@example.com", "player", "https://example.com/reset-password/abc123"
        )

    message = _sent_message(mock_server)
    assert "https://example.com/reset-password/abc123" in _text_part(message)
    assert "https://example.com/reset-password/abc123" in _html_part(message)


def test_send_password_changed_email_links_to_forgot_password(configured_app):
    mock_server = MagicMock()
    with configured_app.app_context(), patch("smtplib.SMTP") as mock_smtp:
        mock_smtp.return_value.__enter__.return_value = mock_server
        email_service.send_password_changed_email("player@example.com", "player")

    message = _sent_message(mock_server)
    assert message["Subject"] == "Your SaveState password was changed"
    assert "https://savestate.example/forgot-password" in _html_part(message)


def test_send_email_uses_tls_and_login_when_configured():
    flask_app = _make_app(
        SMTP_PORT=587, SMTP_USERNAME="user", SMTP_PASSWORD="pass", SMTP_USE_TLS=True
    )
    mock_server = MagicMock()
    with flask_app.app_context(), patch("smtplib.SMTP") as mock_smtp:
        mock_smtp.return_value.__enter__.return_value = mock_server
        email_service.send_welcome_email("player@example.com", "player")

    mock_server.starttls.assert_called_once()
    mock_server.login.assert_called_once_with("user", "pass")
