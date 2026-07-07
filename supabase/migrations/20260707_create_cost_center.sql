-- Migration: Create tables for goal items, quotes and exchange rates

-- goal_items: products linked to a cofre (meta)
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

-- goal_item_quotes: supplier offers / breakdown (stored as JSONB for flexibility)
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

-- exchange_rates: latest exchange rates relative to a base currency (e.g. KZ)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id serial PRIMARY KEY,
  base_currency text NOT NULL DEFAULT 'KZ',
  currency text NOT NULL,
  rate numeric NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goal_items_cofre ON goal_items(cofre_id);
CREATE INDEX IF NOT EXISTS idx_goal_item_quotes_item ON goal_item_quotes(item_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(currency);

-- Trigger to update updated_at timestamps
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
