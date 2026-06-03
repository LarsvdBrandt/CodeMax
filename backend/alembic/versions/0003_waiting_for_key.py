"""add waiting_for_key task status

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'waiting_for_key'")


def downgrade():
    pass  # PostgreSQL does not support removing enum values
