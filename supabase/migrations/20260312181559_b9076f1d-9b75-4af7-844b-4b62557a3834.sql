-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_custom_projects_updated_at ON custom_projects;
DROP TRIGGER IF EXISTS update_user_projects_updated_at ON user_projects;
DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;
DROP TRIGGER IF EXISTS update_editors_updated_at ON editors;
DROP TRIGGER IF EXISTS update_onboarding_briefings_updated_at ON onboarding_briefings;

-- Create triggers on all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_projects_updated_at
  BEFORE UPDATE ON custom_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_projects_updated_at
  BEFORE UPDATE ON user_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_editors_updated_at
  BEFORE UPDATE ON editors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_briefings_updated_at
  BEFORE UPDATE ON onboarding_briefings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();