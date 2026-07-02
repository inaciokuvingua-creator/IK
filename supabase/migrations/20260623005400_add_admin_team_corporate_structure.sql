-- ─── 1. Add role + permissions to admin_users ────────────────────────────────
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin'
    CHECK (role IN ('super_admin','admin','moderator','financeiro','marketplace','suporte')),
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_email text,
  ADD COLUMN IF NOT EXISTS invite_status text DEFAULT 'accepted'
    CHECK (invite_status IN ('pending','accepted','rejected'));

-- Upgrade existing admin to super_admin
UPDATE admin_users SET role = 'super_admin' WHERE username = 'admin';

-- ─── 2. Seed IK Finance super admin  (@Td200302) ──────────────────────────────
-- bcrypt hash of @Td200302 (12 rounds)
INSERT INTO admin_users (username, email, password_hash, nome, role)
VALUES (
  'ikfinance',
  'Inaciokuvingua@gmail.com',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHwGeQgmW',
  'IK Finance',
  'super_admin'
) ON CONFLICT (username) DO UPDATE SET
  nome = 'IK Finance',
  role = 'super_admin',
  email = 'Inaciokuvingua@gmail.com';

-- ─── 3. admin_roles ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE
    CHECK (slug IN ('super_admin','admin','moderator','financeiro','marketplace','suporte')),
  descricao   text,
  permissions jsonb NOT NULL DEFAULT '{}',
  cor         text NOT NULL DEFAULT '#6B7280',
  created_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_admin_roles" ON admin_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO admin_roles (nome, slug, descricao, permissions, cor) VALUES
  ('Super Admin',        'super_admin',  'Acesso total à plataforma',           '{"all":true}',                                                          '#EF4444'),
  ('Administrador',      'admin',        'Gerencia utilizadores e configurações','{"users":true,"settings":true,"logs":true,"financeiro":true}',           '#F59E0B'),
  ('Moderador',          'moderator',    'Modera conteúdo e utilizadores',       '{"users":true,"marketplace":true,"logs":true}',                          '#8B5CF6'),
  ('Equipe Financeira',  'financeiro',   'Acesso ao módulo financeiro',          '{"financeiro":true,"reports":true}',                                     '#10B981'),
  ('Equipe Marketplace', 'marketplace',  'Gere o marketplace',                   '{"marketplace":true,"stores":true,"products":true}',                     '#3B82F6'),
  ('Equipe Suporte',     'suporte',      'Suporte a utilizadores',               '{"users":true,"logs":true}',                                             '#6B7280')
ON CONFLICT (slug) DO NOTHING;

-- ─── 4. admin_team_invites ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_team_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  nome        text NOT NULL,
  role        text NOT NULL DEFAULT 'suporte'
    CHECK (role IN ('super_admin','admin','moderator','financeiro','marketplace','suporte')),
  department  text,
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status      text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','expired')),
  invited_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  expires_at  timestamptz DEFAULT (now() + interval '7 days'),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE admin_team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_team_invites" ON admin_team_invites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 5. admin_activity_logs (richer than admin_logs) ─────────────────────────
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_nome  text NOT NULL,
  admin_role  text,
  acao        text NOT NULL,
  modulo      text NOT NULL DEFAULT 'geral',
  entidade    text NOT NULL DEFAULT '-',
  entidade_id text,
  detalhes    jsonb,
  ip          text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_activity_logs" ON admin_activity_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 6. ik_company (IK Finance internal company) ─────────────────────────────
CREATE TABLE IF NOT EXISTS ik_company (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL DEFAULT 'IK Finance',
  descricao   text,
  logo_url    text,
  website     text,
  email       text,
  phone       text,
  address     text,
  founded_at  date,
  meta        jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE ik_company ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_ik_company" ON ik_company
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO ik_company (nome, descricao, email, phone, founded_at)
VALUES (
  'IK Finance',
  'Plataforma financeira digital criada para Angola e o mundo.',
  'Inaciokuvingua@gmail.com',
  '+244943339350',
  '2024-01-01'
) ON CONFLICT DO NOTHING;

-- ─── 7. ik_departments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ik_departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  descricao   text,
  cor         text NOT NULL DEFAULT '#6B7280',
  manager_id  uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE ik_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_ik_departments" ON ik_departments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO ik_departments (nome, descricao, cor) VALUES
  ('Administração',  'Gestão geral da empresa',                     '#EF4444'),
  ('Financeiro',     'Controle financeiro e contabilidade',         '#10B981'),
  ('Marketing',      'Marketing e crescimento',                     '#F59E0B'),
  ('Desenvolvimento','Engenharia de software e produto',            '#3B82F6'),
  ('Suporte',        'Suporte ao cliente',                          '#8B5CF6'),
  ('Segurança',      'Segurança da informação',                     '#EC4899'),
  ('Marketplace',    'Gestão do marketplace',                       '#06B6D4'),
  ('RH',             'Recursos humanos',                            '#84CC16')
ON CONFLICT DO NOTHING;

-- ─── 8. ik_projects ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ik_projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  descricao     text,
  status        text NOT NULL DEFAULT 'em_andamento'
    CHECK (status IN ('planejamento','em_andamento','concluido','pausado','cancelado')),
  prioridade    text NOT NULL DEFAULT 'media'
    CHECK (prioridade IN ('baixa','media','alta','critica')),
  department_id uuid REFERENCES ik_departments(id) ON DELETE SET NULL,
  responsavel_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  data_inicio   date,
  data_fim      date,
  progresso     integer NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  meta          jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE ik_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_ik_projects" ON ik_projects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 9. ik_internal_documents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ik_internal_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text NOT NULL,
  conteudo      text NOT NULL DEFAULT '',
  tipo          text NOT NULL DEFAULT 'documento'
    CHECK (tipo IN ('documento','politica','procedimento','relatorio','manual','outro')),
  department_id uuid REFERENCES ik_departments(id) ON DELETE SET NULL,
  autor_id      uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  visibilidade  text NOT NULL DEFAULT 'todos'
    CHECK (visibilidade IN ('todos','financeiro','dev','admin','super_admin')),
  tags          text[] DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE ik_internal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_ik_documents" ON ik_internal_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 10. ik_internal_chat ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ik_internal_chat (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  admin_nome    text NOT NULL,
  department_id uuid REFERENCES ik_departments(id) ON DELETE SET NULL,
  mensagem      text NOT NULL,
  tipo          text NOT NULL DEFAULT 'geral'
    CHECK (tipo IN ('geral','financeiro','dev','marketing','suporte','seguranca','marketplace','rh')),
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE ik_internal_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_ik_chat" ON ik_internal_chat
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 11. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id  ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ik_projects_status            ON ik_projects(status);
CREATE INDEX IF NOT EXISTS idx_ik_documents_department       ON ik_internal_documents(department_id);
CREATE INDEX IF NOT EXISTS idx_ik_chat_tipo                  ON ik_internal_chat(tipo);
CREATE INDEX IF NOT EXISTS idx_team_invites_token            ON admin_team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_status           ON admin_team_invites(status);
