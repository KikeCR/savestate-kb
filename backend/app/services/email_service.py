import logging
import smtplib
from email.message import EmailMessage

from flask import current_app

from app.constants import PASSWORD_RESET_TOKEN_EXPIRY_MINUTES

logger = logging.getLogger(__name__)

# Brand colors, matching the app's light theme (frontend/src/index.css).
_ACCENT = "#2563eb"
_TEXT = "#1a1a1a"
_MUTED = "#555555"
_BORDER = "#e5e7eb"
_PAGE_BG = "#f4f4f5"

# Same path data as lucide-react's Gamepad2 icon (frontend/src/components/Logo),
# so the email header matches the app's logo exactly rather than a generic
# placeholder mark.
_LOGO_SVG = """\
<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="{accent}"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  xmlns="http://www.w3.org/2000/svg">
  <line x1="6" x2="10" y1="11" y2="11"/>
  <line x1="8" x2="8" y1="9" y2="13"/>
  <line x1="15" x2="15.01" y1="12" y2="12"/>
  <line x1="18" x2="18.01" y1="10" y2="10"/>
  <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152
    C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414
    A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1
    a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151
    A4 4 0 0 0 17.32 5z"/>
</svg>""".format(accent=_ACCENT)


def _render_html(heading, paragraphs, cta=None):
    """Wraps heading/paragraphs/an optional (label, url) CTA button in the
    shared branded card layout: logo header, white card, muted footer. Table-
    based markup and inline styles throughout — the only layout approach
    that renders consistently across email clients (notably Outlook)."""
    body_html = "".join(
        f'<tr><td style="font-size:15px;line-height:1.6;color:{_TEXT};'
        f'padding-bottom:16px;">{p}</td></tr>'
        for p in paragraphs
    )
    cta_html = ""
    if cta:
        label, url = cta
        cta_html = f"""
        <tr><td style="padding-bottom:8px;text-align:center;">
          <a href="{url}" style="display:inline-block;background:{_ACCENT};
            color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;
            padding:12px 28px;border-radius:8px;">{label}</a>
        </td></tr>"""

    return f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:32px 16px;background:{_PAGE_BG};
    font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="max-width:520px;margin:0 auto;">
      <tr><td style="padding-bottom:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;padding-right:8px;line-height:0;">{_LOGO_SVG}</td>
            <td style="vertical-align:middle;">
              <span style="font-size:20px;font-weight:700;letter-spacing:0.03em;
                color:{_TEXT};">SaveState</span>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid {_BORDER};
        border-radius:12px;padding:32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:18px;font-weight:700;color:{_TEXT};
            padding-bottom:12px;">{heading}</td></tr>
          {body_html}
          {cta_html}
        </table>
      </td></tr>
      <tr><td style="padding-top:24px;font-size:12px;color:{_MUTED};
        text-align:center;">
        Track your backlog. Beat your games. Compare with friends.
      </td></tr>
    </table>
  </body>
</html>"""


def _send(to_email, subject, text_body, html_body):
    host = current_app.config["SMTP_HOST"]
    if not host:
        logger.warning("SMTP_HOST is not configured — skipping email %r to %s", subject, to_email)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = current_app.config["EMAIL_FROM_ADDRESS"]
    message["To"] = to_email
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(host, current_app.config["SMTP_PORT"]) as smtp:
        if current_app.config["SMTP_USE_TLS"]:
            smtp.starttls()
        username = current_app.config["SMTP_USERNAME"]
        if username:
            smtp.login(username, current_app.config["SMTP_PASSWORD"])
        smtp.send_message(message)


def send_welcome_email(to_email, username):
    app_url = current_app.config["FRONTEND_URL"]
    _send(
        to_email,
        "Welcome to SaveState",
        f"Hi {username},\n\n"
        "Welcome to SaveState! Your account is ready — start tracking your "
        f"backlog, log completions, and see how you stack up on the leaderboards.\n\n{app_url}\n",
        _render_html(
            f"Welcome, {username}!",
            [
                "Your account is ready. Start tracking your backlog, log "
                "completions, and see how you stack up against friends on "
                "the leaderboards.",
            ],
            cta=("Open SaveState", app_url),
        ),
    )


def send_password_reset_email(to_email, username, reset_url):
    _send(
        to_email,
        "Reset your SaveState password",
        f"Hi {username},\n\n"
        "We received a request to reset your SaveState password. Click the "
        f"link below to choose a new one:\n\n{reset_url}\n\n"
        f"This link expires in {PASSWORD_RESET_TOKEN_EXPIRY_MINUTES} minutes. "
        "If you didn't request this, you can safely ignore this email.\n",
        _render_html(
            "Reset your password",
            [
                f"Hi {username}, we received a request to reset the password "
                "for your SaveState account. Click the button below to choose a new one.",
                f"This link expires in {PASSWORD_RESET_TOKEN_EXPIRY_MINUTES} "
                "minutes. If you didn't request this, you can safely ignore this email.",
            ],
            cta=("Reset password", reset_url),
        ),
    )


def send_password_changed_email(to_email, username):
    forgot_password_url = f"{current_app.config['FRONTEND_URL']}/forgot-password"
    _send(
        to_email,
        "Your SaveState password was changed",
        f"Hi {username},\n\n"
        "This is a confirmation that your SaveState password was just changed. "
        "If you didn't make this change, please reset your password immediately.\n"
        f"\n{forgot_password_url}\n",
        _render_html(
            "Your password was changed",
            [
                f"Hi {username}, this is a confirmation that the password for "
                "your SaveState account was just changed.",
                "If you didn't make this change, reset your password right away.",
            ],
            cta=("Didn't do this? Reset your password", forgot_password_url),
        ),
    )
