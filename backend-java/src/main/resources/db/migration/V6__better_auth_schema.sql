-- Better Auth integration: add required columns to users table and create auth tables.
-- Passwords are migrated from users.password_hash → account.password (both BCrypt, compatible).

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS name            VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS image           TEXT,
    ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW();

-- Seed name from full_name for existing users
UPDATE users SET name = full_name WHERE full_name IS NOT NULL AND name IS NULL;

-- Better Auth session table
CREATE TABLE IF NOT EXISTS session (
    id           TEXT        PRIMARY KEY,
    expires_at   TIMESTAMPTZ NOT NULL,
    token        TEXT        NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address   TEXT,
    user_agent   TEXT,
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_token   ON session(token);

-- Better Auth account table (stores credentials per provider)
CREATE TABLE IF NOT EXISTS account (
    id                          TEXT        PRIMARY KEY,
    account_id                  TEXT        NOT NULL,
    provider_id                 TEXT        NOT NULL,
    user_id                     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token                TEXT,
    refresh_token               TEXT,
    id_token                    TEXT,
    access_token_expires_at     TIMESTAMPTZ,
    refresh_token_expires_at    TIMESTAMPTZ,
    scope                       TEXT,
    password                    TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON account(user_id);

-- Migrate existing BCrypt password hashes into the account table.
-- Better Auth reads password from account where provider_id = 'credential'.
INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT
    gen_random_uuid()::text,
    email,
    'credential',
    id,
    password_hash,
    created_at,
    created_at
FROM users
WHERE password_hash IS NOT NULL AND password_hash <> ''
ON CONFLICT DO NOTHING;

-- Better Auth verification table (email verification + password reset tokens)
CREATE TABLE IF NOT EXISTS verification (
    id           TEXT        PRIMARY KEY,
    identifier   TEXT        NOT NULL,
    value        TEXT        NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
