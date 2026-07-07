-- Create store follow relationships for users.
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
