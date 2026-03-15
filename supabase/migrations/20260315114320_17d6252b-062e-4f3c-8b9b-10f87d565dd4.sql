
-- Add expires_at column
ALTER TABLE photo_shoots
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');

-- Index for fast user listing
CREATE INDEX IF NOT EXISTS idx_photo_shoots_user_created
  ON photo_shoots(user_id, created_at DESC);
