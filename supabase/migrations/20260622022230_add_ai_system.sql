-- ─── ai_conversations ─────────────────────────────────────────────────────────
-- Stores AI chat sessions and message history per user
CREATE TABLE IF NOT EXISTS ai_conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo     text NOT NULL DEFAULT 'Conversa',
  mensagens  jsonb NOT NULL DEFAULT '[]',
  contexto   text NOT NULL DEFAULT 'geral', -- 'geral' | 'financeiro' | 'empresarial' | 'marketplace'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_ai" ON ai_conversations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_ai" ON ai_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_ai" ON ai_conversations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_ai" ON ai_conversations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "service_ai" ON ai_conversations FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ─── ai_usage_log ──────────────────────────────────────────────────────────────
-- Tracks AI usage for owner monitoring
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contexto     text NOT NULL DEFAULT 'geral',
  tokens_in    integer DEFAULT 0,
  tokens_out   integer DEFAULT 0,
  modelo       text DEFAULT 'gpt-4o-mini',
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_ai_log" ON ai_usage_log FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ─── Seed AI settings into system_settings ─────────────────────────────────────
INSERT INTO system_settings (chave, valor, descricao) VALUES
  ('ai_enabled',        'true',            'IA global ativa/inativa'),
  ('ai_name',           'IK Finance AI',   'Nome do assistente de IA'),
  ('ai_persona',        'Sou o IK Finance AI, seu assistente inteligente de finanças, negócios e marketplace. Fui criado para ajudá-lo a tomar melhores decisões financeiras, organizar sua empresa e expandir seus negócios na plataforma IK Finance.', 'Persona/instrução do assistente'),
  ('ai_model',          'gpt-4o-mini',     'Modelo de IA a usar'),
  ('ai_max_tokens',     '1024',            'Máximo de tokens por resposta'),
  ('ai_daily_limit',    '50',              'Mensagens por dia por usuário (plano free)'),
  ('ai_premium_limit',  '500',             'Mensagens por dia (plano premium+)')
ON CONFLICT (chave) DO NOTHING;
