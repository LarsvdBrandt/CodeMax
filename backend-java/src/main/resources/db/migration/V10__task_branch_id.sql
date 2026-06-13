ALTER TABLE tasks ADD COLUMN branch_id UUID REFERENCES project_branches(id) ON DELETE SET NULL;
