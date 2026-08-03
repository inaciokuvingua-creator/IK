export type AssetType =
  | "crypto"
  | "forex"
  | "stocks"
  | "indices"
  | "commodities"
  | "etfs";

export interface TradingAsset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  exchange?: string;
  currency?: string;
  last_price?: number;
  volume_24h?: number;
  market_cap?: number;
  volatility?: number;
  price_change_24h?: number;
  price_change_percent_24h?: number;
  data_source?: string;
  last_sync_at?: string;
}

export interface MarketSnapshot {
  id: string;
  asset_id: string;

  timeframe: string;
  snapshot_time: string;

  open?: number;
  high?: number;
  low?: number;
  close?: number;

  volume?: number;

  rsi?: number;
  macd?: number;
  macd_signal?: number;
  macd_histogram?: number;

  ema9?: number;
  ema21?: number;
  ema50?: number;
  ema100?: number;
  ema200?: number;

  sma20?: number;
  sma50?: number;
  sma100?: number;
  sma200?: number;

  atr?: number;

  support_levels?: number[];
  resistance_levels?: number[];

  fibonacci?: Record<string, number>;

  metadata?: Record<string, unknown>;
}


export interface MarketProvider {
  id: string;

  name: string;

  service_type:
    | "market_data"
    | "exchange_data";

  base_url: string;

  priority:number;

  active:boolean;

  supported_assets: Record<string, boolean>;

  last_sync_at?: string;

  last_status?: string;

  last_error?: string;
}


export interface MarketSyncLog {

  id:string;

  asset_id?:string;

  provider_id?:string;

  request_type:string;

  status:string;

  records_processed:number;

  response_time_ms?:number;

  error_message?:string;

  created_at:string;

}