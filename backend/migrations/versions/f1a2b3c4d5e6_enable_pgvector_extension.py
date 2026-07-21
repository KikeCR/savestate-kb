"""enable pgvector extension

Revision ID: f1a2b3c4d5e6
Revises: a68e57e43895
Create Date: 2026-07-21 09:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e6'
down_revision = 'a68e57e43895'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')


def downgrade():
    op.execute('DROP EXTENSION IF EXISTS vector')
