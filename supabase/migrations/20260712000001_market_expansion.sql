-- Market Expansion: Adding a wide range of assets across all sectors

INSERT INTO trading_assets (symbol, name, type, exchange) VALUES
-- Crypto (Top 20+)
('SOL/USDT', 'Solana', 'crypto', 'Binance'),
('BNB/USDT', 'Binance Coin', 'crypto', 'Binance'),
('ADA/USDT', 'Cardano', 'crypto', 'Binance'),
('XRP/USDT', 'Ripple', 'crypto', 'Binance'),
('DOT/USDT', 'Polkadot', 'crypto', 'Binance'),
('DOGE/USDT', 'Dogecoin', 'crypto', 'Binance'),
('MATIC/USDT', 'Polygon', 'crypto', 'Binance'),
('LINK/USDT', 'Chainlink', 'crypto', 'Binance'),
('AVAX/USDT', 'Avalanche', 'crypto', 'Binance'),
('SHIB/USDT', 'Shiba Inu', 'crypto', 'Binance'),

-- Forex (Major, Minor, Exotic)
('GBP/USD', 'British Pound / US Dollar', 'forex', 'OANDA'),
('USD/JPY', 'US Dollar / Japanese Yen', 'forex', 'OANDA'),
('AUD/USD', 'Australian Dollar / US Dollar', 'forex', 'OANDA'),
('USD/CAD', 'US Dollar / Canadian Dollar', 'forex', 'OANDA'),
('USD/CHF', 'US Dollar / Swiss Franc', 'forex', 'OANDA'),
('NZD/USD', 'New Zealand Dollar / US Dollar', 'forex', 'OANDA'),
('EUR/GBP', 'Euro / British Pound', 'forex', 'OANDA'),
('USD/BRL', 'US Dollar / Brazilian Real', 'forex', 'OANDA'),
('EUR/BRL', 'Euro / Brazilian Real', 'forex', 'OANDA'),

-- Stocks (Tech, Energy, Finance, Retail)
('MSFT', 'Microsoft Corp.', 'stocks', 'NASDAQ'),
('GOOGL', 'Alphabet Inc.', 'stocks', 'NASDAQ'),
('AMZN', 'Amazon.com Inc.', 'stocks', 'NASDAQ'),
('TSLA', 'Tesla Inc.', 'stocks', 'NASDAQ'),
('NVDA', 'NVIDIA Corp.', 'stocks', 'NASDAQ'),
('META', 'Meta Platforms Inc.', 'stocks', 'NASDAQ'),
('NFLX', 'Netflix Inc.', 'stocks', 'NASDAQ'),
('BRK.B', 'Berkshire Hathaway', 'stocks', 'NYSE'),
('JPM', 'JPMorgan Chase & Co.', 'stocks', 'NYSE'),
('V', 'Visa Inc.', 'stocks', 'NYSE'),
('WMT', 'Walmart Inc.', 'stocks', 'NYSE'),
('PETR4.SA', 'Petrobras', 'stocks', 'B3'),
('VALE3.SA', 'Vale S.A.', 'stocks', 'B3'),

-- Indices
('IXIC', 'Nasdaq Composite', 'indices', 'NASDAQ'),
('DJI', 'Dow Jones Industrial Average', 'indices', 'NYSE'),
('FTSE', 'FTSE 100', 'indices', 'LSE'),
('DAX', 'DAX 40', 'indices', 'XETRA'),
('N225', 'Nikkei 225', 'indices', 'TSE'),
('IBOV', 'Ibovespa', 'indices', 'B3'),

-- Commodities
('SILVER', 'Silver', 'commodities', 'COMEX'),
('OIL_WTI', 'WTI Crude Oil', 'commodities', 'NYMEX'),
('OIL_BRENT', 'Brent Crude Oil', 'commodities', 'ICE'),
('NAT_GAS', 'Natural Gas', 'commodities', 'NYMEX'),
('COPPER', 'Copper', 'commodities', 'COMEX'),
('CORN', 'Corn', 'commodities', 'CBOT'),
('WHEAT', 'Wheat', 'commodities', 'CBOT'),

-- ETFs
('SPY', 'SPDR S&P 500 ETF Trust', 'etfs', 'ARCA'),
('QQQ', 'Invesco QQQ Trust', 'etfs', 'NASDAQ'),
('VTI', 'Vanguard Total Stock Market', 'etfs', 'ARCA'),
('ARKK', 'ARK Innovation ETF', 'etfs', 'ARCA'),
('GLD', 'SPDR Gold Shares', 'etfs', 'ARCA')
ON CONFLICT (symbol) DO NOTHING;
