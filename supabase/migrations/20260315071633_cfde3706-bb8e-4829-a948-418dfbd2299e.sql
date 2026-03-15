-- Remove duplicate notification triggers; notify_delivery_status_change covers all cases
DROP TRIGGER IF EXISTS notify_delivery_completed_trigger ON public.deliveries;
DROP TRIGGER IF EXISTS notify_revision_requested_trigger ON public.deliveries;
DROP TRIGGER IF EXISTS notify_delivery_approved_trigger ON public.deliveries;