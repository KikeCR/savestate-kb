"""add embedding vector to games

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-07-21 09:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = 'b3c4d5e6f7a8'
down_revision = 'a2b3c4d5e6f7'
branch_labels = None
depends_on = None

EMBEDDING_DIMENSIONS = 384


def upgrade():
    op.add_column('games', sa.Column('embedding', Vector(EMBEDDING_DIMENSIONS), nullable=True))
    # HNSW cosine index — a nice-to-have at this catalog's scale (thousands,
    # not millions, of rows), not a hard performance requirement. Built after
    # the column exists rather than inline so it doesn't block the add_column
    # on an exclusive lock for longer than necessary.
    op.execute(
        "CREATE INDEX ix_games_embedding_hnsw ON games "
        "USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_games_embedding_hnsw")
    op.drop_column('games', 'embedding')
