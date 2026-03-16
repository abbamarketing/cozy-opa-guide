-- Backfill client_type for existing custom projects
UPDATE user_projects
SET client_type = 'custom'
WHERE client_type IS NULL
AND custom_project_id IS NOT NULL;