-- plan_requests: manual subscription requests with admin approval flow
CREATE TABLE IF NOT EXISTS plan_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email   text NOT NULL,
  user_nome    text,
  plan         text NOT NULL CHECK (plan IN ('premium','business','enterprise')),
  billing      text NOT NULL DEFAULT 'mensal' CHECK (billing IN ('mensal','anual')),
  preco        numeric(10,2) NOT NULL DEFAULT 0,
  moeda        text NOT NULL DEFAULT 'AOA',
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected','cancelled')),
  mensagem     text,                    -- optional message from user
  admin_nota   text,                    -- admin rejection/approval note
  admin_id     uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_nome   text,
  reviewed_at  timestamptz,
  whatsapp     text,                    -- user's whatsapp if provided
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE plan_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert and read their own requests
CREATE POLICY "users_insert_plan_requests" ON plan_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_select_plan_requests" ON plan_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users_update_cancel_plan_requests" ON plan_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Service role (admin edge function) has full access
CREATE POLICY "service_role_plan_requests" ON plan_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_plan_requests_status     ON plan_requests(status);
CREATE INDEX IF NOT EXISTS idx_plan_requests_user_id    ON plan_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_requests_created_at ON plan_requests(created_at DESC);
