from datetime import datetime, timedelta, timezone

import click

from app.extensions import db
from app.models.password_reset_token import PasswordResetToken
from app.services import catalog_sync


def register_cli(app):
    @app.cli.command("sync-catalog")
    def sync_catalog():
        """Pulls well-rated games from RAWG into the local catalog with
        embeddings, for use as the recommendation candidate pool. Run this
        occasionally (e.g. weekly via cron) — there's no in-process
        scheduler."""
        result = catalog_sync.run_sync()
        click.echo(f"Fetched {result['fetched']} candidate games, upserted {result['upserted']}.")

    @app.cli.command("cleanup-reset-tokens")
    def cleanup_reset_tokens():
        """Deletes expired or already-used password reset tokens older than
        24h. An occasional maintenance command (e.g. via cron) — there's no
        in-process scheduler, and expired/used tokens are already rejected
        at lookup time regardless, so this is just housekeeping."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        deleted = (
            PasswordResetToken.query.filter(
                (PasswordResetToken.expires_at < cutoff) | (PasswordResetToken.used_at.isnot(None))
            )
            .filter(PasswordResetToken.created_at < cutoff)
            .delete(synchronize_session=False)
        )
        db.session.commit()
        click.echo(f"Deleted {deleted} expired/used password reset token(s).")
