create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (user_id, email, full_name, display_name, preferred_language, idioma)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'pt'),
    coalesce(new.raw_user_meta_data ->> 'idioma', 'pt')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql;

create or replace function public.ensure_notification_preferences()
returns trigger as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql;

create table if not exists public.user_profiles (
  user_id uuid primary key,
  email text,
  username text,
  nome text,
  full_name text,
  display_name text,
  avatar_url text,
  phone text,
  birth_date date,
  country text,
  city text,
  bio text,
  public_bio text,
  preferred_language text default 'pt',
  idioma text default 'pt',
  profile_completion integer default 10,
  security_level text default 'standard',
  two_factor_enabled boolean default false,
  suspicious_login_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_identity_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_number text not null,
  issuer_country text not null,
  issued_at date,
  expires_at date,
  document_url text,
  verification_status text default 'pendente',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_security_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer_hash text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_method text default 'password',
  device_name text,
  device_id text,
  user_agent text,
  location_label text,
  timezone text,
  success boolean default true,
  suspicious boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text,
  platform text,
  browser text,
  last_seen_at timestamptz default now(),
  last_location text,
  trusted boolean default true,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, device_id)
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  push_enabled boolean default true,
  email_enabled boolean default true,
  on_transaction boolean default true,
  on_cofre boolean default true,
  on_negocio boolean default true,
  on_patrimonio boolean default true,
  on_meta_reached boolean default true,
  on_marketplace_purchase boolean default true,
  on_marketplace_message boolean default true,
  on_marketplace_payment boolean default true,
  on_marketplace_download boolean default true,
  on_marketplace_review boolean default true,
  daily_summary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text default 'in_app',
  titulo text not null,
  corpo text not null,
  lida boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text,
  auth_key text,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, endpoint)
);

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  type text default 'direct',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.chat_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'member',
  last_read_at timestamptz,
  left_at timestamptz,
  created_at timestamptz default now(),
  unique (conversation_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  type text default 'text',
  content text,
  media_url text,
  media_name text,
  media_mime text,
  media_size bigint,
  created_at timestamptz default now()
);

drop trigger if exists trg_set_updated_at on public.user_profiles;
drop trigger if exists trg_handle_new_user on auth.users;
drop trigger if exists trg_ensure_notification_preferences on auth.users;

create trigger trg_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create trigger trg_handle_new_user
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger trg_ensure_notification_preferences
after insert on auth.users
for each row execute function public.ensure_notification_preferences();

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('identity-documents', 'identity-documents', true),
  ('chat-media', 'chat-media', true),
  ('marketplace-media', 'marketplace-media', true)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'public_read_access_for_app_buckets'
  ) then
    create policy "public_read_access_for_app_buckets"
    on storage.objects
    for select
    using (bucket_id in ('avatars', 'identity-documents', 'chat-media', 'marketplace-media'));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated_upload_app_files'
  ) then
    create policy "authenticated_upload_app_files"
    on storage.objects
    for insert
    with check (
      bucket_id in ('avatars', 'identity-documents', 'chat-media', 'marketplace-media')
      and auth.role() = 'authenticated'
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated_update_app_files'
  ) then
    create policy "authenticated_update_app_files"
    on storage.objects
    for update
    using (
      bucket_id in ('avatars', 'identity-documents', 'chat-media', 'marketplace-media')
      and auth.role() = 'authenticated'
    )
    with check (
      bucket_id in ('avatars', 'identity-documents', 'chat-media', 'marketplace-media')
      and auth.role() = 'authenticated'
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated_delete_app_files'
  ) then
    create policy "authenticated_delete_app_files"
    on storage.objects
    for delete
    using (
      bucket_id in ('avatars', 'identity-documents', 'chat-media', 'marketplace-media')
      and auth.role() = 'authenticated'
    );
  end if;
end
$$;

CREATE TABLE IF NOT EXISTS cofres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  saldo numeric(15,2) NOT NULL DEFAULT 0,
  cor text NOT NULL DEFAULT '#3B82F6',
  icone text NOT NULL DEFAULT 'vault',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cofres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cofres" ON cofres;
CREATE POLICY "select_own_cofres" ON cofres FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_cofres" ON cofres;
CREATE POLICY "insert_own_cofres" ON cofres FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_cofres" ON cofres;
CREATE POLICY "update_own_cofres" ON cofres FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_cofres" ON cofres;
CREATE POLICY "delete_own_cofres" ON cofres FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS negocios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  categoria text NOT NULL DEFAULT 'outros',
  receita_mensal numeric(15,2) NOT NULL DEFAULT 0,
  despesa_mensal numeric(15,2) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_negocios" ON negocios;
CREATE POLICY "select_own_negocios" ON negocios FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_negocios" ON negocios;
CREATE POLICY "insert_own_negocios" ON negocios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_negocios" ON negocios;
CREATE POLICY "update_own_negocios" ON negocios FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_negocios" ON negocios;
CREATE POLICY "delete_own_negocios" ON negocios FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS patrimonio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'outros',
  valor_aquisicao numeric(15,2) NOT NULL DEFAULT 0,
  valor_atual numeric(15,2) NOT NULL DEFAULT 0,
  data_aquisicao date,
  descricao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patrimonio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_patrimonio" ON patrimonio;
CREATE POLICY "select_own_patrimonio" ON patrimonio FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_patrimonio" ON patrimonio;
CREATE POLICY "insert_own_patrimonio" ON patrimonio FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_patrimonio" ON patrimonio;
CREATE POLICY "update_own_patrimonio" ON patrimonio FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_patrimonio" ON patrimonio;
CREATE POLICY "delete_own_patrimonio" ON patrimonio FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cofre_id uuid REFERENCES cofres(id) ON DELETE SET NULL,
  negocio_id uuid REFERENCES negocios(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor numeric(15,2) NOT NULL,
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'outros',
  data_transacao date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transacoes" ON transacoes;
CREATE POLICY "select_own_transacoes" ON transacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_transacoes" ON transacoes;
CREATE POLICY "insert_own_transacoes" ON transacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_transacoes" ON transacoes;
CREATE POLICY "update_own_transacoes" ON transacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_transacoes" ON transacoes;
CREATE POLICY "delete_own_transacoes" ON transacoes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transacoes_user_id ON transacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_cofre_id ON transacoes(cofre_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data_transacao);
CREATE INDEX IF NOT EXISTS idx_cofres_user_id ON cofres(user_id);
CREATE INDEX IF NOT EXISTS idx_negocios_user_id ON negocios(user_id);
CREATE INDEX IF NOT EXISTS idx_patrimonio_user_id ON patrimonio(user_id);
\n
\n-- =========================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cofres' AND column_name = 'meta'
  ) THEN
    ALTER TABLE cofres ADD COLUMN meta numeric(15,2);
  END IF;
END $$;
\n
\n-- =========================

ALTER PUBLICATION supabase_realtime ADD TABLE cofres;
ALTER PUBLICATION supabase_realtime ADD TABLE negocios;
ALTER PUBLICATION supabase_realtime ADD TABLE patrimonio;
ALTER PUBLICATION supabase_realtime ADD TABLE transacoes;
\n
\n-- =========================

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

DROP POLICY IF EXISTS "service_insert_notif_log" ON notification_log;
CREATE POLICY "service_insert_notif_log" ON notification_log FOR INSERT
  TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "service_read_push_sub" ON push_subscriptions;
CREATE POLICY "service_read_push_sub" ON push_subscriptions FOR SELECT
  TO service_role USING (true);

DROP POLICY IF EXISTS "service_read_notif_prefs" ON notification_preferences;
CREATE POLICY "service_read_notif_prefs" ON notification_preferences FOR SELECT
  TO service_role USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE notification_log;
\n
\n-- =========================

CREATE TABLE IF NOT EXISTS admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL UNIQUE,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  nome          text NOT NULL DEFAULT 'Administrador',
  ativo         boolean NOT NULL DEFAULT true,
  last_login    timestamptz,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_admin_users" ON admin_users;
CREATE POLICY "service_role_admin_users" ON admin_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

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

INSERT INTO admin_users (username, email, password_hash, nome) VALUES (
  'admin',
  'admin@ikfinance.app',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLxNgCw1R6s4DGe',
  'Inácio Kuvingua'
) ON CONFLICT (username) DO NOTHING;
\n
\n-- =========================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             text NOT NULL DEFAULT '',
  bio              text,
  avatar_url       text,
  role             text NOT NULL DEFAULT 'user' CHECK (role IN ('user','moderator','admin_ops','super_admin')),
  plan             text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','premium','business','enterprise')),
  plan_expires_at  timestamptz,
  verified         boolean NOT NULL DEFAULT false,
  verification_type text CHECK (verification_type IN ('user','creator','store','company')),
  country          text NOT NULL DEFAULT 'AO',
  phone            text,
  website          text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_profiles" ON user_profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "service_profiles" ON user_profiles;
CREATE POLICY "select_profiles" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_profiles" ON user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  nif         text,
  setor       text NOT NULL DEFAULT 'outros',
  descricao   text,
  logo_url    text,
  website     text,
  plan        text NOT NULL DEFAULT 'free',
  verified    boolean NOT NULL DEFAULT false,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_companies" ON companies;
DROP POLICY IF EXISTS "insert_companies" ON companies;
DROP POLICY IF EXISTS "update_own_company" ON companies;
DROP POLICY IF EXISTS "delete_own_company" ON companies;
DROP POLICY IF EXISTS "service_companies" ON companies;
CREATE POLICY "select_companies" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_companies" ON companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_company" ON companies FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_own_company" ON companies FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "service_companies" ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS company_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'employee' CHECK (role IN ('owner','admin','manager','employee')),
  department  text,
  cargo       text,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','suspended')),
  invited_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (company_id, user_id)
);
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_members" ON company_members;
DROP POLICY IF EXISTS "insert_members" ON company_members;
DROP POLICY IF EXISTS "update_members" ON company_members;
DROP POLICY IF EXISTS "delete_members" ON company_members;
CREATE POLICY "select_members" ON company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "insert_members" ON company_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "update_members" ON company_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "delete_members" ON company_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS company_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'employee',
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted    boolean NOT NULL DEFAULT false,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_invites" ON company_invites;
DROP POLICY IF EXISTS "insert_invites" ON company_invites;
DROP POLICY IF EXISTS "service_invites" ON company_invites;
CREATE POLICY "select_invites" ON company_invites FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "insert_invites" ON company_invites FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "service_invites" ON company_invites FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  descricao   text,
  manager_id  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_departments" ON departments;
DROP POLICY IF EXISTS "insert_departments" ON departments;
DROP POLICY IF EXISTS "update_departments" ON departments;
DROP POLICY IF EXISTS "delete_departments" ON departments;
CREATE POLICY "select_departments" ON departments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM company_members WHERE company_id = departments.company_id AND user_id = auth.uid() AND status = 'active')
      OR EXISTS (SELECT 1 FROM companies WHERE id = departments.company_id AND owner_id = auth.uid()));
CREATE POLICY "insert_departments" ON departments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "update_departments" ON departments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "delete_departments" ON departments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  slug        text NOT NULL UNIQUE,
  nome        text NOT NULL,
  descricao   text,
  logo_url    text,
  banner_url  text,
  categoria   text NOT NULL DEFAULT 'geral',
  verified    boolean NOT NULL DEFAULT false,
  ativo       boolean NOT NULL DEFAULT true,
  rating      numeric(3,2) DEFAULT 0,
  total_sales integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_stores" ON stores;
DROP POLICY IF EXISTS "insert_stores" ON stores;
DROP POLICY IF EXISTS "update_own_store" ON stores;
DROP POLICY IF EXISTS "delete_own_store" ON stores;
DROP POLICY IF EXISTS "service_stores" ON stores;
CREATE POLICY "select_stores" ON stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_stores" ON stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_store" ON stores FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_own_store" ON stores FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "service_stores" ON stores FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  owner_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  descricao    text,
  preco        numeric(15,2) NOT NULL DEFAULT 0,
  moeda        text NOT NULL DEFAULT 'AOA',
  tipo         text NOT NULL DEFAULT 'digital' CHECK (tipo IN ('digital','physical')),
  categoria    text NOT NULL DEFAULT 'outros',
  imagem_url   text,
  arquivo_url  text,
  estoque      integer,
  ativo        boolean NOT NULL DEFAULT true,
  destaque     boolean NOT NULL DEFAULT false,
  total_vendas integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_products" ON products;
DROP POLICY IF EXISTS "insert_products" ON products;
DROP POLICY IF EXISTS "update_own_products" ON products;
DROP POLICY IF EXISTS "delete_own_products" ON products;
DROP POLICY IF EXISTS "service_products" ON products;
CREATE POLICY "select_products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_products" ON products FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_products" ON products FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "delete_own_products" ON products FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "service_products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id         uuid NOT NULL REFERENCES stores(id),
  product_id       uuid NOT NULL REFERENCES products(id),
  quantidade       integer NOT NULL DEFAULT 1,
  preco_unitario   numeric(15,2) NOT NULL,
  total            numeric(15,2) NOT NULL,
  moeda            text NOT NULL DEFAULT 'AOA',
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','delivered','cancelled','refunded')),
  payment_method   text,
  payment_ref      text,
  endereco_entrega jsonb,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_orders" ON orders;
DROP POLICY IF EXISTS "insert_own_orders" ON orders;
DROP POLICY IF EXISTS "update_own_orders" ON orders;
DROP POLICY IF EXISTS "service_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()));
CREATE POLICY "insert_own_orders" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "update_own_orders" ON orders FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()));
CREATE POLICY "service_orders" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS plan_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan        text NOT NULL CHECK (plan IN ('free','premium','business','enterprise')),
  preco       numeric(10,2) NOT NULL DEFAULT 0,
  moeda       text NOT NULL DEFAULT 'AOA',
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  starts_at   timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  payment_ref text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE plan_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_subs" ON plan_subscriptions;
DROP POLICY IF EXISTS "insert_own_subs" ON plan_subscriptions;
DROP POLICY IF EXISTS "service_subs" ON plan_subscriptions;
CREATE POLICY "select_own_subs" ON plan_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_subs" ON plan_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_subs" ON plan_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  to_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conteudo   text NOT NULL,
  lida       boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_msgs" ON messages;
DROP POLICY IF EXISTS "insert_own_msgs" ON messages;
DROP POLICY IF EXISTS "update_own_msgs" ON messages;
CREATE POLICY "select_own_msgs" ON messages FOR SELECT TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());
CREATE POLICY "insert_own_msgs" ON messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_id);
CREATE POLICY "update_own_msgs" ON messages FOR UPDATE TO authenticated
  USING (to_id = auth.uid());

CREATE TABLE IF NOT EXISTS verifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo         text NOT NULL CHECK (tipo IN ('user','creator','store','company')),
  documento_url text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by  uuid REFERENCES auth.users(id),
  reviewed_at  timestamptz,
  notas        text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_verif" ON verifications;
DROP POLICY IF EXISTS "insert_own_verif" ON verifications;
DROP POLICY IF EXISTS "service_verif" ON verifications;
CREATE POLICY "select_own_verif" ON verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_verif" ON verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_verif" ON verifications FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
\n
\n-- =========================

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

INSERT INTO system_settings (chave, valor, descricao) VALUES
  ('ai_enabled',        'true',            'IA global ativa/inativa'),
  ('ai_name',           'IK Finance AI',   'Nome do assistente de IA'),
  ('ai_persona',        'Sou o IK Finance AI, seu assistente inteligente de finanças, negócios e marketplace. Fui criado para ajudá-lo a tomar melhores decisões financeiras, organizar sua empresa e expandir seus negócios na plataforma IK Finance.', 'Persona/instrução do assistente'),
  ('ai_model',          'gpt-4o-mini',     'Modelo de IA a usar'),
  ('ai_max_tokens',     '1024',            'Máximo de tokens por resposta'),
  ('ai_daily_limit',    '50',              'Mensagens por dia por usuário (plano free)'),
  ('ai_premium_limit',  '500',             'Mensagens por dia (plano premium+)')
ON CONFLICT (chave) DO NOTHING;
\n
\n-- =========================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at    timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_active     boolean     NOT NULL DEFAULT false;

UPDATE user_profiles
SET
  trial_started_at = created_at,
  trial_ends_at    = created_at + interval '3 months',
  trial_active     = true,
  plan_expires_at  = COALESCE(plan_expires_at, created_at + interval '3 months')
WHERE trial_started_at IS NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatar_select_public" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatar_insert_own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
\n
\n-- =========================

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

UPDATE admin_users SET role = 'super_admin' WHERE username = 'admin';

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

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id  ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ik_projects_status            ON ik_projects(status);
CREATE INDEX IF NOT EXISTS idx_ik_documents_department       ON ik_internal_documents(department_id);
CREATE INDEX IF NOT EXISTS idx_ik_chat_tipo                  ON ik_internal_chat(tipo);
CREATE INDEX IF NOT EXISTS idx_team_invites_token            ON admin_team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_status           ON admin_team_invites(status);
\n
\n-- =========================

CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id) not null unique,
  customer_id text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customer data"
    ON stripe_customers
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE TYPE stripe_subscription_status AS ENUM (
    'not_started',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint primary key generated always as identity,
  customer_id text unique not null,
  subscription_id text default null,
  price_id text default null,
  current_period_start bigint default null,
  current_period_end bigint default null,
  cancel_at_period_end boolean default false,
  payment_method_brand text default null,
  payment_method_last4 text default null,
  status stripe_subscription_status not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription data"
    ON stripe_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

CREATE TYPE stripe_order_status AS ENUM (
    'pending',
    'completed',
    'canceled'
);

CREATE TABLE IF NOT EXISTS stripe_orders (
    id bigint primary key generated always as identity,
    checkout_session_id text not null,
    payment_intent_id text not null,
    customer_id text not null,
    amount_subtotal bigint not null,
    amount_total bigint not null,
    currency text not null,
    payment_status text not null,
    status stripe_order_status not null default 'pending',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order data"
    ON stripe_orders
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

CREATE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND s.deleted_at IS NULL;

GRANT SELECT ON stripe_user_subscriptions TO authenticated;

CREATE VIEW stripe_user_orders WITH (security_invoker) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND o.deleted_at IS NULL;\n
\n-- =========================

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

CREATE POLICY "users_insert_plan_requests" ON plan_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_select_plan_requests" ON plan_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users_update_cancel_plan_requests" ON plan_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_plan_requests" ON plan_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_plan_requests_status     ON plan_requests(status);
CREATE INDEX IF NOT EXISTS idx_plan_requests_user_id    ON plan_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_requests_created_at ON plan_requests(created_at DESC);
\n
\n-- =========================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-files', 'product-files', false,
  104857600,
  NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-assets', 'store-assets', true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets', 'company-assets', true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product_images_select_public" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_insert_auth" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "product_images_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "product_images_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "product_files_select_auth" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "product_files_insert_auth" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "product_files_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "product_files_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "store_assets_select_public" ON storage.objects FOR SELECT
  USING (bucket_id = 'store-assets');

CREATE POLICY "store_assets_insert_auth" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "store_assets_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "store_assets_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "company_assets_select_public" ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "company_assets_insert_auth" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "company_assets_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "company_assets_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

ALTER TABLE products ADD COLUMN IF NOT EXISTS arquivo_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS imagem_url text;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE stores ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS banner_url text;
\n
\n-- =========================

ALTER TABLE patrimonio
  ADD COLUMN IF NOT EXISTS localizacao         text,
  ADD COLUMN IF NOT EXISTS imagem_url          text,
  ADD COLUMN IF NOT EXISTS status              text DEFAULT 'ativo';

ALTER TABLE patrimonio
  ADD COLUMN IF NOT EXISTS imovel_tipo         text,         -- casa, apartamento, terreno, comercial, outro
  ADD COLUMN IF NOT EXISTS imovel_area_m2      numeric(10,2),
  ADD COLUMN IF NOT EXISTS imovel_quartos      int,
  ADD COLUMN IF NOT EXISTS imovel_arrendado    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS renda_mensal        numeric(15,2), -- receita de aluguel
  ADD COLUMN IF NOT EXISTS despesa_mensal      numeric(15,2), -- condomínio, IPTU etc.
  ADD COLUMN IF NOT EXISTS inquilino_nome      text,
  ADD COLUMN IF NOT EXISTS contrato_inicio     date,
  ADD COLUMN IF NOT EXISTS contrato_fim        date;

ALTER TABLE patrimonio
  ADD COLUMN IF NOT EXISTS veiculo_tipo        text,         -- carro, taxi, moto, camiao, outro
  ADD COLUMN IF NOT EXISTS veiculo_marca       text,
  ADD COLUMN IF NOT EXISTS veiculo_modelo      text,
  ADD COLUMN IF NOT EXISTS veiculo_ano         int,
  ADD COLUMN IF NOT EXISTS veiculo_matricula   text,
  ADD COLUMN IF NOT EXISTS veiculo_km          numeric(10,0),
  ADD COLUMN IF NOT EXISTS veiculo_combustivel text,
  ADD COLUMN IF NOT EXISTS veiculo_gera_renda  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS veiculo_renda_diaria numeric(15,2); -- renda de taxi por dia

ALTER TABLE patrimonio
  ADD COLUMN IF NOT EXISTS studio_tipo         text,         -- gravação, fotografia, podcast, dança, outro
  ADD COLUMN IF NOT EXISTS studio_capacidade   int,          -- capacidade de pessoas
  ADD COLUMN IF NOT EXISTS studio_equipamentos text,         -- lista/descrição de equipamentos
  ADD COLUMN IF NOT EXISTS studio_disponivel   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS studio_preco_hora   numeric(15,2);
\n
\n-- =========================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS idioma text DEFAULT 'pt';
\n
\n-- =========================

CREATE TABLE IF NOT EXISTS chat_conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct','group')),
  name          text,
  avatar_url    text,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS chat_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at       timestamptz DEFAULT now(),
  left_at         timestamptz,
  last_read_at    timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conv_select" ON chat_conversations;
CREATE POLICY "conv_select" ON chat_conversations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.conversation_id = chat_conversations.id AND cp.user_id = auth.uid() AND cp.left_at IS NULL
  ));

DROP POLICY IF EXISTS "conv_insert" ON chat_conversations;
CREATE POLICY "conv_insert" ON chat_conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "conv_update" ON chat_conversations;
CREATE POLICY "conv_update" ON chat_conversations FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "conv_delete" ON chat_conversations;
CREATE POLICY "conv_delete" ON chat_conversations FOR DELETE TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "part_select" ON chat_participants;
CREATE POLICY "part_select" ON chat_participants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_participants cp2
    WHERE cp2.conversation_id = chat_participants.conversation_id AND cp2.user_id = auth.uid() AND cp2.left_at IS NULL
  ));

DROP POLICY IF EXISTS "part_insert" ON chat_participants;
CREATE POLICY "part_insert" ON chat_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chat_participants cp3
      WHERE cp3.conversation_id = conversation_id AND cp3.user_id = auth.uid() AND cp3.role = 'admin' AND cp3.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "part_update" ON chat_participants;
CREATE POLICY "part_update" ON chat_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "part_delete" ON chat_participants;
CREATE POLICY "part_delete" ON chat_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS chat_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL DEFAULT 'text'
                    CHECK (type IN ('text','image','audio','video','file','sticker','call_log','deleted')),
  content         text,
  media_url       text,
  media_mime      text,
  media_name      text,
  media_size      bigint,
  media_duration  int,
  sticker_id      text,
  reply_to_id     uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  call_type       text CHECK (call_type IN ('voice','video','group_voice','group_video')),
  call_duration   int,
  call_status     text CHECK (call_status IN ('missed','answered','declined','ended')),
  edited          boolean NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_select" ON chat_messages;
CREATE POLICY "msg_select" ON chat_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.conversation_id = chat_messages.conversation_id AND cp.user_id = auth.uid() AND cp.left_at IS NULL
  ));

DROP POLICY IF EXISTS "msg_insert" ON chat_messages;
CREATE POLICY "msg_insert" ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid() AND cp.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "msg_update" ON chat_messages;
CREATE POLICY "msg_update" ON chat_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "msg_delete" ON chat_messages;
CREATE POLICY "msg_delete" ON chat_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

CREATE TABLE IF NOT EXISTS chat_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "react_select" ON chat_reactions;
CREATE POLICY "react_select" ON chat_reactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = chat_reactions.message_id AND cp.user_id = auth.uid() AND cp.left_at IS NULL
  ));

DROP POLICY IF EXISTS "react_insert" ON chat_reactions;
CREATE POLICY "react_insert" ON chat_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "react_update" ON chat_reactions;
CREATE POLICY "react_update" ON chat_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "react_delete" ON chat_reactions;
CREATE POLICY "react_delete" ON chat_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS chat_stories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'image' CHECK (type IN ('image','video','text')),
  media_url   text,
  content     text,
  bg_color    text DEFAULT '#1f2937',
  font_size   int DEFAULT 24,
  expires_at  timestamptz DEFAULT (now() + interval '24 hours'),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE chat_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story_select" ON chat_stories;
CREATE POLICY "story_select" ON chat_stories FOR SELECT TO authenticated
  USING (expires_at > now());

DROP POLICY IF EXISTS "story_insert" ON chat_stories;
CREATE POLICY "story_insert" ON chat_stories FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "story_update" ON chat_stories;
CREATE POLICY "story_update" ON chat_stories FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "story_delete" ON chat_stories;
CREATE POLICY "story_delete" ON chat_stories FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS chat_story_views (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   uuid NOT NULL REFERENCES chat_stories(id) ON DELETE CASCADE,
  viewer_id  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at  timestamptz DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE chat_story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storyview_select" ON chat_story_views;
CREATE POLICY "storyview_select" ON chat_story_views FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "storyview_insert" ON chat_story_views;
CREATE POLICY "storyview_insert" ON chat_story_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

DROP POLICY IF EXISTS "storyview_update" ON chat_story_views;
CREATE POLICY "storyview_update" ON chat_story_views FOR UPDATE TO authenticated
  USING (viewer_id = auth.uid());

DROP POLICY IF EXISTS "storyview_delete" ON chat_story_views;
CREATE POLICY "storyview_delete" ON chat_story_views FOR DELETE TO authenticated
  USING (viewer_id = auth.uid());

CREATE TABLE IF NOT EXISTS chat_calls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE SET NULL,
  caller_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type       text NOT NULL CHECK (call_type IN ('voice','video','group_voice','group_video')),
  status          text NOT NULL DEFAULT 'calling'
                    CHECK (status IN ('calling','answered','missed','declined','ended','busy')),
  started_at      timestamptz DEFAULT now(),
  ended_at        timestamptz,
  duration        int,
  participants    uuid[] DEFAULT '{}'
);

ALTER TABLE chat_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "call_select" ON chat_calls;
CREATE POLICY "call_select" ON chat_calls FOR SELECT TO authenticated
  USING (caller_id = auth.uid() OR auth.uid() = ANY(participants));

DROP POLICY IF EXISTS "call_insert" ON chat_calls;
CREATE POLICY "call_insert" ON chat_calls FOR INSERT TO authenticated
  WITH CHECK (caller_id = auth.uid());

DROP POLICY IF EXISTS "call_update" ON chat_calls;
CREATE POLICY "call_update" ON chat_calls FOR UPDATE TO authenticated
  USING (caller_id = auth.uid() OR auth.uid() = ANY(participants));

DROP POLICY IF EXISTS "call_delete" ON chat_calls;
CREATE POLICY "call_delete" ON chat_calls FOR DELETE TO authenticated
  USING (caller_id = auth.uid());

CREATE TABLE IF NOT EXISTS chat_typing (
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  updated_at      timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, conversation_id)
);

ALTER TABLE chat_typing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "typing_select" ON chat_typing;
CREATE POLICY "typing_select" ON chat_typing FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "typing_insert" ON chat_typing;
CREATE POLICY "typing_insert" ON chat_typing FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "typing_update" ON chat_typing;
CREATE POLICY "typing_update" ON chat_typing FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "typing_delete" ON chat_typing;
CREATE POLICY "typing_delete" ON chat_typing FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_cp_user      ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_conv      ON chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cm_conv      ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_sender    ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_cr_msg       ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_cs_user      ON chat_stories(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_cc_caller    ON chat_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_ct_conv      ON chat_typing(conversation_id);

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_typing;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_stories;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
\n
\n-- =========================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media', 'chat-media', true, 104857600,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','audio/mpeg','audio/ogg','audio/wav','audio/webm','video/mp4','video/webm','video/ogg','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip','text/plain']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_media_read"   ON storage.objects;
DROP POLICY IF EXISTS "chat_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "chat_media_delete" ON storage.objects;

CREATE POLICY "chat_media_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media');

CREATE POLICY "chat_media_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "chat_media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
\n
\n-- =========================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS subcategoria      text,
  ADD COLUMN IF NOT EXISTS marca             text,
  ADD COLUMN IF NOT EXISTS disponibilidade   text DEFAULT 'disponivel',
  ADD COLUMN IF NOT EXISTS localizacao       text,
  ADD COLUMN IF NOT EXISTS peso              numeric,
  ADD COLUMN IF NOT EXISTS dimensoes         jsonb,
  ADD COLUMN IF NOT EXISTS transportadora    text,
  ADD COLUMN IF NOT EXISTS tempo_entrega     text,
  ADD COLUMN IF NOT EXISTS formatos          text[],
  ADD COLUMN IF NOT EXISTS total_views       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_downloads   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at        timestamptz,
  ADD COLUMN IF NOT EXISTS tags              text[];

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS localizacao       text,
  ADD COLUMN IF NOT EXISTS avg_rating        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at        timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp          text,
  ADD COLUMN IF NOT EXISTS email_contato     text;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS notes             text,
  ADD COLUMN IF NOT EXISTS proof_url         text,
  ADD COLUMN IF NOT EXISTS approved_at       timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS download_released boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS conversation_id   uuid REFERENCES chat_conversations(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS product_media (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  owner_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  type         text NOT NULL CHECK (type IN ('image','video','audio','document')),
  url          text NOT NULL,
  mime         text,
  name         text,
  size         bigint,
  duration     int,
  sort_order   int DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pm_select" ON product_media;
CREATE POLICY "pm_select" ON product_media FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pm_insert" ON product_media;
CREATE POLICY "pm_insert" ON product_media FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "pm_update" ON product_media;
CREATE POLICY "pm_update" ON product_media FOR UPDATE TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "pm_delete" ON product_media;
CREATE POLICY "pm_delete" ON product_media FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS product_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  reviewer_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  rating          int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         text,
  photo_urls      text[] DEFAULT '{}',
  likes           int DEFAULT 0,
  seller_reply    text,
  seller_reply_at timestamptz,
  verified_purchase boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(product_id, reviewer_id)
);
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pr_select" ON product_reviews;
CREATE POLICY "pr_select" ON product_reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pr_insert" ON product_reviews;
CREATE POLICY "pr_insert" ON product_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
DROP POLICY IF EXISTS "pr_update" ON product_reviews;
CREATE POLICY "pr_update" ON product_reviews FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid() OR EXISTS(SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "pr_delete" ON product_reviews;
CREATE POLICY "pr_delete" ON product_reviews FOR DELETE TO authenticated USING (reviewer_id = auth.uid());

CREATE TABLE IF NOT EXISTS store_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  reviewer_id  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  rating       int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      text,
  likes        int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(store_id, reviewer_id)
);
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_select" ON store_reviews;
CREATE POLICY "sr_select" ON store_reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sr_insert" ON store_reviews;
CREATE POLICY "sr_insert" ON store_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
DROP POLICY IF EXISTS "sr_update" ON store_reviews;
CREATE POLICY "sr_update" ON store_reviews FOR UPDATE TO authenticated USING (reviewer_id = auth.uid());
DROP POLICY IF EXISTS "sr_delete" ON store_reviews;
CREATE POLICY "sr_delete" ON store_reviews FOR DELETE TO authenticated USING (reviewer_id = auth.uid());

CREATE TABLE IF NOT EXISTS download_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token           text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      timestamptz,
  max_downloads   int DEFAULT 3,
  download_count  int DEFAULT 0,
  last_ip         text,
  last_device     text,
  last_download   timestamptz,
  revoked         boolean DEFAULT false,
  released_by     uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dt_select" ON download_tokens;
CREATE POLICY "dt_select" ON download_tokens FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS(SELECT 1 FROM stores s JOIN products p ON p.store_id=s.id WHERE p.id=product_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "dt_insert" ON download_tokens;
CREATE POLICY "dt_insert" ON download_tokens FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM stores s JOIN products p ON p.store_id=s.id WHERE p.id=product_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "dt_update" ON download_tokens;
CREATE POLICY "dt_update" ON download_tokens FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS(SELECT 1 FROM stores s JOIN products p ON p.store_id=s.id WHERE p.id=product_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "dt_delete" ON download_tokens;
CREATE POLICY "dt_delete" ON download_tokens FOR DELETE TO authenticated
  USING (EXISTS(SELECT 1 FROM stores s JOIN products p ON p.store_id=s.id WHERE p.id=product_id AND s.owner_id=auth.uid()));

CREATE TABLE IF NOT EXISTS order_proofs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  uploader_id  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  url          text NOT NULL,
  mime         text,
  name         text,
  note         text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE order_proofs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "op_select" ON order_proofs;
CREATE POLICY "op_select" ON order_proofs FOR SELECT TO authenticated
  USING (uploader_id = auth.uid() OR EXISTS(SELECT 1 FROM orders o JOIN stores s ON s.id=o.store_id WHERE o.id=order_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "op_insert" ON order_proofs;
CREATE POLICY "op_insert" ON order_proofs FOR INSERT TO authenticated WITH CHECK (uploader_id = auth.uid());
DROP POLICY IF EXISTS "op_update" ON order_proofs;
CREATE POLICY "op_update" ON order_proofs FOR UPDATE TO authenticated USING (uploader_id = auth.uid());
DROP POLICY IF EXISTS "op_delete" ON order_proofs;
CREATE POLICY "op_delete" ON order_proofs FOR DELETE TO authenticated USING (uploader_id = auth.uid());

CREATE TABLE IF NOT EXISTS product_favourites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);
ALTER TABLE product_favourites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pf_select" ON product_favourites;
CREATE POLICY "pf_select" ON product_favourites FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "pf_insert" ON product_favourites;
CREATE POLICY "pf_insert" ON product_favourites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "pf_delete" ON product_favourites;
CREATE POLICY "pf_delete" ON product_favourites FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS product_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewer_id   uuid REFERENCES auth.users(id),
  viewed_at   timestamptz DEFAULT now()
);
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pv_select" ON product_views;
CREATE POLICY "pv_select" ON product_views FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pv_insert" ON product_views;
CREATE POLICY "pv_insert" ON product_views FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS marketplace_audit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  entity_type text NOT NULL,
  entity_id   uuid,
  action      text NOT NULL,
  details     jsonb,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE marketplace_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ma_select" ON marketplace_audit;
CREATE POLICY "ma_select" ON marketplace_audit FOR SELECT TO authenticated USING (actor_id = auth.uid());
DROP POLICY IF EXISTS "ma_insert" ON marketplace_audit;
CREATE POLICY "ma_insert" ON marketplace_audit FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_products_store      ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted    ON products(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_rating     ON products(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_prod_reviews_prod   ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_store ON store_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_dt_buyer            ON download_tokens(buyer_id);
CREATE INDEX IF NOT EXISTS idx_dt_token            ON download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_orders_buyer        ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_store        ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_pf_user             ON product_favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_product          ON product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_op_order            ON order_proofs(order_id);

ALTER PUBLICATION supabase_realtime ADD TABLE download_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE order_proofs;
ALTER PUBLICATION supabase_realtime ADD TABLE product_reviews;
\n
\n-- =========================

DROP POLICY IF EXISTS "mp_media_read"   ON storage.objects;
DROP POLICY IF EXISTS "mp_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "mp_media_update" ON storage.objects;
DROP POLICY IF EXISTS "mp_media_delete" ON storage.objects;

CREATE POLICY "mp_media_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'marketplace-media');

CREATE POLICY "mp_media_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketplace-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "mp_media_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'marketplace-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "mp_media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketplace-media' AND (storage.foldername(name))[1] = auth.uid()::text);
\n
\n-- =========================

CREATE TABLE IF NOT EXISTS calc_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  expression  text NOT NULL,
  result      text NOT NULL,
  label       text,
  category    text DEFAULT 'general',
  steps       jsonb,
  destination text,
  favourited  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE calc_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ch_select" ON calc_history;
CREATE POLICY "ch_select" ON calc_history FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ch_insert" ON calc_history;
CREATE POLICY "ch_insert" ON calc_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ch_update" ON calc_history;
CREATE POLICY "ch_update" ON calc_history FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ch_delete" ON calc_history;
CREATE POLICY "ch_delete" ON calc_history FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS calc_saved_formulas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  expression  text NOT NULL,
  description text,
  category    text DEFAULT 'custom',
  variables   jsonb,
  is_builtin  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE calc_saved_formulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csf_select" ON calc_saved_formulas;
CREATE POLICY "csf_select" ON calc_saved_formulas FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_builtin = true);

DROP POLICY IF EXISTS "csf_insert" ON calc_saved_formulas;
CREATE POLICY "csf_insert" ON calc_saved_formulas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "csf_update" ON calc_saved_formulas;
CREATE POLICY "csf_update" ON calc_saved_formulas FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "csf_delete" ON calc_saved_formulas;
CREATE POLICY "csf_delete" ON calc_saved_formulas FOR DELETE TO authenticated USING (user_id = auth.uid() AND is_builtin = false);

CREATE INDEX IF NOT EXISTS idx_calc_history_user ON calc_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calc_formula_user ON calc_saved_formulas(user_id);
\n
\n-- =========================

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
\n
\n-- =========================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'cliente'
    CHECK (account_type IN ('cliente','vendedor','empresa','fornecedor','criador','profissional','administrador')),
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'publico'
    CHECK (profile_visibility IN ('publico','privado','misto')),
  ADD COLUMN IF NOT EXISTS profile_completion integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS sex text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS public_bio text,
  ADD COLUMN IF NOT EXISTS location_label text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_category text,
  ADD COLUMN IF NOT EXISTS company_description text,
  ADD COLUMN IF NOT EXISTS company_logo_url text,
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS company_socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS company_contacts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS company_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS associated_companies jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stores_created jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS published_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS offered_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_preferences jsonb NOT NULL DEFAULT '{"email":true,"phone":false,"show_location":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS public_profile jsonb NOT NULL DEFAULT '{"show_bio":true,"show_reviews":true,"show_products":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS private_profile jsonb NOT NULL DEFAULT '{"hide_document":true,"hide_address":true,"hide_financial":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS security_level text NOT NULL DEFAULT 'standard'
    CHECK (security_level IN ('standard','elevated','strict')),
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_ip text,
  ADD COLUMN IF NOT EXISTS last_login_location text,
  ADD COLUMN IF NOT EXISTS suspicious_login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consent_version text,
  ADD COLUMN IF NOT EXISTS consented_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE user_profiles
SET
  email = COALESCE(user_profiles.email, au.email),
  username = COALESCE(
    user_profiles.username,
    split_part(
      COALESCE(au.email, user_profiles.nome, 'utilizador'),
      '@',
      1
    ) || '_' || substr(user_profiles.user_id::text, 1, 6)
  ),
  preferred_language = COALESCE(user_profiles.preferred_language, user_profiles.idioma, 'pt'),
  full_name = COALESCE(user_profiles.full_name, NULLIF(user_profiles.nome, '')),
  display_name = COALESCE(user_profiles.display_name, NULLIF(user_profiles.nome, '')),
  public_bio = COALESCE(user_profiles.public_bio, user_profiles.bio),
  profile_completion = GREATEST(
    user_profiles.profile_completion,
    (CASE WHEN COALESCE(user_profiles.nome, '') <> '' THEN 15 ELSE 0 END) +
    (CASE WHEN COALESCE(user_profiles.phone, '') <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(user_profiles.country, '') <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(user_profiles.avatar_url, '') <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(user_profiles.bio, '') <> '' THEN 10 ELSE 0 END)
  )
FROM auth.users au
WHERE au.id = user_profiles.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_unique_idx
  ON user_profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_unique_idx
  ON user_profiles (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_identity_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('bi','passaporte','carta','nif','outro')),
  document_number text NOT NULL,
  issuer_country text NOT NULL,
  issued_at date,
  expires_at date,
  document_url text,
  verification_status text NOT NULL DEFAULT 'pendente'
    CHECK (verification_status IN ('pendente','verificado','rejeitado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_identity_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_identity_documents" ON user_identity_documents;
DROP POLICY IF EXISTS "insert_own_identity_documents" ON user_identity_documents;
DROP POLICY IF EXISTS "update_own_identity_documents" ON user_identity_documents;
DROP POLICY IF EXISTS "service_identity_documents" ON user_identity_documents;
CREATE POLICY "select_own_identity_documents" ON user_identity_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_identity_documents" ON user_identity_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_identity_documents" ON user_identity_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_identity_documents" ON user_identity_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_security_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_security_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_security_questions" ON user_security_questions;
DROP POLICY IF EXISTS "insert_own_security_questions" ON user_security_questions;
DROP POLICY IF EXISTS "delete_own_security_questions" ON user_security_questions;
DROP POLICY IF EXISTS "service_security_questions" ON user_security_questions;
CREATE POLICY "select_own_security_questions" ON user_security_questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_security_questions" ON user_security_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_security_questions" ON user_security_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "service_security_questions" ON user_security_questions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_method text NOT NULL DEFAULT 'password',
  device_name text,
  device_id text,
  user_agent text,
  ip_address text,
  location_label text,
  country text,
  timezone text,
  success boolean NOT NULL DEFAULT true,
  suspicious boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_login_history" ON user_login_history;
DROP POLICY IF EXISTS "insert_own_login_history" ON user_login_history;
DROP POLICY IF EXISTS "service_login_history" ON user_login_history;
CREATE POLICY "select_own_login_history" ON user_login_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_login_history" ON user_login_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_login_history" ON user_login_history FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_name text,
  platform text,
  browser text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_ip text,
  last_location text,
  trusted boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_devices" ON user_devices;
DROP POLICY IF EXISTS "insert_own_devices" ON user_devices;
DROP POLICY IF EXISTS "update_own_devices" ON user_devices;
DROP POLICY IF EXISTS "service_devices" ON user_devices;
CREATE POLICY "select_own_devices" ON user_devices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_devices" ON user_devices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_devices" ON user_devices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_devices" ON user_devices FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS account_recovery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  identifier text,
  recovery_type text NOT NULL,
  matched_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','aprovado','suspeito','bloqueado','concluido')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE account_recovery_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insert_recovery_attempts" ON account_recovery_attempts;
DROP POLICY IF EXISTS "select_own_recovery_attempts" ON account_recovery_attempts;
DROP POLICY IF EXISTS "service_recovery_attempts" ON account_recovery_attempts;
CREATE POLICY "insert_recovery_attempts" ON account_recovery_attempts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "select_own_recovery_attempts" ON account_recovery_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "service_recovery_attempts" ON account_recovery_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS profile_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  previous_value text,
  next_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profile_change_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile_logs" ON profile_change_logs;
DROP POLICY IF EXISTS "insert_own_profile_logs" ON profile_change_logs;
DROP POLICY IF EXISTS "service_profile_logs" ON profile_change_logs;
CREATE POLICY "select_own_profile_logs" ON profile_change_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_profile_logs" ON profile_change_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_profile_logs" ON profile_change_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'identity-documents',
  'identity-documents',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "identity_documents_owner_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "identity_documents_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "identity_documents_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "identity_documents_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.resolve_login_identifier(input_identifier text)
RETURNS TABLE (user_id uuid, email text, username text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.user_id, up.email, up.username
  FROM user_profiles up
  LEFT JOIN user_identity_documents uid ON uid.user_id = up.user_id
  WHERE lower(COALESCE(up.email, '')) = lower(trim(input_identifier))
     OR lower(COALESCE(up.username, '')) = lower(trim(both '@' from input_identifier))
     OR COALESCE(up.phone, '') = trim(input_identifier)
     OR COALESCE(uid.document_number, '') = trim(input_identifier)
  ORDER BY uid.created_at DESC NULLS LAST
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.recover_account_identity(
  input_identifier text DEFAULT NULL,
  input_full_name text DEFAULT NULL,
  input_birth_date date DEFAULT NULL,
  input_country text DEFAULT NULL,
  input_city text DEFAULT NULL,
  input_phone text DEFAULT NULL,
  input_email text DEFAULT NULL,
  input_document_number text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  username text,
  masked_email text,
  masked_phone text,
  score integer,
  allow_reset boolean,
  suspicious boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate RECORD;
  match_score integer;
BEGIN
  FOR candidate IN
    SELECT
      up.user_id,
      up.username,
      up.email,
      up.phone,
      up.full_name,
      up.birth_date,
      up.country,
      up.city,
      uid.document_number
    FROM user_profiles up
    LEFT JOIN user_identity_documents uid ON uid.user_id = up.user_id
    WHERE (
      input_identifier IS NOT NULL AND (
        lower(COALESCE(up.email, '')) = lower(trim(input_identifier)) OR
        lower(COALESCE(up.username, '')) = lower(trim(both '@' from input_identifier)) OR
        COALESCE(up.phone, '') = trim(input_identifier) OR
        COALESCE(uid.document_number, '') = trim(input_identifier)
      )
    ) OR (
      input_identifier IS NULL AND (
        (input_full_name IS NOT NULL AND lower(COALESCE(up.full_name, '')) = lower(trim(input_full_name))) OR
        (input_document_number IS NOT NULL AND COALESCE(uid.document_number, '') = trim(input_document_number))
      )
    )
    LIMIT 5
  LOOP
    match_score := 0;
    IF input_full_name IS NOT NULL AND lower(COALESCE(candidate.full_name, '')) = lower(trim(input_full_name)) THEN match_score := match_score + 20; END IF;
    IF input_birth_date IS NOT NULL AND candidate.birth_date = input_birth_date THEN match_score := match_score + 15; END IF;
    IF input_country IS NOT NULL AND lower(COALESCE(candidate.country, '')) = lower(trim(input_country)) THEN match_score := match_score + 10; END IF;
    IF input_city IS NOT NULL AND lower(COALESCE(candidate.city, '')) = lower(trim(input_city)) THEN match_score := match_score + 10; END IF;
    IF input_phone IS NOT NULL AND COALESCE(candidate.phone, '') = trim(input_phone) THEN match_score := match_score + 20; END IF;
    IF input_email IS NOT NULL AND lower(COALESCE(candidate.email, '')) = lower(trim(input_email)) THEN match_score := match_score + 15; END IF;
    IF input_document_number IS NOT NULL AND COALESCE(candidate.document_number, '') = trim(input_document_number) THEN match_score := match_score + 25; END IF;
    IF input_identifier IS NOT NULL THEN match_score := match_score + 10; END IF;

    INSERT INTO account_recovery_attempts (user_id, identifier, recovery_type, score, status)
    VALUES (
      candidate.user_id,
      input_identifier,
      CASE WHEN input_identifier IS NOT NULL THEN 'identifier' ELSE 'identity_match' END,
      match_score,
      CASE WHEN match_score >= 60 THEN 'aprovado' WHEN match_score >= 35 THEN 'suspeito' ELSE 'bloqueado' END
    );

    RETURN QUERY SELECT
      candidate.user_id,
      candidate.username,
      CASE
        WHEN candidate.email IS NULL THEN NULL
        ELSE left(candidate.email, 2) || '***' || substring(candidate.email from position('@' in candidate.email))
      END,
      CASE
        WHEN candidate.phone IS NULL OR length(candidate.phone) < 4 THEN NULL
        ELSE repeat('*', GREATEST(length(candidate.phone) - 4, 0)) || right(candidate.phone, 4)
      END,
      match_score,
      match_score >= 60,
      match_score BETWEEN 35 AND 59;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recover_account_identity(text, text, date, text, text, text, text, text) TO anon, authenticated;
\n
\n-- =========================

CREATE TABLE IF NOT EXISTS goal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cofre_id uuid REFERENCES cofres(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text,
  descricao text,
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  moeda text NOT NULL DEFAULT 'KZ',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_item_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES goal_items(id) ON DELETE CASCADE,
  fornecedor text,
  preco_unitario numeric NOT NULL DEFAULT 0,
  moeda text NOT NULL DEFAULT 'KZ',
  frete jsonb DEFAULT '{}'::jsonb,
  seguro numeric DEFAULT 0,
  seguro_moeda text DEFAULT 'KZ',
  iva_percent numeric DEFAULT 0,
  taxas_alfandega jsonb DEFAULT '{}'::jsonb,
  outras_despesas jsonb DEFAULT '[]'::jsonb,
  extra jsonb DEFAULT '{}'::jsonb,
  total_cached numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id serial PRIMARY KEY,
  base_currency text NOT NULL DEFAULT 'KZ',
  currency text NOT NULL,
  rate numeric NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_items_cofre ON goal_items(cofre_id);
CREATE INDEX IF NOT EXISTS idx_goal_item_quotes_item ON goal_item_quotes(item_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(currency);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_goal_items_updated_at
BEFORE UPDATE ON goal_items
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_goal_item_quotes_updated_at
BEFORE UPDATE ON goal_item_quotes
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
\n
\n-- =========================

CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text,
  description text,
  amount numeric(18,2),
  currency text,
  status text DEFAULT 'proposed',
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_from_id ON public.deals (from_id);
CREATE INDEX IF NOT EXISTS idx_deals_to_id ON public.deals (to_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals (status);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deals_updated_at ON public.deals;
CREATE TRIGGER trg_deals_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();
\n
\n-- =========================

CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_id, to_id)
);

CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_follows" ON public.follows FOR SELECT TO authenticated USING (from_id = auth.uid() OR to_id = auth.uid());
CREATE POLICY "insert_follows" ON public.follows FOR INSERT TO authenticated WITH CHECK (from_id = auth.uid());
CREATE POLICY "delete_follows" ON public.follows FOR DELETE TO authenticated USING (from_id = auth.uid() OR to_id = auth.uid());

CREATE POLICY "select_blocks" ON public.blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid() OR blocked_id = auth.uid());
CREATE POLICY "insert_blocks" ON public.blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "delete_blocks" ON public.blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());
\n
\n-- =========================

CREATE TABLE IF NOT EXISTS public.store_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_id, store_id)
);

ALTER TABLE public.store_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_store_follows" ON public.store_follows FOR SELECT TO authenticated
  USING (from_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()));
CREATE POLICY "insert_store_follows" ON public.store_follows FOR INSERT TO authenticated
  WITH CHECK (from_id = auth.uid());
CREATE POLICY "delete_store_follows" ON public.store_follows FOR DELETE TO authenticated
  USING (from_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()));
\n
\n-- =========================

CREATE TABLE IF NOT EXISTS exchange_rates_history (
  id serial PRIMARY KEY,
  base_currency text NOT NULL DEFAULT 'KZ',
  currency text NOT NULL,
  rate numeric NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_history_currency ON exchange_rates_history(currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_history_fetched_at ON exchange_rates_history(fetched_at);
\n
\n-- =========================

CREATE TABLE IF NOT EXISTS payment_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  owner_type text NOT NULL CHECK (owner_type IN ('user','store')),
  label text NOT NULL,
  method_type text NOT NULL CHECK (method_type IN ('bank_account','mobile_wallet','crypto_wallet','card_transfer','external_p2p','cash_agent')),
  provider_name text,
  account_name text,
  account_number text,
  iban text,
  swift_code text,
  wallet_network text,
  wallet_address text,
  phone_number text,
  qr_code_url text,
  currency_code text DEFAULT 'USD',
  instructions text,
  is_default boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK ((owner_type = 'user' AND owner_user_id IS NOT NULL AND store_id IS NULL) OR (owner_type = 'store' AND store_id IS NOT NULL))
);

ALTER TABLE payment_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pp_select" ON payment_profiles;
DROP POLICY IF EXISTS "pp_insert" ON payment_profiles;
DROP POLICY IF EXISTS "pp_update" ON payment_profiles;
DROP POLICY IF EXISTS "pp_delete" ON payment_profiles;
DROP POLICY IF EXISTS "pp_service" ON payment_profiles;

CREATE POLICY "pp_select" ON payment_profiles FOR SELECT TO authenticated
  USING (
    (owner_type = 'user' AND owner_user_id = auth.uid()) OR
    (owner_type = 'store' AND EXISTS (SELECT 1 FROM stores WHERE id = payment_profiles.store_id AND owner_id = auth.uid())) OR
    (owner_type = 'store' AND is_public = true AND is_active = true)
  );

CREATE POLICY "pp_insert" ON payment_profiles FOR INSERT TO authenticated
  WITH CHECK (
    (owner_type = 'user' AND owner_user_id = auth.uid()) OR
    (owner_type = 'store' AND EXISTS (SELECT 1 FROM stores WHERE id = payment_profiles.store_id AND owner_id = auth.uid()))
  );

CREATE POLICY "pp_update" ON payment_profiles FOR UPDATE TO authenticated
  USING (
    (owner_type = 'user' AND owner_user_id = auth.uid()) OR
    (owner_type = 'store' AND EXISTS (SELECT 1 FROM stores WHERE id = payment_profiles.store_id AND owner_id = auth.uid()))
  )
  WITH CHECK (
    (owner_type = 'user' AND owner_user_id = auth.uid()) OR
    (owner_type = 'store' AND EXISTS (SELECT 1 FROM stores WHERE id = payment_profiles.store_id AND owner_id = auth.uid()))
  );

CREATE POLICY "pp_delete" ON payment_profiles FOR DELETE TO authenticated
  USING (
    (owner_type = 'user' AND owner_user_id = auth.uid()) OR
    (owner_type = 'store' AND EXISTS (SELECT 1 FROM stores WHERE id = payment_profiles.store_id AND owner_id = auth.uid()))
  );

CREATE POLICY "pp_service" ON payment_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_payment_profiles_user ON payment_profiles(owner_user_id) WHERE owner_type = 'user';
CREATE INDEX IF NOT EXISTS idx_payment_profiles_store ON payment_profiles(store_id) WHERE owner_type = 'store';\n
\n-- =========================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allow_download boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS restore_until timestamptz;

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS restore_until timestamptz;

UPDATE products
SET slug = COALESCE(slug, regexp_replace(lower(nome), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL;

UPDATE products
SET restore_until = COALESCE(restore_until, deleted_at + interval '30 days')
WHERE deleted_at IS NOT NULL AND restore_until IS NULL;

UPDATE stores
SET restore_until = COALESCE(restore_until, deleted_at + interval '30 days')
WHERE deleted_at IS NOT NULL AND restore_until IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug_unique ON products(slug) WHERE slug IS NOT NULL;

ALTER TABLE store_reviews
  ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seller_reply text,
  ADD COLUMN IF NOT EXISTS seller_reply_at timestamptz;

CREATE TABLE IF NOT EXISTS product_review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

ALTER TABLE product_review_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prl_select" ON product_review_likes;
DROP POLICY IF EXISTS "prl_insert" ON product_review_likes;
DROP POLICY IF EXISTS "prl_delete" ON product_review_likes;
CREATE POLICY "prl_select" ON product_review_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "prl_insert" ON product_review_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "prl_delete" ON product_review_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS store_review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES store_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

ALTER TABLE store_review_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "srl_select" ON store_review_likes;
DROP POLICY IF EXISTS "srl_insert" ON store_review_likes;
DROP POLICY IF EXISTS "srl_delete" ON store_review_likes;
CREATE POLICY "srl_select" ON store_review_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "srl_insert" ON store_review_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "srl_delete" ON store_review_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS download_token_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  download_token_id uuid NOT NULL REFERENCES download_tokens(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  device_label text,
  user_agent text,
  downloaded_at timestamptz DEFAULT now()
);

ALTER TABLE download_token_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dtl_select" ON download_token_logs;
DROP POLICY IF EXISTS "dtl_insert" ON download_token_logs;
CREATE POLICY "dtl_select" ON download_token_logs FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid() OR EXISTS(
      SELECT 1
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.id = download_token_logs.order_id AND s.owner_id = auth.uid()
    )
  );
CREATE POLICY "dtl_insert" ON download_token_logs FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_download_token_logs_token ON download_token_logs(download_token_id, downloaded_at DESC);\n
\n-- =========================

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
CREATE INDEX IF NOT EXISTS idx_marketplace_rate_limits_user_action ON marketplace_rate_limits(user_id, action, last_attempt_at DESC);\n
\n-- =========================

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS on_marketplace_purchase boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS on_marketplace_message boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS on_marketplace_payment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS on_marketplace_download boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS on_marketplace_review boolean NOT NULL DEFAULT true;\n
\n-- =========================

UPDATE admin_users
SET email = 'inaciokuvingua@gmail.com',
    updated_at = now()
WHERE username = 'admin'
   OR email = 'admin@ikfinance.app';

\n
\n-- =========================

CREATE TABLE IF NOT EXISTS trading_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL UNIQUE,
    name text NOT NULL,
    type text NOT NULL, -- 'crypto', 'forex', 'stocks', 'indices', 'commodities', 'etfs'
    exchange text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_analysis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid REFERENCES trading_assets(id) ON DELETE CASCADE,
    technical_indicators jsonb, -- RSI, MACD, MA, etc.
    chart_patterns text[],
    support_resistance jsonb,
    market_sentiment text, -- 'bullish', 'bearish', 'neutral'
    sentiment_score numeric,
    summary text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS economic_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name text NOT NULL,
    impact text NOT NULL, -- 'low', 'medium', 'high'
    currency text,
    actual numeric,
    forecast numeric,
    previous numeric,
    event_time timestamptz NOT NULL,
    category text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id uuid REFERENCES trading_assets(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'price', 'indicator', 'ai_signal'
    condition jsonb NOT NULL,
    is_triggered boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    triggered_at timestamptz
);

CREATE TABLE IF NOT EXISTS ai_predictions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid REFERENCES trading_assets(id) ON DELETE CASCADE,
    scenario_optimistic jsonb NOT NULL,
    scenario_neutral jsonb NOT NULL,
    scenario_pessimistic jsonb NOT NULL,
    probabilities jsonb NOT NULL,
    ai_explanation text NOT NULL,
    disclaimer text DEFAULT 'Trading envolve riscos. Não garantimos lucros.',
    valid_until timestamptz,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE trading_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for trading assets" ON trading_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow public read for market analysis" ON market_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow public read for economic events" ON economic_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow public read for ai predictions" ON ai_predictions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their own alerts" ON trading_alerts 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_trading_assets_type ON trading_assets(type);
CREATE INDEX idx_market_analysis_asset_id ON market_analysis(asset_id);
CREATE INDEX idx_economic_events_time ON economic_events(event_time);
CREATE INDEX idx_trading_alerts_user_id ON trading_alerts(user_id);
CREATE INDEX idx_ai_predictions_asset_id ON ai_predictions(asset_id);

INSERT INTO trading_assets (symbol, name, type, exchange) VALUES
('BTC/USDT', 'Bitcoin', 'crypto', 'Binance'),
('ETH/USDT', 'Ethereum', 'crypto', 'Binance'),
('EUR/USD', 'Euro / US Dollar', 'forex', 'OANDA'),
('AAPL', 'Apple Inc.', 'stocks', 'NASDAQ'),
('SPX', 'S&P 500', 'indices', 'CME'),
('GOLD', 'Gold', 'commodities', 'COMEX')
ON CONFLICT (symbol) DO NOTHING;
\n
\n-- =========================

INSERT INTO trading_assets (symbol, name, type, exchange) VALUES

('SOL/USDT', 'Solana', 'crypto', 'Binance'),
('BNB/USDT', 'Binance Coin', 'crypto', 'Binance'),
('ADA/USDT', 'Cardano', 'crypto', 'Binance'),
('XRP/USDT', 'Ripple', 'crypto', 'Binance'),
('DOT/USDT', 'Polkadot', 'crypto', 'Binance'),
('DOGE/USDT', 'Dogecoin', 'crypto', 'Binance'),
('MATIC/USDT', 'Polygon', 'crypto', 'Binance'),
('LINK/USDT', 'Chainlink', 'crypto', 'Binance'),
('AVAX/USDT', 'Avalanche', 'crypto', 'Binance'),
('SHIB/USDT', 'Shiba Inu', 'crypto', 'Binance'),

('GBP/USD', 'British Pound / US Dollar', 'forex', 'OANDA'),
('USD/JPY', 'US Dollar / Japanese Yen', 'forex', 'OANDA'),
('AUD/USD', 'Australian Dollar / US Dollar', 'forex', 'OANDA'),
('USD/CAD', 'US Dollar / Canadian Dollar', 'forex', 'OANDA'),
('USD/CHF', 'US Dollar / Swiss Franc', 'forex', 'OANDA'),
('NZD/USD', 'New Zealand Dollar / US Dollar', 'forex', 'OANDA'),
('EUR/GBP', 'Euro / British Pound', 'forex', 'OANDA'),
('USD/BRL', 'US Dollar / Brazilian Real', 'forex', 'OANDA'),
('EUR/BRL', 'Euro / Brazilian Real', 'forex', 'OANDA'),

('MSFT', 'Microsoft Corp.', 'stocks', 'NASDAQ'),
('GOOGL', 'Alphabet Inc.', 'stocks', 'NASDAQ'),
('AMZN', 'Amazon.com Inc.', 'stocks', 'NASDAQ'),
('TSLA', 'Tesla Inc.', 'stocks', 'NASDAQ'),
('NVDA', 'NVIDIA Corp.', 'stocks', 'NASDAQ'),
('META', 'Meta Platforms Inc.', 'stocks', 'NASDAQ'),
('NFLX', 'Netflix Inc.', 'stocks', 'NASDAQ'),
('BRK.B', 'Berkshire Hathaway', 'stocks', 'NYSE'),
('JPM', 'JPMorgan Chase & Co.', 'stocks', 'NYSE'),
('V', 'Visa Inc.', 'stocks', 'NYSE'),
('WMT', 'Walmart Inc.', 'stocks', 'NYSE'),
('PETR4.SA', 'Petrobras', 'stocks', 'B3'),
('VALE3.SA', 'Vale S.A.', 'stocks', 'B3'),

('IXIC', 'Nasdaq Composite', 'indices', 'NASDAQ'),
('DJI', 'Dow Jones Industrial Average', 'indices', 'NYSE'),
('FTSE', 'FTSE 100', 'indices', 'LSE'),
('DAX', 'DAX 40', 'indices', 'XETRA'),
('N225', 'Nikkei 225', 'indices', 'TSE'),
('IBOV', 'Ibovespa', 'indices', 'B3'),

('SILVER', 'Silver', 'commodities', 'COMEX'),
('OIL_WTI', 'WTI Crude Oil', 'commodities', 'NYMEX'),
('OIL_BRENT', 'Brent Crude Oil', 'commodities', 'ICE'),
('NAT_GAS', 'Natural Gas', 'commodities', 'NYMEX'),
('COPPER', 'Copper', 'commodities', 'COMEX'),
('CORN', 'Corn', 'commodities', 'CBOT'),
('WHEAT', 'Wheat', 'commodities', 'CBOT'),

('SPY', 'SPDR S&P 500 ETF Trust', 'etfs', 'ARCA'),
('QQQ', 'Invesco QQQ Trust', 'etfs', 'NASDAQ'),
('VTI', 'Vanguard Total Stock Market', 'etfs', 'ARCA'),
('ARKK', 'ARK Innovation ETF', 'etfs', 'ARCA'),
('GLD', 'SPDR Gold Shares', 'etfs', 'ARCA')
ON CONFLICT (symbol) DO NOTHING;
\n
