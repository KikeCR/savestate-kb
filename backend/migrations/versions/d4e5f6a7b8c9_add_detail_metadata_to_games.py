"""add detail metadata to games

Revision ID: d4e5f6a7b8c9
Revises: 60a3ed39a593
Create Date: 2026-07-23 09:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "d4e5f6a7b8c9"
down_revision = "60a3ed39a593"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("games", schema=None) as batch_op:
        batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("esrb_rating", sa.String(length=50), nullable=True))
        batch_op.add_column(
            sa.Column(
                "developers",
                postgresql.ARRAY(sa.String()),
                nullable=False,
                server_default="{}",
            )
        )
        batch_op.add_column(
            sa.Column(
                "publishers",
                postgresql.ARRAY(sa.String()),
                nullable=False,
                server_default="{}",
            )
        )
        batch_op.add_column(sa.Column("website", sa.String(length=500), nullable=True))
        batch_op.add_column(
            sa.Column("detail_fetched_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.alter_column("developers", server_default=None)
        batch_op.alter_column("publishers", server_default=None)


def downgrade():
    with op.batch_alter_table("games", schema=None) as batch_op:
        batch_op.drop_column("detail_fetched_at")
        batch_op.drop_column("website")
        batch_op.drop_column("publishers")
        batch_op.drop_column("developers")
        batch_op.drop_column("esrb_rating")
        batch_op.drop_column("description")
