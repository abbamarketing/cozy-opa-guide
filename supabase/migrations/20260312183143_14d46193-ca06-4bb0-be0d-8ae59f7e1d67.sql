
-- Use IF NOT EXISTS pattern for remaining triggers

-- assign_editor_to_delivery
DROP TRIGGER IF EXISTS auto_assign_editor ON public.deliveries;
CREATE TRIGGER auto_assign_editor
  BEFORE INSERT ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_editor_to_delivery();

-- reserve_quota_on_create
DROP TRIGGER IF EXISTS reserve_quota_trigger ON public.deliveries;
CREATE TRIGGER reserve_quota_trigger
  AFTER INSERT ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.reserve_quota_on_create();

-- approve_quota_on_approve
DROP TRIGGER IF EXISTS approve_quota_trigger ON public.deliveries;
CREATE TRIGGER approve_quota_trigger
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.approve_quota_on_approve();

-- notify_delivery_completed
DROP TRIGGER IF EXISTS notify_delivery_completed_trigger ON public.deliveries;
CREATE TRIGGER notify_delivery_completed_trigger
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_delivery_completed();

-- notify_revision_requested
DROP TRIGGER IF EXISTS notify_revision_requested_trigger ON public.deliveries;
CREATE TRIGGER notify_revision_requested_trigger
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_revision_requested();

-- notify_delivery_approved
DROP TRIGGER IF EXISTS notify_delivery_approved_trigger ON public.deliveries;
CREATE TRIGGER notify_delivery_approved_trigger
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_delivery_approved();

-- notify_project_assigned
DROP TRIGGER IF EXISTS notify_project_assigned_trigger ON public.user_projects;
CREATE TRIGGER notify_project_assigned_trigger
  AFTER INSERT ON public.user_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_assigned();

-- Enable realtime for notifications and deliveries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
  END IF;
END $$;
