-- =====================================================
-- 2.1: Auto-assign editor (round-robin by load)
-- =====================================================
CREATE OR REPLACE FUNCTION assign_editor_to_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_editor_id UUID;
BEGIN
  SELECT e.id INTO v_editor_id
  FROM editors e
  WHERE e.status = 'available'
  ORDER BY (
    SELECT COUNT(*) 
    FROM deliveries d 
    WHERE d.editor_id = e.id 
    AND d.status IN ('pending', 'in_progress')
  ) ASC
  LIMIT 1;
  
  IF v_editor_id IS NOT NULL THEN
    NEW.editor_id := v_editor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS auto_assign_editor ON deliveries;
CREATE TRIGGER auto_assign_editor
  BEFORE INSERT ON deliveries
  FOR EACH ROW
  WHEN (NEW.editor_id IS NULL)
  EXECUTE FUNCTION assign_editor_to_delivery();

-- =====================================================
-- 2.2: Notification triggers
-- =====================================================

-- Notify client when delivery is completed (status -> review)
CREATE OR REPLACE FUNCTION notify_delivery_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.status = 'review' AND OLD.status != 'review' THEN
    SELECT up.user_id INTO v_user_id
    FROM user_projects up
    WHERE up.id = NEW.user_project_id;
    
    IF v_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_user_id,
        'delivery_completed',
        'Entrega Concluída! 🎉',
        'Sua entrega "' || NEW.title || '" está pronta para revisão',
        '/dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_delivery_completed ON deliveries;
CREATE TRIGGER trigger_notify_delivery_completed
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION notify_delivery_completed();

-- Notify editor when revision is requested
CREATE OR REPLACE FUNCTION notify_revision_requested()
RETURNS TRIGGER AS $$
DECLARE
  v_editor_user_id UUID;
BEGIN
  IF NEW.status = 'revision' AND OLD.status != 'revision' THEN
    SELECT e.user_id INTO v_editor_user_id
    FROM editors e
    WHERE e.id = NEW.editor_id;
    
    IF v_editor_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_editor_user_id,
        'revision_requested',
        'Revisão Solicitada',
        'Cliente solicitou revisão em "' || NEW.title || '"',
        '/editor'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_revision_requested ON deliveries;
CREATE TRIGGER trigger_notify_revision_requested
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION notify_revision_requested();

-- Notify editor when delivery is approved
CREATE OR REPLACE FUNCTION notify_delivery_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_editor_user_id UUID;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    SELECT e.user_id INTO v_editor_user_id
    FROM editors e
    WHERE e.id = NEW.editor_id;
    
    IF v_editor_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_editor_user_id,
        'delivery_approved',
        'Entrega Aprovada! ✅',
        'Cliente aprovou "' || NEW.title || '"',
        '/editor'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_delivery_approved ON deliveries;
CREATE TRIGGER trigger_notify_delivery_approved
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION notify_delivery_approved();

-- Notify client when project is assigned
CREATE OR REPLACE FUNCTION notify_project_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_project_name TEXT;
BEGIN
  SELECT project_name INTO v_project_name
  FROM custom_projects
  WHERE id = NEW.custom_project_id;
  
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    NEW.user_id,
    'project_assigned',
    'Projeto Configurado! 🎯',
    'Seu projeto "' || COALESCE(v_project_name, 'Novo Projeto') || '" foi configurado. Complete o onboarding para começar.',
    '/onboarding'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_project_assigned ON user_projects;
CREATE TRIGGER trigger_notify_project_assigned
  AFTER INSERT ON user_projects
  FOR EACH ROW
  EXECUTE FUNCTION notify_project_assigned();

-- =====================================================
-- 2.3: Quota reservation triggers
-- =====================================================

CREATE OR REPLACE FUNCTION reserve_quota_on_create()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_projects
  SET 
    youtube_reserved = CASE WHEN NEW.delivery_type = 'youtube_video' THEN youtube_reserved + 1 ELSE youtube_reserved END,
    instagram_reserved = CASE WHEN NEW.delivery_type = 'instagram_video' THEN instagram_reserved + 1 ELSE instagram_reserved END,
    thumbnails_reserved = CASE WHEN NEW.delivery_type = 'thumbnail' THEN thumbnails_reserved + 1 ELSE thumbnails_reserved END,
    covers_reserved = CASE WHEN NEW.delivery_type = 'cover' THEN covers_reserved + 1 ELSE covers_reserved END
  WHERE id = NEW.user_project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_reserve_quota ON deliveries;
CREATE TRIGGER trigger_reserve_quota
  AFTER INSERT ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION reserve_quota_on_create();

CREATE OR REPLACE FUNCTION approve_quota_on_approve()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE user_projects
    SET 
      youtube_approved = CASE WHEN NEW.delivery_type = 'youtube_video' THEN youtube_approved + 1 ELSE youtube_approved END,
      instagram_approved = CASE WHEN NEW.delivery_type = 'instagram_video' THEN instagram_approved + 1 ELSE instagram_approved END,
      thumbnails_approved = CASE WHEN NEW.delivery_type = 'thumbnail' THEN thumbnails_approved + 1 ELSE thumbnails_approved END,
      covers_approved = CASE WHEN NEW.delivery_type = 'cover' THEN covers_approved + 1 ELSE covers_approved END,
      youtube_reserved = CASE WHEN NEW.delivery_type = 'youtube_video' THEN GREATEST(0, youtube_reserved - 1) ELSE youtube_reserved END,
      instagram_reserved = CASE WHEN NEW.delivery_type = 'instagram_video' THEN GREATEST(0, instagram_reserved - 1) ELSE instagram_reserved END,
      thumbnails_reserved = CASE WHEN NEW.delivery_type = 'thumbnail' THEN GREATEST(0, thumbnails_reserved - 1) ELSE thumbnails_reserved END,
      covers_reserved = CASE WHEN NEW.delivery_type = 'cover' THEN GREATEST(0, covers_reserved - 1) ELSE covers_reserved END
    WHERE id = NEW.user_project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_approve_quota ON deliveries;
CREATE TRIGGER trigger_approve_quota
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION approve_quota_on_approve();

-- =====================================================
-- 2.4: Monthly quota reset function
-- =====================================================

CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
  UPDATE user_projects
  SET 
    youtube_reserved = 0,
    instagram_reserved = 0,
    thumbnails_reserved = 0,
    covers_reserved = 0,
    youtube_approved = 0,
    instagram_approved = 0,
    thumbnails_approved = 0,
    covers_approved = 0,
    current_period_start = current_period_end,
    current_period_end = current_period_end + INTERVAL '1 month'
  WHERE 
    current_period_end <= NOW()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;