-- =============================================================================
-- IK FINANCE — Fix: Search, Comunidade, Chat, RLS, Realtime
-- Corrige coluna is_verified → verified, RLS user_public_profiles,
-- políticas de chat, e Realtime para chat_conversations/chat_participants.
-- Idempotente: pode ser executada mais de uma vez sem erro.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. user_public_profiles: garantir que a tabela existe com esquema correto
-- ---------------------------------------------------------------------------

-- Cria a tabela se não existir (caso só exista user_profiles)
CREATE TABLE IF NOT EXISTS public.user_public_profiles (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             text NOT NULL DEFAULT '',
  full_name        text,
  display_name     text,
  username         text UNIQUE,
  email            text,
  bio              text,
  avatar_url       text,
  country          text,
  city             text,
  province         text,
  account_type     text DEFAULT 'personal',
  plan             text DEFAULT 'free',
  company_name     text,
  company_category text,
  social_links     jsonb NOT NULL DEFAULT '{}',
  verified         boolean NOT NULL DEFAULT false,
  trial_started_at timestamptz,
  trial_ends_at    timestamptz,
  trial_active     boolean NOT NULL DEFAULT false,
  plan_expires_at  timestamptz,
  idioma           text DEFAULT 'pt',
  preferred_language text DEFAULT 'pt',
  profile_completion integer NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Se a tabela já existia com is_verified, renomear para verified
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_public_profiles'
      AND column_name  = 'is_verified'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_public_profiles'
      AND column_name  = 'verified'
  ) THEN
    ALTER TABLE public.user_public_profiles RENAME COLUMN is_verified TO verified;
  END IF;
END $$;

-- Garantir que verified existe (se a tabela foi criada sem ela)
ALTER TABLE public.user_public_profiles
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- Garantir colunas usadas pelo frontend
ALTER TABLE public.user_public_profiles
  ADD COLUMN IF NOT EXISTS full_name       text,
  ADD COLUMN IF NOT EXISTS display_name    text,
  ADD COLUMN IF NOT EXISTS username        text,
  ADD COLUMN IF NOT EXISTS email           text,
  ADD COLUMN IF NOT EXISTS bio             text,
  ADD COLUMN IF NOT EXISTS country         text,
  ADD COLUMN IF NOT EXISTS city            text,
  ADD COLUMN IF NOT EXISTS province        text,
  ADD COLUMN IF NOT EXISTS account_type    text DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS plan            text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS company_name    text,
  ADD COLUMN IF NOT EXISTS social_links    jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at    timestamptz,
  ADD COLUMN IF NOT EXISTS trial_active     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_expires_at  timestamptz,
  ADD COLUMN IF NOT EXISTS idioma           text DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS profile_completion integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at       timestamptz DEFAULT now();

-- ---------------------------------------------------------------------------
-- 2. RLS para user_public_profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_public_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "upp_select_all"     ON public.user_public_profiles;
DROP POLICY IF EXISTS "upp_insert_own"     ON public.user_public_profiles;
DROP POLICY IF EXISTS "upp_update_own"     ON public.user_public_profiles;
DROP POLICY IF EXISTS "upp_delete_own"     ON public.user_public_profiles;
DROP POLICY IF EXISTS "upp_service"        ON public.user_public_profiles;

-- Qualquer utilizador autenticado pode ver perfis públicos
CREATE POLICY "upp_select_all" ON public.user_public_profiles
  FOR SELECT TO authenticated USING (true);

-- Cada utilizador só pode criar o seu próprio perfil
CREATE POLICY "upp_insert_own" ON public.user_public_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Cada utilizador só pode atualizar o seu próprio perfil
CREATE POLICY "upp_update_own" ON public.user_public_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cada utilizador só pode apagar o seu próprio perfil
CREATE POLICY "upp_delete_own" ON public.user_public_profiles
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Service role tem acesso total (para funções de backend)
CREATE POLICY "upp_service" ON public.user_public_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. Sincronizar user_profiles → user_public_profiles (se ambas existirem)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    INSERT INTO public.user_public_profiles (
      user_id, nome, full_name, display_name, username, email,
      bio, avatar_url, country, city, province,
      account_type, plan, company_name, social_links,
      verified, idioma, preferred_language, profile_completion,
      updated_at, created_at
    )
    SELECT
      up.user_id,
      COALESCE(up.nome, ''),
      up.full_name,
      up.display_name,
      up.username,
      up.email,
      COALESCE(up.public_bio, up.bio),
      up.avatar_url,
      up.country,
      up.city,
      up.province,
      COALESCE(up.account_type, 'personal'),
      COALESCE(up.plan, 'free'),
      up.company_name,
      COALESCE(up.social_links, '{}'),
      COALESCE(up.verified, false),
      COALESCE(up.idioma, up.preferred_language, 'pt'),
      COALESCE(up.preferred_language, up.idioma, 'pt'),
      COALESCE(up.profile_completion, 0),
      COALESCE(up.updated_at, now()),
      COALESCE(up.created_at, now())
    FROM public.user_profiles up
    ON CONFLICT (user_id) DO UPDATE SET
      nome               = EXCLUDED.nome,
      full_name          = EXCLUDED.full_name,
      display_name       = EXCLUDED.display_name,
      username           = COALESCE(EXCLUDED.username, public.user_public_profiles.username),
      email              = COALESCE(EXCLUDED.email, public.user_public_profiles.email),
      bio                = COALESCE(EXCLUDED.bio, public.user_public_profiles.bio),
      avatar_url         = COALESCE(EXCLUDED.avatar_url, public.user_public_profiles.avatar_url),
      country            = COALESCE(EXCLUDED.country, public.user_public_profiles.country),
      city               = COALESCE(EXCLUDED.city, public.user_public_profiles.city),
      province           = COALESCE(EXCLUDED.province, public.user_public_profiles.province),
      account_type       = COALESCE(EXCLUDED.account_type, public.user_public_profiles.account_type),
      plan               = COALESCE(EXCLUDED.plan, public.user_public_profiles.plan),
      company_name       = COALESCE(EXCLUDED.company_name, public.user_public_profiles.company_name),
      social_links       = COALESCE(EXCLUDED.social_links, public.user_public_profiles.social_links),
      verified           = COALESCE(EXCLUDED.verified, public.user_public_profiles.verified),
      idioma             = COALESCE(EXCLUDED.idioma, public.user_public_profiles.idioma),
      preferred_language = COALESCE(EXCLUDED.preferred_language, public.user_public_profiles.preferred_language),
      profile_completion = GREATEST(EXCLUDED.profile_completion, public.user_public_profiles.profile_completion),
      updated_at         = now();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Criar perfil em user_public_profiles ao registar (trigger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_public_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_public_profiles (user_id, email, nome, display_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(split_part(NEW.email, '@', 1), 'utilizador'),
    COALESCE(split_part(NEW.email, '@', 1), 'utilizador'),
    COALESCE(split_part(NEW.email, '@', 1), 'ik_' || substr(NEW.id::text, 1, 6))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_public_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_public_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_public_profile();

-- Backfill para utilizadores existentes
INSERT INTO public.user_public_profiles (user_id, email, nome, display_name, username)
SELECT
  id,
  email,
  COALESCE(split_part(COALESCE(email,''), '@', 1), 'utilizador'),
  COALESCE(split_part(COALESCE(email,''), '@', 1), 'utilizador'),
  COALESCE(split_part(COALESCE(email,''), '@', 1), 'ik_' || substr(id::text, 1, 6))
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Corrigir user_profiles: restaurar RLS de INSERT/UPDATE
--    (20260714_fix_rls_policies.sql destruiu todas as políticas)
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_public" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own"    ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own"    ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_own"    ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_service"       ON public.user_profiles;

-- SELECT: pode-se ver qualquer perfil (dados públicos)
CREATE POLICY "user_profiles_select_public" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_profiles_update_own" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_profiles_delete_own" ON public.user_profiles
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "user_profiles_service" ON public.user_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 6. Chat: limpar políticas antigas conflituosas (do 20260704073510)
--    e criar conjunto coeso idempotente
-- ---------------------------------------------------------------------------

-- Remover políticas antigas com nomes diferentes das que usamos
DROP POLICY IF EXISTS "conv_select"  ON public.chat_conversations;
DROP POLICY IF EXISTS "conv_insert"  ON public.chat_conversations;
DROP POLICY IF EXISTS "conv_update"  ON public.chat_conversations;
DROP POLICY IF EXISTS "conv_delete"  ON public.chat_conversations;

DROP POLICY IF EXISTS "part_select"  ON public.chat_participants;
DROP POLICY IF EXISTS "part_insert"  ON public.chat_participants;
DROP POLICY IF EXISTS "part_update"  ON public.chat_participants;
DROP POLICY IF EXISTS "part_delete"  ON public.chat_participants;

DROP POLICY IF EXISTS "msg_select"   ON public.chat_messages;
DROP POLICY IF EXISTS "msg_insert"   ON public.chat_messages;
DROP POLICY IF EXISTS "msg_update"   ON public.chat_messages;
DROP POLICY IF EXISTS "msg_delete"   ON public.chat_messages;

-- Remover também as políticas do 20260718090000 para recriar de forma limpa
DROP POLICY IF EXISTS "chat_conversations_select" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_insert" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_update" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_participants_select"  ON public.chat_participants;
DROP POLICY IF EXISTS "chat_participants_insert"  ON public.chat_participants;
DROP POLICY IF EXISTS "chat_participants_update"  ON public.chat_participants;
DROP POLICY IF EXISTS "chat_messages_select"      ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert"      ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_update"      ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete"      ON public.chat_messages;

-- Função auxiliar SECURITY DEFINER para evitar recursão
CREATE OR REPLACE FUNCTION public.is_chat_member(p_conversation uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE conversation_id = p_conversation
      AND user_id = p_user
      AND left_at IS NULL
  );
$$;

-- Manter também is_chat_participant por compatibilidade com código existente
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_conversation uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_chat_member(p_conversation, p_user);
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid)  TO authenticated;

-- chat_conversations: RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_conversations_select" ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_chat_member(id, auth.uid()));

CREATE POLICY "chat_conversations_insert" ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "chat_conversations_update" ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_chat_member(id, auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_chat_member(id, auth.uid()));

CREATE POLICY "chat_conversations_delete" ON public.chat_conversations
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- chat_participants: RLS
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- SELECT: pode ver participantes se for membro da conversa
CREATE POLICY "chat_participants_select" ON public.chat_participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_chat_member(conversation_id, auth.uid()));

-- INSERT: pode inserir-se a si próprio OU a terceiros se for o criador da conversa
CREATE POLICY "chat_participants_insert" ON public.chat_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

-- UPDATE: só pode atualizar a sua própria entrada
CREATE POLICY "chat_participants_update" ON public.chat_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: só pode sair de conversas das quais faz parte
CREATE POLICY "chat_participants_delete" ON public.chat_participants
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- chat_messages: RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.is_chat_member(conversation_id, auth.uid()));

CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_chat_member(conversation_id, auth.uid())
  );

CREATE POLICY "chat_messages_update" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "chat_messages_delete" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7. Garantir RPC create_direct_conversation (transacional, seguro)
--    Evita race condition e problemas de RLS no ensureDirectConversation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_direct_conversation(
  p_current_user uuid,
  p_target_user  uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_new      uuid;
BEGIN
  -- Verificar se já existe conversa direta entre os dois utilizadores
  SELECT c.id INTO v_existing
  FROM public.chat_conversations c
  WHERE c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM public.chat_participants p1
      WHERE p1.conversation_id = c.id AND p1.user_id = p_current_user AND p1.left_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_participants p2
      WHERE p2.conversation_id = c.id AND p2.user_id = p_target_user AND p2.left_at IS NULL
    )
  ORDER BY c.updated_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Criar nova conversa
  INSERT INTO public.chat_conversations (type, created_by)
  VALUES ('direct', p_current_user)
  RETURNING id INTO v_new;

  -- Adicionar ambos os participantes
  INSERT INTO public.chat_participants (conversation_id, user_id, role)
  VALUES
    (v_new, p_current_user, 'admin'),
    (v_new, p_target_user,  'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Realtime: garantir publicação das tabelas de chat
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants  REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages      REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 9. Índices de pesquisa em user_public_profiles
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_upp_nome
  ON public.user_public_profiles (lower(nome));

CREATE INDEX IF NOT EXISTS idx_upp_username
  ON public.user_public_profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_upp_verified
  ON public.user_public_profiles (verified);

CREATE INDEX IF NOT EXISTS idx_upp_account_type
  ON public.user_public_profiles (account_type);
