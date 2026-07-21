"""add catalog metadata to games

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-07-21 09:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a2b3c4d5e6f7'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('games', schema=None) as batch_op:
        batch_op.add_column(sa.Column('metacritic', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('rawg_rating', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('rawg_ratings_count', sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column(
                'tags',
                postgresql.ARRAY(sa.String()),
                nullable=False,
                server_default='{}',
            )
        )
        batch_op.add_column(sa.Column('embedding_text', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('synced_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.alter_column('tags', server_default=None)


def downgrade():
    with op.batch_alter_table('games', schema=None) as batch_op:
        batch_op.drop_column('synced_at')
        batch_op.drop_column('embedding_text')
        batch_op.drop_column('tags')
        batch_op.drop_column('rawg_ratings_count')
        batch_op.drop_column('rawg_rating')
        batch_op.drop_column('metacritic')
