ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS on_marketplace_purchase boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS on_marketplace_message boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS on_marketplace_payment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS on_marketplace_download boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS on_marketplace_review boolean NOT NULL DEFAULT true;