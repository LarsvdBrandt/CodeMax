ALTER TABLE users
    ADD COLUMN full_name       VARCHAR(255),
    ADD COLUMN company_name    VARCHAR(255),
    ADD COLUMN company_address TEXT,
    ADD COLUMN company_city    VARCHAR(255),
    ADD COLUMN company_country VARCHAR(255),
    ADD COLUMN website         VARCHAR(512),
    ADD COLUMN bio             TEXT;

CREATE TABLE user_api_keys (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    service    VARCHAR(100) NOT NULL DEFAULT 'custom',
    key_value  TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
