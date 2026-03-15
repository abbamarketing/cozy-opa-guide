ALTER TABLE public.photo_shoots DROP CONSTRAINT IF EXISTS photo_shoots_scenario_check;
ALTER TABLE public.photo_shoots ADD CONSTRAINT photo_shoots_scenario_check CHECK (scenario IN (
  'executive_office', 'startup_workspace', 'boardroom', 'consulting_office', 'outdoor_business',
  'studio', 'clinic', 'office', 'outdoor',
  'outdoor_rooftop', 'studio_editorial', 'fashion_dark_editorial', 'luxury_hotel_lobby', 'fashion_street',
  'golden_hour_outdoor', 'cafe_lifestyle', 'beach_sunset', 'forest_nature',
  'neon_cyberpunk', 'vintage_film', 'moody_warehouse', 'studio_bw',
  'home_office_creator', 'wellness_spa', 'urban_lifestyle'
));