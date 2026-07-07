-- Add recommended flag to goal_item_quotes and alerts table

ALTER TABLE IF EXISTS goal_item_quotes
  ADD COLUMN IF NOT EXISTS recommended boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  cofre_id uuid NULL,
  tipo text NOT NULL,
  titulo text NOT NULL,
  corpo text NULL,
  lida boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_cofre ON alerts(cofre_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
