-- =============================================================================
-- Migração: Chat + Feed Comunitário
-- Cria toda a infraestrutura usada por src/pages/Chat.tsx e
-- src/components/Community/CommunityFeed.tsx (a base de dados estava vazia).
-- Idempotente: pode ser executada mais de uma vez sem erro.
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- PERFIS (mínimo necessário para o Chat resolver nomes/avatares)
-- =============================================================================
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  display_name text,
  username text unique,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_select on public.user_profiles;
create policy user_profiles_select on public.user_profiles
  for select to authenticated using (true);

drop policy if exists user_profiles_insert on public.user_profiles;
create policy user_profiles_insert on public.user_profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists user_profiles_update on public.user_profiles;
create policy user_profiles_update on public.user_profiles
  for update to authenticated using (user_id = auth.uid());

-- Cria o perfil automaticamente quando um utilizador se regista
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (user_id, email, nome)
  values (new.id, new.email, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Garante perfis para contas já existentes
insert into public.user_profiles (user_id, email, nome)
select id, email, split_part(coalesce(email, ''), '@', 1) from auth.users
on conflict (user_id) do nothing;

-- =============================================================================
-- CHAT
-- =============================================================================
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct','group')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_read_at timestamptz,
  unique (conversation_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'text' check (type in ('text','image','audio','video','file','deleted')),
  content text,
  media_url text,
  media_name text,
  media_mime text,
  media_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_conversation on public.chat_messages (conversation_id, created_at);
create index if not exists idx_chat_participants_user on public.chat_participants (user_id) where left_at is null;

-- Helper SECURITY DEFINER: evita recursão infinita nas policies de RLS
create or replace function public.is_chat_participant(p_conversation uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chat_participants
    where conversation_id = p_conversation and user_id = p_user and left_at is null
  );
$$;

alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists chat_conversations_select on public.chat_conversations;
create policy chat_conversations_select on public.chat_conversations
  for select to authenticated
  using (created_by = auth.uid() or public.is_chat_participant(id, auth.uid()));

drop policy if exists chat_conversations_insert on public.chat_conversations;
create policy chat_conversations_insert on public.chat_conversations
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists chat_conversations_update on public.chat_conversations;
create policy chat_conversations_update on public.chat_conversations
  for update to authenticated
  using (created_by = auth.uid() or public.is_chat_participant(id, auth.uid()));

drop policy if exists chat_participants_select on public.chat_participants;
create policy chat_participants_select on public.chat_participants
  for select to authenticated
  using (user_id = auth.uid() or public.is_chat_participant(conversation_id, auth.uid()));

drop policy if exists chat_participants_insert on public.chat_participants;
create policy chat_participants_insert on public.chat_participants
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
  );

drop policy if exists chat_participants_update on public.chat_participants;
create policy chat_participants_update on public.chat_participants
  for update to authenticated using (user_id = auth.uid());

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (public.is_chat_participant(conversation_id, auth.uid()));

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_chat_participant(conversation_id, auth.uid()));

drop policy if exists chat_messages_update on public.chat_messages;
create policy chat_messages_update on public.chat_messages
  for update to authenticated using (sender_id = auth.uid());

drop policy if exists chat_messages_delete on public.chat_messages;
create policy chat_messages_delete on public.chat_messages
  for delete to authenticated using (sender_id = auth.uid());

-- Mantém updated_at da conversa em dia a cada nova mensagem
create or replace function public.bump_conversation_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.chat_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_bump_conversation on public.chat_messages;
create trigger trg_bump_conversation
  after insert on public.chat_messages
  for each row execute function public.bump_conversation_updated_at();

-- =============================================================================
-- RATE LIMIT (usado por src/lib/marketplaceGuardrails.ts)
-- =============================================================================
create table if not exists public.marketplace_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_key text not null,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  blocked_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, action, window_key)
);

alter table public.marketplace_rate_limits enable row level security;

drop policy if exists rate_limits_all_own on public.marketplace_rate_limits;
create policy rate_limits_all_own on public.marketplace_rate_limits
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =============================================================================
-- STORAGE: bucket chat-media (uploads do chat)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

drop policy if exists "chat-media upload own folder" on storage.objects;
create policy "chat-media upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat-media public read" on storage.objects;
create policy "chat-media public read" on storage.objects
  for select using (bucket_id = 'chat-media');

drop policy if exists "chat-media delete own" on storage.objects;
create policy "chat-media delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- FEED COMUNITÁRIO
-- =============================================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null,
  author_nome text,
  author_avatar text,
  visibility text not null default 'publico' check (visibility in ('publico','seguidores')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null default 'like'
    check (reaction_type in ('like','love','laugh','wow','sad','angry')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.post_comments(id) on delete cascade,
  content text not null,
  author_nome text,
  author_avatar text,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  shared_to text not null default 'feed',
  created_at timestamptz not null default now(),
  unique (post_id, user_id, shared_to)
);

create index if not exists idx_posts_created on public.posts (created_at desc);
create index if not exists idx_post_reactions_post on public.post_reactions (post_id);
create index if not exists idx_post_comments_post on public.post_comments (post_id, created_at);
create index if not exists idx_post_shares_post on public.post_shares (post_id);

alter table public.posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_shares enable row level security;

drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated using (true);

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated with check (user_id = auth.uid());

drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated using (user_id = auth.uid());

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated using (user_id = auth.uid());

drop policy if exists post_reactions_select on public.post_reactions;
create policy post_reactions_select on public.post_reactions for select to authenticated using (true);

drop policy if exists post_reactions_insert on public.post_reactions;
create policy post_reactions_insert on public.post_reactions for insert to authenticated with check (user_id = auth.uid());

drop policy if exists post_reactions_update on public.post_reactions;
create policy post_reactions_update on public.post_reactions for update to authenticated using (user_id = auth.uid());

drop policy if exists post_reactions_delete on public.post_reactions;
create policy post_reactions_delete on public.post_reactions for delete to authenticated using (user_id = auth.uid());

drop policy if exists post_comments_select on public.post_comments;
create policy post_comments_select on public.post_comments for select to authenticated using (true);

drop policy if exists post_comments_insert on public.post_comments;
create policy post_comments_insert on public.post_comments for insert to authenticated with check (user_id = auth.uid());

drop policy if exists post_comments_update on public.post_comments;
create policy post_comments_update on public.post_comments for update to authenticated using (user_id = auth.uid());

drop policy if exists post_comments_delete on public.post_comments;
create policy post_comments_delete on public.post_comments for delete to authenticated using (user_id = auth.uid());

drop policy if exists post_shares_select on public.post_shares;
create policy post_shares_select on public.post_shares for select to authenticated using (true);

drop policy if exists post_shares_insert on public.post_shares;
create policy post_shares_insert on public.post_shares for insert to authenticated with check (user_id = auth.uid());

-- =============================================================================
-- RPCs usadas pelo CommunityFeed
-- =============================================================================
create or replace function public.toggle_post_reaction(
  p_post_id uuid,
  p_user_id uuid,
  p_reaction_type text default 'like'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_existing text;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Não autorizado';
  end if;

  select reaction_type into v_existing
  from public.post_reactions
  where post_id = p_post_id and user_id = p_user_id;

  if v_existing is null then
    insert into public.post_reactions (post_id, user_id, reaction_type)
    values (p_post_id, p_user_id, p_reaction_type);
    return jsonb_build_object('action', 'added', 'reaction', p_reaction_type);
  elsif v_existing = p_reaction_type then
    delete from public.post_reactions where post_id = p_post_id and user_id = p_user_id;
    return jsonb_build_object('action', 'removed');
  else
    update public.post_reactions
    set reaction_type = p_reaction_type, created_at = now()
    where post_id = p_post_id and user_id = p_user_id;
    return jsonb_build_object('action', 'changed', 'reaction', p_reaction_type);
  end if;
end $$;

create or replace function public.add_post_comment(
  p_post_id uuid,
  p_user_id uuid,
  p_content text,
  p_author_nome text default null,
  p_author_avatar text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Não autorizado';
  end if;
  if coalesce(trim(p_content), '') = '' then
    raise exception 'Comentário vazio';
  end if;

  insert into public.post_comments (post_id, user_id, content, author_nome, author_avatar)
  values (p_post_id, p_user_id, trim(p_content), p_author_nome, p_author_avatar)
  returning id into v_id;

  return v_id;
end $$;

create or replace function public.share_post(
  p_post_id uuid,
  p_user_id uuid,
  p_shared_to text default 'feed'
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Não autorizado';
  end if;

  insert into public.post_shares (post_id, user_id, shared_to)
  values (p_post_id, p_user_id, p_shared_to)
  on conflict (post_id, user_id, shared_to) do nothing;

  if found then
    return jsonb_build_object('action', 'shared');
  end if;
  return jsonb_build_object('action', 'already_shared');
end $$;

grant execute on function public.toggle_post_reaction(uuid, uuid, text) to authenticated;
grant execute on function public.add_post_comment(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.share_post(uuid, uuid, text) to authenticated;

-- =============================================================================
-- REALTIME
-- =============================================================================
alter table public.post_reactions replica identity full;
alter table public.post_comments replica identity full;
alter table public.chat_messages replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.post_comments;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.post_reactions;
exception when duplicate_object then null; end $$;
