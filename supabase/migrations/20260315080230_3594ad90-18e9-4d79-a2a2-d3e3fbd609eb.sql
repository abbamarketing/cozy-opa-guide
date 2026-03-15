-- Deactivate editor record instead of deleting
UPDATE editors
SET status = 'inactive', updated_at = now()
WHERE user_id = 'fa7a3a2d-348e-45bd-a44d-b0914bd37139';

-- Clean profile
UPDATE profiles
SET role = 'god', assigned_project_id = NULL, updated_at = now()
WHERE user_id = 'fa7a3a2d-348e-45bd-a44d-b0914bd37139';