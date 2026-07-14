// Trading Intelligence Types

export type AssetType = 'crypto' | 'forex' | 'stocks' | 'indices' | 'commodities' | 'etfs';
export type MarketSentiment = 'bullish' | 'bearish' | 'neutral';
export type ImpactLevel = 'low' | 'medium' | 'high';

export interface TradingAsset {
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

export interface ExternalIntelligence {
  summary: string;
  aggregated_sources: string[];
  source?: string;
  data?: Record<string, any>;
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
    recent_news?: string[];
  };
  predictions: {
    optimistic: ScenarioPrediction;
    neutral: ScenarioPrediction;
    pessimistic: ScenarioPrediction;
    explanation: string;
  };
  mentor?: {
    pro_tip: string;
    level: 'beginner' | 'intermediate' | 'advanced';
  };
  exchange_context?: {
    rates: Record<string, number>;
    timestamp: string;
  };
  external_intel?: ExternalIntelligence;
}
