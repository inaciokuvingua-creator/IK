/*
# Sistema de Notificações — IK Finance

## Resumo
Cria as tabelas para suportar notificações push (Web Push / PWA) e por e-mail.

## Novas Tabelas

### push_subscriptions
Armazena as assinaturas de Web Push de cada dispositivo de cada usuário.
- id (uuid, PK)
- user_id (uuid, FK → auth.users) — dono da assinatura
- endpoint (text) — URL única do serviço push do dispositivo
- p256dh (text) — chave pública de criptografia da assinatura
- auth_key (text) — segredo de autenticação da assinatura
- user_agent (text, nullable) — identificador do dispositivo/browser
- created_at (timestamptz)

### notification_preferences
Preferências de notificação por usuário (1 linha por user_id).
- id (uuid, PK)
- user_id (uuid, FK → auth.users, UNIQUE)
- push_enabled (bool, default true) — notificações push ativas
- email_enabled (bool, default true) — notificações por e-mail ativas
- on_transaction (bool, default true) — notificar ao criar/editar/excluir transação
- on_cofre (bool, default true) — notificar ao criar/editar cofre
- on_negocio (bool, default true) — notificar ao criar/editar negócio
- on_patrimonio (bool, default true) — notificar ao criar/editar patrimônio
- on_meta_reached (bool, default true) — notificar ao atingir meta de cofre
- daily_summary (bool, default false) — resumo diário por e-mail
- created_at (timestamptz)
- updated_at (timestamptz)

### notification_log
Histórico de notificações enviadas ao usuário.
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- tipo (text) — 'push' | 'email'
- titulo (text)
- corpo (text)
- lida (bool, default false)
- created_at (timestamptz)

## Segurança
- RLS habilitado em todas as tabelas
- Usuário autenticado acessa apenas os seus próprios registros
*/

-- ─── push_subscriptions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth_key   text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_push_sub"  ON push_subscriptions;
DROP POLICY IF EXISTS "insert_own_push_sub"  ON push_subscriptions;
DROP POLICY IF EXISTS "delete_own_push_sub"  ON push_subscriptions;

CREATE POLICY "select_own_push_sub" ON push_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_push_sub" ON push_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_push_sub" ON push_subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ─── notification_preferences ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled   boolean NOT NULL DEFAULT true,
  email_enabled  boolean NOT NULL DEFAULT true,
  on_transaction boolean NOT NULL DEFAULT true,
  on_cofre       boolean NOT NULL DEFAULT true,
  on_negocio     boolean NOT NULL DEFAULT true,
  on_patrimonio  boolean NOT NULL DEFAULT true,
  on_meta_reached boolean NOT NULL DEFAULT true,
  daily_summary  boolean NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notif_prefs"  ON notification_preferences;
DROP POLICY IF EXISTS "insert_own_notif_prefs"  ON notification_preferences;
DROP POLICY IF EXISTS "update_own_notif_prefs"  ON notification_preferences;

CREATE POLICY "select_own_notif_prefs" ON notification_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_notif_prefs" ON notification_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_notif_prefs" ON notification_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── notification_log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo       text NOT NULL CHECK (tipo IN ('push','email','in_app')),
  titulo     text NOT NULL,
  corpo      text NOT NULL,
  lida       boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notif_log"  ON notification_log;
DROP POLICY IF EXISTS "insert_own_notif_log"  ON notification_log;
DROP POLICY IF EXISTS "update_own_notif_log"  ON notification_log;
DROP POLICY IF EXISTS "delete_own_notif_log"  ON notification_log;

CREATE POLICY "select_own_notif_log" ON notification_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_notif_log" ON notification_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_notif_log" ON notification_log FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_notif_log" ON notification_log FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Allow edge function (service role) to insert into notification_log on behalf of user
DROP POLICY IF EXISTS "service_insert_notif_log" ON notification_log;
CREATE POLICY "service_insert_notif_log" ON notification_log FOR INSERT
  TO service_role WITH CHECK (true);

-- Allow edge function (service role) to read push_subscriptions
DROP POLICY IF EXISTS "service_read_push_sub" ON push_subscriptions;
CREATE POLICY "service_read_push_sub" ON push_subscriptions FOR SELECT
  TO service_role USING (true);

-- Allow edge function (service role) to read notification_preferences
DROP POLICY IF EXISTS "service_read_notif_prefs" ON notification_preferences;
CREATE POLICY "service_read_notif_prefs" ON notification_preferences FOR SELECT
  TO service_role USING (true);

-- Enable realtime on notification_log so in-app notifications appear instantly
ALTER PUBLICATION supabase_realtime ADD TABLE notification_log;
