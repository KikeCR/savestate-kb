"""add year_played to user_game_entries

Revision ID: 9e88e609dd33
Revises: 1fe0ead60839
Create Date: 2026-07-17 18:07:15.066973

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9e88e609dd33'
down_revision = '1fe0ead60839'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user_game_entries', schema=None) as batch_op:
        batch_op.add_column(sa.Column('year_played', sa.Integer(), nullable=True))
        batch_op.create_check_constraint(
            'ck_user_game_entries_year_played',
            'year_played IS NULL OR year_played >= 1970',
        )


def downgrade():
    with op.batch_alter_table('user_game_entries', schema=None) as batch_op:
        batch_op.drop_constraint('ck_user_game_entries_year_played', type_='check')
        batch_op.drop_column('year_played')
