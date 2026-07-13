/*
# Painel Administrativo IK Finance

## Resumo
Cria as tabelas necessárias para o painel administrativo: autenticação de admins,
logs de atividade e configurações do sistema.

## Novas Tabelas

### admin_users
Contas de administradores com senhas hasheadas (bcrypt).
- id (uuid, PK)
- username (text, unique) — nome de login
- email (text, unique)
- password_hash (text) — bcrypt hash da senha
- nome (text) — nome de exibição
- ativo (bool) — conta ativa/suspensa
- last_login (timestamptz, nullable)
- created_at (timestamptz)

### admin_logs
Registro de todas as ações administrativas para auditoria.
- id (uuid, PK)
- admin_id (uuid, FK → admin_users)
- admin_nome (text) — snapshot do nome no momento da ação
- acao (text) — tipo de ação: 'login', 'user_edit', 'user_suspend', 'user_delete', 'record_edit', 'record_delete', 'settings_change'
- entidade (text) — tabela ou entidade afetada
- entidade_id (text, nullable) — ID do registro afetado
- detalhes (jsonb, nullable) — dados adicionais da ação
- ip (text, nullable)
- created_at (timestamptz)

### system_settings
Configurações globais da plataforma (chave-valor).
- id (uuid, PK)
- chave (text, unique) — nome da configuração
- valor (text) — valor da configuração
- descricao (text, nullable)
- updated_at (timestamptz)
- updated_by (uuid, nullable, FK → admin_users)

## Segurança
- RLS habilitado em todas as tabelas
- Apenas service_role pode ler/escrever (acesso somente via edge function)
- Nenhum acesso público ou de usuários autenticados comuns
*/

-- ─── admin_users ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL UNIQUE,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  nome          text NOT NULL DEFAULT 'Administrador',
  ativo         boolean NOT NULL DEFAULT true,
  last_login    timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only service_role (edge functions) can access admin_users
DROP POLICY IF EXISTS "service_role_admin_users" ON admin_users;
CREATE POLICY "service_role_admin_users" ON admin_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── admin_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_nome   text NOT NULL,
  acao         text NOT NULL,
  entidade     text NOT NULL DEFAULT '-',
  entidade_id  text,
  detalhes     jsonb,
  ip           text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_admin_logs" ON admin_logs;
CREATE POLICY "service_role_admin_logs" ON admin_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── system_settings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave       text NOT NULL UNIQUE,
  valor       text NOT NULL DEFAULT '',
  descricao   text,
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_system_settings" ON system_settings;
CREATE POLICY "service_role_system_settings" ON system_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── Seed default settings ────────────────────────────────────────────────────
INSERT INTO system_settings (chave, valor, descricao) VALUES
  ('platform_name',    'IK Finance',                                    'Nome da plataforma'),
  ('platform_tagline', 'Gestor Financeiro Inteligente',                  'Slogan da plataforma'),
  ('maintenance_mode', 'false',                                          'Modo de manutenção'),
  ('global_message',   '',                                               'Mensagem global para todos os usuários'),
  ('plan_free_label',  'Gratuito',                                       'Rótulo do plano gratuito'),
  ('plan_pro_price',   '2500',                                           'Preço do plano Pro (Kz/mês)'),
  ('plan_pro_label',   'Pro',                                            'Rótulo do plano Pro'),
  ('support_email',    'suporte@ikfinance.app',                          'E-mail de suporte')
ON CONFLICT (chave) DO NOTHING;

-- ─── Seed default admin account ──────────────────────────────────────────────
-- Password: Admin@IKFinance2024 (bcrypt hash)
-- IMPORTANT: Change this password immediately after first login
INSERT INTO admin_users (
  username,
  email,
  password_hash,
  nome,
  role
) VALUES (
  'admin',
  'admin@ikfinance.app',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLxNgCw1R6s4DGe',
  'Inácio Kuvingua',
  'super_admin'
)
ON CONFLICT (username) DO NOTHING;
