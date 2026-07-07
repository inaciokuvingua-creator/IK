-- Create deals table to support 'Fazer Negócio' proposals
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

-- Trigger to update `updated_at` on row updates
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
