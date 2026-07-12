-- IK AI Trading Intelligence Schema

-- 1. Trading Assets Table
CREATE TABLE IF NOT EXISTS trading_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL UNIQUE,
    name text NOT NULL,
    type text NOT NULL, -- 'crypto', 'forex', 'stocks', 'indices', 'commodities', 'etfs'
    exchange text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Market Analysis Table
CREATE TABLE IF NOT EXISTS market_analysis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid REFERENCES trading_assets(id) ON DELETE CASCADE,
    technical_indicators jsonb, -- RSI, MACD, MA, etc.
    chart_patterns text[],
    support_resistance jsonb,
    market_sentiment text, -- 'bullish', 'bearish', 'neutral'
    sentiment_score numeric,
    summary text,
    created_at timestamptz DEFAULT now()
);

-- 3. Economic Events Table
CREATE TABLE IF NOT EXISTS economic_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name text NOT NULL,
    impact text NOT NULL, -- 'low', 'medium', 'high'
    currency text,
    actual numeric,
    forecast numeric,
    previous numeric,
    event_time timestamptz NOT NULL,
    category text,
    created_at timestamptz DEFAULT now()
);

-- 4. Trading Alerts Table
CREATE TABLE IF NOT EXISTS trading_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id uuid REFERENCES trading_assets(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'price', 'indicator', 'ai_signal'
    condition jsonb NOT NULL,
    is_triggered boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    triggered_at timestamptz
);

-- 5. AI Predictions Table
CREATE TABLE IF NOT EXISTS ai_predictions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid REFERENCES trading_assets(id) ON DELETE CASCADE,
    scenario_optimistic jsonb NOT NULL,
    scenario_neutral jsonb NOT NULL,
    scenario_pessimistic jsonb NOT NULL,
    probabilities jsonb NOT NULL,
    ai_explanation text NOT NULL,
    disclaimer text DEFAULT 'Trading envolve riscos. Não garantimos lucros.',
    valid_until timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE trading_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public read for assets, analysis, events, and predictions (or based on subscription)
CREATE POLICY "Allow public read for trading assets" ON trading_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow public read for market analysis" ON market_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow public read for economic events" ON economic_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow public read for ai predictions" ON ai_predictions FOR SELECT TO authenticated USING (true);

-- User specific alerts
CREATE POLICY "Users can manage their own alerts" ON trading_alerts 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Indices for performance
CREATE INDEX idx_trading_assets_type ON trading_assets(type);
CREATE INDEX idx_market_analysis_asset_id ON market_analysis(asset_id);
CREATE INDEX idx_economic_events_time ON economic_events(event_time);
CREATE INDEX idx_trading_alerts_user_id ON trading_alerts(user_id);
CREATE INDEX idx_ai_predictions_asset_id ON ai_predictions(asset_id);

-- Insert initial assets
INSERT INTO trading_assets (symbol, name, type, exchange) VALUES
('BTC/USDT', 'Bitcoin', 'crypto', 'Binance'),
('ETH/USDT', 'Ethereum', 'crypto', 'Binance'),
('EUR/USD', 'Euro / US Dollar', 'forex', 'OANDA'),
('AAPL', 'Apple Inc.', 'stocks', 'NASDAQ'),
('SPX', 'S&P 500', 'indices', 'CME'),
('GOLD', 'Gold', 'commodities', 'COMEX')
ON CONFLICT (symbol) DO NOTHING;
