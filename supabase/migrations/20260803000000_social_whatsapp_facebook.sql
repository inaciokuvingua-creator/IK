-- ============================================================================
-- SCRIPT COMPLETO E CORRIGIDO: WHATSAPP + FACEBOOK
-- ============================================================================

-- 1. EXTENSÕES E FUNÇÕES BASE
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. CRIAÇÃO DAS TABELAS (DDL)
-- ============================================================================

-- Amizades (Facebook)
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

-- Posts (Facebook)
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  media_urls text[],
  privacy text NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'private')),
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Garantir compatibilidade se a tabela `posts` já existia previamente
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.posts RENAME COLUMN user_id TO author_id;
  END IF;
END $$;

ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS privacy text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS media_urls text[],
  ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_count integer DEFAULT 0;

-- Reações nos Posts (Facebook)
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- Comentários nos Posts (Facebook)
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_url text,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stories (Facebook / WhatsApp)
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  caption text,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

-- Visualizações dos Stories (CORRIGIDO: REFERENCES auth.users(id))
CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

-- Conversas (WhatsApp)
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  title text,
  icon_url text,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Participantes das Conversas (WhatsApp)
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at timestamptz DEFAULT now(),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

-- Mensagens (WhatsApp)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'document', 'system')),
  content text,
  media_url text,
  media_mime text,
  media_size bigint,
  is_edited boolean DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Confirmador de Leitura (WhatsApp)
CREATE TABLE IF NOT EXISTS public.chat_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE (message_id, user_id)
);

-- ============================================================================
-- 3. ÍNDICES DE PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(requester_id, addressee_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_active ON public.stories(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at DESC);

-- ============================================================================
-- 4. TRIGGERS AUTOMÁTICOS DE ATUALIZAÇÃO
-- ============================================================================
DROP TRIGGER IF EXISTS trg_set_updated_at_posts ON public.posts;
CREATE TRIGGER trg_set_updated_at_posts
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_conversations ON public.chat_conversations;
CREATE TRIGGER trg_set_updated_at_conversations
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ============================================================================
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;

-- Limpeza preventiva de políticas anteriores para suportar re-execução sem erros
DROP POLICY IF EXISTS "Amizades visíveis pelos envolvidos" ON public.friendships;
DROP POLICY IF EXISTS "Solicitar ou gerenciar amizade" ON public.friendships;
DROP POLICY IF EXISTS "Leitura de posts públicos e de amigos" ON public.posts;
DROP POLICY IF EXISTS "Criar próprios posts" ON public.posts;
DROP POLICY IF EXISTS "Atualizar próprios posts" ON public.posts;
DROP POLICY IF EXISTS "Deletar próprios posts" ON public.posts;
DROP POLICY IF EXISTS "Ver reações de posts" ON public.post_reactions;
DROP POLICY IF EXISTS "Reagir a posts" ON public.post_reactions;
DROP POLICY IF EXISTS "Remover reação" ON public.post_reactions;
DROP POLICY IF EXISTS "Ver comentários" ON public.post_comments;
DROP POLICY IF EXISTS "Comentar em posts" ON public.post_comments;
DROP POLICY IF EXISTS "Ver stories ativos" ON public.stories;
DROP POLICY IF EXISTS "Criar próprio story" ON public.stories;
DROP POLICY IF EXISTS "Deletar próprio story" ON public.stories;
DROP POLICY IF EXISTS "Ver conversas que participa" ON public.chat_conversations;
DROP POLICY IF EXISTS "Criar conversa" ON public.chat_conversations;
DROP POLICY IF EXISTS "Ver participantes de suas conversas" ON public.chat_participants;
DROP POLICY IF EXISTS "Entrar em grupo/conversa" ON public.chat_participants;
DROP POLICY IF EXISTS "Ver mensagens de suas conversas" ON public.chat_messages;
DROP POLICY IF EXISTS "Enviar mensagem" ON public.chat_messages;

-- POLÍTICAS: AMIZADES
CREATE POLICY "Amizades visíveis pelos envolvidos" ON public.friendships
  FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Solicitar ou gerenciar amizade" ON public.friendships
  FOR ALL TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- POLÍTICAS: POSTS
CREATE POLICY "Leitura de posts públicos e de amigos" ON public.posts
  FOR SELECT TO authenticated USING (
    privacy = 'public' 
    OR author_id = auth.uid()
    OR (privacy = 'friends' AND EXISTS (
      SELECT 1 FROM public.friendships 
      WHERE status = 'accepted' 
      AND ((requester_id = auth.uid() AND addressee_id = posts.author_id) 
        OR (addressee_id = auth.uid() AND requester_id = posts.author_id))
    ))
  );

CREATE POLICY "Criar próprios posts" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Atualizar próprios posts" ON public.posts
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "Deletar próprios posts" ON public.posts
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- POLÍTICAS: REAÇÕES E COMENTÁRIOS
CREATE POLICY "Ver reações de posts" ON public.post_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reagir a posts" ON public.post_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Remover reação" ON public.post_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Ver comentários" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Comentar em posts" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- POLÍTICAS: STORIES
CREATE POLICY "Ver stories ativos" ON public.stories FOR SELECT TO authenticated USING (expires_at > now());
CREATE POLICY "Criar próprio story" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Deletar próprio story" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLÍTICAS: CHAT / WHATSAPP
CREATE POLICY "Ver conversas que participa" ON public.chat_conversations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE conversation_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Criar conversa" ON public.chat_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Ver participantes de suas conversas" ON public.chat_participants
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.conversation_id = chat_participants.conversation_id AND cp.user_id = auth.uid())
  );

CREATE POLICY "Entrar em grupo/conversa" ON public.chat_participants
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.chat_participants WHERE conversation_id = chat_participants.conversation_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Ver mensagens de suas conversas" ON public.chat_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid())
  );

CREATE POLICY "Enviar mensagem" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.chat_participants WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid()
    )
  );
