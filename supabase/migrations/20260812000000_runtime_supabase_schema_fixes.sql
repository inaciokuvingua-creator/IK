-- =============================================================================
-- IK FINANCE — correções de runtime para o schema usado pela aplicação
-- =============================================================================

-- 1) Colunas faltantes em posts/comments usados pelo frontend
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS author_nome text,
  ADD COLUMN IF NOT EXISTS author_avatar text;

-- 2) RPC para apagar publicação (compatível com CommunityFeed)
CREATE OR REPLACE FUNCTION public.delete_post(p_post_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('action', 'not_owner');
  END IF;

  SELECT user_id INTO v_owner
  FROM public.posts
  WHERE id = p_post_id;

  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('action', 'not_found');
  END IF;

  IF v_owner <> p_user_id THEN
    RETURN jsonb_build_object('action', 'not_owner');
  END IF;

  DELETE FROM public.posts WHERE id = p_post_id;
  RETURN jsonb_build_object('action', 'deleted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_post(uuid, uuid) TO authenticated;

-- 3) RPC para listar comentários de uma publicação compatível com PostView/CommunityFeed
CREATE OR REPLACE FUNCTION public.get_post_comments(p_post_id uuid)
RETURNS TABLE (
  id uuid,
  post_id uuid,
  user_id uuid,
  parent_id uuid,
  content text,
  nome text,
  username text,
  avatar_url text,
  likes_count integer,
  replies_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.post_id,
    pc.user_id,
    pc.parent_id,
    pc.content,
    COALESCE(pc.nome, pc.author_nome) AS nome,
    NULL::text AS username,
    COALESCE(pc.avatar_url, pc.author_avatar) AS avatar_url,
    pc.likes_count,
    (SELECT COUNT(*) FROM public.post_comments pc2 WHERE pc2.parent_id = pc.id) AS replies_count,
    pc.created_at,
    pc.updated_at
  FROM public.post_comments pc
  WHERE pc.post_id = p_post_id
  ORDER BY pc.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_comments(uuid) TO authenticated;

-- 4) RPC para contabilizar seguidores de loja (compatível com StoreProfile)
CREATE OR REPLACE FUNCTION public.count_store_followers(store_uuid uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.store_follows
  WHERE store_id = store_uuid;
$$;

GRANT EXECUTE ON FUNCTION public.count_store_followers(uuid) TO authenticated, anon;
