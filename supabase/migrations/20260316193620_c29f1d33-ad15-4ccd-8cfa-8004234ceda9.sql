UPDATE user_projects
SET monthly_quota = CASE subscription_tier
  WHEN 'standard'  THEN 4
  WHEN 'pro'       THEN 8
  WHEN 'business'  THEN 16
  WHEN 'premium'   THEN 30
  WHEN 'agency'    THEN 60
  ELSE 4
END
WHERE client_type = 'subscription'
AND monthly_quota IS NULL;