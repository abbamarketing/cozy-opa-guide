ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;