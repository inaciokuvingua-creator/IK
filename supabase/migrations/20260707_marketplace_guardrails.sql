CREATE TABLE IF NOT EXISTS marketplace_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('product','store','review','message','order')),
  entity_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE marketplace_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mr_select_own" ON marketplace_reports;
DROP POLICY IF EXISTS "mr_insert_own" ON marketplace_reports;
DROP POLICY IF EXISTS "mr_service" ON marketplace_reports;
CREATE POLICY "mr_select_own" ON marketplace_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "mr_insert_own" ON marketplace_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "mr_service" ON marketplace_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS marketplace_moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('product','store','review','message','proof','upload')),
  entity_id uuid NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','escalated')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  source text NOT NULL DEFAULT 'system',
  summary text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE marketplace_moderation_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mmq_select_own" ON marketplace_moderation_queue;
DROP POLICY IF EXISTS "mmq_insert_own" ON marketplace_moderation_queue;
DROP POLICY IF EXISTS "mmq_service" ON marketplace_moderation_queue;
CREATE POLICY "mmq_select_own" ON marketplace_moderation_queue FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "mmq_insert_own" ON marketplace_moderation_queue FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);
CREATE POLICY "mmq_service" ON marketplace_moderation_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS marketplace_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  window_key text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  blocked_until timestamptz,
  last_attempt_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (user_id, action, window_key)
);

ALTER TABLE marketplace_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mrl_select_own" ON marketplace_rate_limits;
DROP POLICY IF EXISTS "mrl_insert_own" ON marketplace_rate_limits;
DROP POLICY IF EXISTS "mrl_update_own" ON marketplace_rate_limits;
DROP POLICY IF EXISTS "mrl_service" ON marketplace_rate_limits;
CREATE POLICY "mrl_select_own" ON marketplace_rate_limits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "mrl_insert_own" ON marketplace_rate_limits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "mrl_update_own" ON marketplace_rate_limits FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "mrl_service" ON marketplace_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_marketplace_reports_status ON marketplace_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_queue_status ON marketplace_moderation_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_rate_limits_user_action ON marketplace_rate_limits(user_id, action, last_attempt_at DESC);