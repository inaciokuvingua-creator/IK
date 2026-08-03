// Trading Intelligence Types

export type AssetType = 'crypto' | 'forex' | 'stocks' | 'indices' | 'commodities' | 'etfs';
export type MarketSentiment = 'bullish' | 'bearish' | 'neutral';
export type ImpactLevel = 'low' | 'medium' | 'high';

export interface TradingAssetBase {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  exchange?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: string;
  moving_averages: string;
  signals: string[];
}

export interface MarketAnalysis {
  id: string;
  asset_id: string;
  technical_indicators: TechnicalIndicators;
  chart_patterns: string[];
  support_resistance: {
    support: number[];
    resistance: number[];
  };
  market_sentiment: MarketSentiment;
  sentiment_score: number;
  summary: string;
  created_at: string;
}

export interface EconomicEvent {
  id: string;
  event_name: string;
  impact: ImpactLevel;
  currency?: string;
  actual?: number;
  forecast?: number;
  previous?: number;
  event_time: string;
  category: string;
  created_at: string;
}

export interface TradingAlert {
  id: string;
  user_id: string;
  asset_id: string;
  type: 'price' | 'indicator' | 'ai_signal';
  condition: Record<string, any>;
  is_triggered: boolean;
  created_at: string;
  triggered_at?: string;
}

export interface ScenarioPrediction {
  target: string;
  probability: number;
}

export interface AIPrediction {
  id: string;
  asset_id: string;
  scenario_optimistic: ScenarioPrediction;
  scenario_neutral: ScenarioPrediction;
  scenario_pessimistic: ScenarioPrediction;
  probabilities: Record<string, number>;
  ai_explanation: string;
  disclaimer: string;
  valid_until?: string;
  created_at: string;
}

export interface MarketCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingAsset extends TradingAssetBase {
  price: number;
  change: number;
  volume: string;
  trend: MarketSentiment;
  volatility: number;
  description: string;
  candles: MarketCandle[];
}

export interface TradingPosition {
  id: string;
  assetId: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  marginUsed: number;
  unrealizedPnl: number;
  openedAt: string;
}

export interface LearningModule {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  progress: number;
}

export interface EconomicNews {
  id: string;
  title: string;
  impact: 'low' | 'medium' | 'high';
  time: string;
  summary: string;
  category: string;
}

export interface TradingPsychology {
  fear: number;
  greed: number;
  impulsiveTrades: number;
  discipline: number;
  focus: number;
}

export type TradingTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
export type TradingIndicator = 'EMA' | 'RSI' | 'MACD' | 'Bollinger' | 'Fibonacci' | 'Volume' | 'Support/Resistance';
export type DrawingTool = 'Trend' | 'Support' | 'Resistance' | 'Fibonacci';

export interface TradingChallenge {
  id: string;
  title: string;
  description: string;
  reward: string;
  completed: boolean;
}

export interface TradingRankingEntry {
  id: string;
  name: string;
  xp: number;
  winRate: number;
  badge: string;
}

export interface TradeAnalysisResponse {
  asset: string;
  timestamp: string;
  technical: TechnicalIndicators;
  patterns: string[];
  sentiment: {
    score: number;
    label: MarketSentiment;
    news_summary: string;
    recent_news?: Array<{
      title: string;
      source: string;
      sentiment: string;
      time: string;
    }>;
  };
  predictions: {
    optimistic: ScenarioPrediction;
    neutral: ScenarioPrediction;
    pessimistic: ScenarioPrediction;
    explanation: string;
  };
  exchange_context?: {
    rates: Record<string, number>;
  };
  external_intel?: {
    summary: string;
    aggregated_sources: string[];
  };
}
