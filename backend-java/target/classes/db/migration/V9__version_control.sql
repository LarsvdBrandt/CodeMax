CREATE TABLE project_branches (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    parent_branch_id  UUID REFERENCES project_branches(id),
    container_id      TEXT,
    preview_port      INTEGER,
    status            VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by        UUID NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, name)
);

CREATE INDEX idx_project_branches_project_id ON project_branches(project_id);

CREATE TABLE project_commits (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    branch_id      UUID NOT NULL REFERENCES project_branches(id) ON DELETE CASCADE,
    task_id        UUID REFERENCES tasks(id) ON DELETE SET NULL,
    message        TEXT NOT NULL DEFAULT '',
    created_by     UUID NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_commits_branch_id  ON project_commits(branch_id);
CREATE INDEX idx_project_commits_project_id ON project_commits(project_id);

CREATE TABLE project_commit_files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commit_id   UUID NOT NULL REFERENCES project_commits(id) ON DELETE CASCADE,
    file_path   TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_project_commit_files_commit_id ON project_commit_files(commit_id);

CREATE TABLE project_pull_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_branch_id  UUID NOT NULL REFERENCES project_branches(id),
    target_branch_id  UUID NOT NULL REFERENCES project_branches(id),
    title             VARCHAR(255) NOT NULL,
    description       TEXT NOT NULL DEFAULT '',
    status            VARCHAR(50) NOT NULL DEFAULT 'open',
    created_by        UUID NOT NULL REFERENCES users(id),
    reviewed_by       UUID REFERENCES users(id),
    reviewed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_pull_requests_project_id ON project_pull_requests(project_id);
