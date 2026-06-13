CREATE TABLE project_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    invite_email    VARCHAR(255) NOT NULL,
    invite_token    VARCHAR(255) UNIQUE,
    role            VARCHAR(50) NOT NULL DEFAULT 'observer',
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    invited_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, invite_email)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id    ON project_members(user_id);
CREATE INDEX idx_project_members_token      ON project_members(invite_token);
