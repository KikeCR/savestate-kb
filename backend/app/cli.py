import click

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
