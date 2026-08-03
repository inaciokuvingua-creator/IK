-- Create history table for exchange rates so we can detect significant changes
CREATE TABLE IF NOT EXISTS exchange_rates_history (
  id serial PRIMARY KEY,
  base_currency text NOT NULL DEFAULT 'KZ',
  currency text NOT NULL,
  rate numeric NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_history_currency ON exchange_rates_history(currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_history_fetched_at ON exchange_rates_history(fetched_at);
