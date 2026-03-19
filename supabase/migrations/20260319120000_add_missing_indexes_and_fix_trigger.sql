-- Add missing indexes for query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_messages_delivery_id ON delivery_messages(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_revisions_delivery_id ON delivery_revisions(delivery_id);

-- Fix: delivery_messages has an updated_at trigger but no updated_at column
ALTER TABLE delivery_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
