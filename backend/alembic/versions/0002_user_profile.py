"""user profile fields and api keys table

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def _col_exists(conn, table, col):
    r = conn.execute(sa.text(f"SELECT 1 FROM information_schema.columns WHERE table_name='{table}' AND column_name='{col}'"))
    return r.fetchone() is not None


def upgrade():
    bind = op.get_bind()
    for col, typ in [
        ("full_name",       sa.String(255)),
        ("company_name",    sa.String(255)),
        ("company_address", sa.Text()),
        ("company_city",    sa.String(255)),
        ("company_country", sa.String(255)),
        ("website",         sa.String(512)),
        ("bio",             sa.Text()),
    ]:
        if not _col_exists(bind, "users", col):
            op.add_column("users", sa.Column(col, typ, nullable=True))

    bind.execute(sa.text(
        "CREATE TABLE IF NOT EXISTS user_api_keys ("
        "id UUID NOT NULL, user_id UUID NOT NULL, name VARCHAR(255) NOT NULL, "
        "service VARCHAR(100) DEFAULT 'custom' NOT NULL, key_value TEXT NOT NULL, "
        "created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(), "
        "PRIMARY KEY (id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"
    ))
    return  # old create_table block removed

    op.create_table(
        "user_api_keys",
        sa.Column("id",         postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id",    postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name",       sa.String(255), nullable=False),
        sa.Column("service",    sa.String(100), nullable=False, server_default="custom"),
        sa.Column("key_value",  sa.Text(),       nullable=False),
        sa.Column("created_at", sa.DateTime(),   server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("user_api_keys")
    for col in ["full_name","company_name","company_address","company_city","company_country","website","bio"]:
        op.drop_column("users", col)
