"""add reviewed to activities action check

Revision ID: dcf782f17db1
Revises: 03f9900ebe27
Create Date: 2026-07-23 20:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "dcf782f17db1"
down_revision = "03f9900ebe27"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("activities", schema=None) as batch_op:
        batch_op.drop_constraint("ck_activities_action", type_="check")
        batch_op.create_check_constraint(
            "ck_activities_action",
            "action IN ('added', 'completed', 'rated', 'logged_year', 'reviewed')",
        )


def downgrade():
    with op.batch_alter_table("activities", schema=None) as batch_op:
        batch_op.drop_constraint("ck_activities_action", type_="check")
        batch_op.create_check_constraint(
            "ck_activities_action",
            "action IN ('added', 'completed', 'rated', 'logged_year')",
        )
