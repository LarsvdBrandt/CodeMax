-- Convert PostgreSQL enum types to VARCHAR so JPA @Enumerated(EnumType.STRING) works cleanly
-- Must drop defaults first because they reference the enum type
ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;
ALTER TABLE tasks    ALTER COLUMN status DROP DEFAULT;

ALTER TABLE projects ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
ALTER TABLE tasks    ALTER COLUMN status TYPE VARCHAR(50) USING status::text;

ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'idle';
ALTER TABLE tasks    ALTER COLUMN status SET DEFAULT 'queued';

DROP TYPE IF EXISTS project_status;
DROP TYPE IF EXISTS task_status;
