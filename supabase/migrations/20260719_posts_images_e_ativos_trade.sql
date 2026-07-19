-- 1) Suporte a imagens nas publicações
alter table public.posts add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.posts add column if not exists username text;
alter table public.posts add column if not exists avatar_url text;

-- 2) Bucket de armazenamento para imagens de posts
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

do $$ begin
  create policy "post-images: upload autenticado"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'post-images');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "post-images: leitura publica"
    on storage.objects for select to public
    using (bucket_id = 'post-images');
exception when duplicate_object then null; end $$;

-- 3) Ativos iniciais do Trade (Scanner de Mercados)
insert into public.trading_assets (symbol, name, asset_class, type, is_active) values
  ('BTC/USD',  'Bitcoin',            'crypto',      'crypto',      true),
  ('ETH/USD',  'Ethereum',           'crypto',      'crypto',      true),
  ('BNB/USD',  'BNB',                'crypto',      'crypto',      true),
  ('SOL/USD',  'Solana',             'crypto',      'crypto',      true),
  ('XRP/USD',  'XRP',                'crypto',      'crypto',      true),
  ('EUR/USD',  'Euro / Dólar',       'forex',       'forex',       true),
  ('GBP/USD',  'Libra / Dólar',      'forex',       'forex',       true),
  ('USD/JPY',  'Dólar / Iene',       'forex',       'forex',       true),
  ('AAPL',     'Apple Inc.',         'stocks',      'stocks',      true),
  ('MSFT',     'Microsoft Corp.',    'stocks',      'stocks',      true),
  ('AMZN',     'Amazon.com Inc.',    'stocks',      'stocks',      true),
  ('TSLA',     'Tesla Inc.',         'stocks',      'stocks',      true),
  ('SPX500',   'S&P 500',            'indices',     'indices',     true),
  ('NDX100',   'Nasdaq 100',         'indices',     'indices',     true),
  ('XAU/USD',  'Ouro',               'commodities', 'commodities', true),
  ('WTI/USD',  'Petróleo WTI',       'commodities', 'commodities', true),
  ('SPY',      'SPDR S&P 500 ETF',   'etfs',        'etfs',        true),
  ('QQQ',      'Invesco QQQ ETF',    'etfs',        'etfs',        true)
on conflict do nothing;
