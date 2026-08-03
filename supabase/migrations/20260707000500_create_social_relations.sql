-- Create social relationship tables for following and blocking users.
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
