import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import type { TradingAsset, MarketAnalysis, AIPrediction, TradeAnalysisResponse, EconomicEvent } from '../types/trading';
import { supabase } from '../lib/supabase';
  
interface TradingContextType {
  assets: TradingAsset[];
  selectedAsset: TradingAsset | null;
  analysis: TradeAnalysisResponse | null;
  predictions: AIPrediction | null;
  economicEvents: EconomicEvent[];
  loading: boolean;
  error: string | null;
  
  setSelectedAsset: (asset: TradingAsset | null) => void;
  fetchAssets: () => Promise<void>;
  analyzeAsset: (symbol: string) => Promise<void>;
  fetchEconomicEvents: () => Promise<void>;
  clearError: () => void;
} 

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<TradingAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<TradingAsset | null>(null);
  const [analysis, setAnalysis] = useState<TradeAnalysisResponse | null>(null);
  const [predictions, setPredictions] = useState<AIPrediction | null>(null);
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('trading_assets')
        .select('*')
        .eq('is_active', true);
      
      if (err) throw err;
      setAssets(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ativos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const analyzeAsset = useCallback(async (symbol: string) => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar contexto de conversas anteriores (AI Intelligence)
      const { data: convData } = await supabase
        .from('ai_conversations')
        .select('mensagens')
        .order('updated_at', { ascending: false })
        .limit(3);
      
      let externalContext = "";
      if (convData) {
        externalContext = convData
          .map(c => Array.isArray(c.mensagens) ? c.mensagens.slice(-2).map((m: any) => m.content).join(" ") : "")
          .join(" ")
          .substring(0, 500); // Limitar tamanho do contexto
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ik-trading-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ 
            asset_symbol: symbol, 
            type: 'analysis',
            external_context: externalContext 
          }),
        }
      );

      if (!response.ok) throw new Error('Erro ao analisar ativo');
      const data = await response.json();
      setAnalysis(data);

      // Fetch predictions for this asset
      const { data: predData } = await supabase
        .from('ai_predictions')
        .select('*')
        .eq('asset_id', selectedAsset?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (predData) setPredictions(predData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na análise');
    } finally {
      setLoading(false);
    }
  }, [user, selectedAsset?.id]);

  const fetchEconomicEvents = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error: err } = await supabase
        .from('economic_events')
        .select('*')
        .gte('event_time', new Date().toISOString())
        .order('event_time', { ascending: true })
        .limit(10);
      
      if (err) throw err;
      setEconomicEvents(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos económicos');
    }
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (user) {
      fetchAssets();
      fetchEconomicEvents();
    }
  }, [user, fetchAssets, fetchEconomicEvents]);

  return (
    <TradingContext.Provider
      value={{
        assets,
        selectedAsset,
        analysis,
        predictions,
        economicEvents,
        loading,
        error,
        setSelectedAsset,
        fetchAssets,
        analyzeAsset,
        fetchEconomicEvents,
        clearError,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTrading deve ser usado dentro de TradingProvider');
  }
  return context;
}
