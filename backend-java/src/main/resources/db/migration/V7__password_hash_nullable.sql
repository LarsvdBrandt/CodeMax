-- Better Auth manages credentials in the account table (provider_id = 'credential').
-- The users table no longer needs password_hash to be NOT NULL.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
