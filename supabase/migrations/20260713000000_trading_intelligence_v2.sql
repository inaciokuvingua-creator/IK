-- Trading Intelligence V2: real OHLCV, probabilistic scenarios and immutable evaluation history

create table if not exists public.market_candles (
  id bigint generated always as identity primary key,
  asset_id uuid not null references public.trading_assets(id) on delete cascade,
  provider text not null check (provider in ('twelve_data','alpha_vantage','massive')),
  interval text not null check (interval in ('1min','5min','15min','1h','4h','1day','1week')),
  candle_time timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume numeric,
  is_delayed boolean not null default false,
  received_at timestamptz not null default now(),
  unique(asset_id, provider, interval, candle_time),
  check (high >= greatest(open, close, low)),
  check (low <= least(open, close, high))
);

create table if not exists public.trading_prediction_runs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.trading_assets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  horizon text not null check (horizon in ('intraday','24h','7d','30d')),
  model_version text not null,
  input_snapshot jsonb not null,
  scenarios jsonb not null,
  confidence numeric not null check (confidence between 0 and 1),
  explanation jsonb not null,
  data_quality jsonb not null,
  abstained boolean not null default false,
  abstention_reason text,
  current_price numeric,
  valid_until timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trading_prediction_outcomes (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null unique references public.trading_prediction_runs(id) on delete cascade,
  observed_price numeric not null,
  observed_at timestamptz not null,
  winning_scenario text check (winning_scenario in ('optimistic','neutral','pessimistic','outside')),
  absolute_error numeric,
  percentage_error numeric,
  range_covered boolean,
  evaluated_at timestamptz not null default now()
);

create index if not exists market_candles_lookup_idx on public.market_candles(asset_id, interval, candle_time desc);
create index if not exists prediction_runs_asset_idx on public.trading_prediction_runs(asset_id, created_at desc);
create index if not exists prediction_runs_user_idx on public.trading_prediction_runs(user_id, created_at desc);

alter table public.market_candles enable row level security;
alter table public.trading_prediction_runs enable row level security;
alter table public.trading_prediction_outcomes enable row level security;

create policy "Authenticated users read market candles" on public.market_candles for select to authenticated using (true);
create policy "Authenticated users read prediction runs" on public.trading_prediction_runs for select to authenticated using (true);
create policy "Authenticated users read prediction outcomes" on public.trading_prediction_outcomes for select to authenticated using (true);

comment on table public.trading_prediction_runs is 'Immutable probabilistic scenarios. Never represents guaranteed future prices or profits.';
