ALTER TABLE user_projects
  ADD COLUMN IF NOT EXISTS subscription_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS custom_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

CREATE INDEX IF NOT EXISTS idx_user_projects_subscription_slug ON user_projects(subscription_slug);
CREATE INDEX IF NOT EXISTS idx_user_projects_custom_slug ON user_projects(custom_slug);