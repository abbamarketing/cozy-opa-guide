
-- Drop duplicate triggers on user_projects
DROP TRIGGER IF EXISTS tr_notify_project_assigned ON user_projects;
DROP TRIGGER IF EXISTS trigger_notify_project_assigned ON user_projects;

-- Drop duplicate triggers on deliveries
DROP TRIGGER IF EXISTS tr_approve_quota ON deliveries;
DROP TRIGGER IF EXISTS trigger_approve_quota ON deliveries;
DROP TRIGGER IF EXISTS tr_assign_editor ON deliveries;
DROP TRIGGER IF EXISTS tr_reserve_quota ON deliveries;
DROP TRIGGER IF EXISTS trigger_reserve_quota ON deliveries;
DROP TRIGGER IF EXISTS trigger_notify_delivery_completed ON deliveries;
DROP TRIGGER IF EXISTS trigger_notify_delivery_approved ON deliveries;
DROP TRIGGER IF EXISTS trigger_notify_revision_requested ON deliveries;

-- Clean up duplicate notifications (use text cast for uuid)
DELETE FROM notifications n
WHERE EXISTS (
  SELECT 1 FROM notifications n2
  WHERE n2.user_id = n.user_id
    AND n2.type = n.type
    AND n2.title = n.title
    AND n2.message = n.message
    AND DATE_TRUNC('minute', n2.created_at) = DATE_TRUNC('minute', n.created_at)
    AND n2.id::text < n.id::text
);
