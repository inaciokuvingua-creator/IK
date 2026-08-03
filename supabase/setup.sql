-- Compatibility bootstrap for the IK app.
-- Safe to re-run in a Supabase SQL editor.

create extension if not exists pgcrypto;

-- Ensure core tables exist without failing when re-run.
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
