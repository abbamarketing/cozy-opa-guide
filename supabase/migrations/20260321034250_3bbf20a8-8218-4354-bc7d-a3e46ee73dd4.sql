
INSERT INTO custom_projects (project_name, custom_slug, monthly_value, deadline, payment_frequency, max_revisions, youtube_videos, instagram_videos, include_thumbnails, include_covers, include_capture, include_script, created_by, description)
VALUES
  ('AbbaVideo Standard', 'abbavideo_standard', 490, '72h', 'monthly', 2, 0, 1, false, false, false, false, 'fa7a3a2d-348e-45bd-a44d-b0914bd37139', 'Plano Standard — Entrega em 72h úteis'),
  ('AbbaVideo Pro', 'abbavideo_pro', 660, '48h', 'monthly', 2, 0, 1, false, false, false, false, 'fa7a3a2d-348e-45bd-a44d-b0914bd37139', 'Plano Pro — Entrega em 48h úteis'),
  ('AbbaVideo Business', 'abbavideo_business', 1100, '24h', 'monthly', 2, 0, 1, false, false, false, false, 'fa7a3a2d-348e-45bd-a44d-b0914bd37139', 'Plano Business — Entrega em 24h úteis'),
  ('AbbaVideo Premium', 'abbavideo_premium', 2970, '24h', 'monthly', 2, 0, 1, false, false, false, false, 'fa7a3a2d-348e-45bd-a44d-b0914bd37139', 'Plano Premium — Entrega em 8h úteis'),
  ('AbbaVideo Agency', 'abbavideo_agency', 5590, '24h', 'monthly', 2, 0, 1, false, false, false, false, 'fa7a3a2d-348e-45bd-a44d-b0914bd37139', 'Plano Agency — Entrega em 4h úteis')
ON CONFLICT DO NOTHING;
