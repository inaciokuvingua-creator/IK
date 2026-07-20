import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CandlestickChart, Newspaper, ShieldAlert, Loader2 } from 'lucide-react';
import { TradingProvider, useTrading } from '../context/TradingContext';
import MarketScanner from '../components/Trading/MarketScanner';
import AIAnalysisPanel from '../components/Trading/AIAnalysisPanel';
import PredictionCard from '../components/Trading/PredictionCard';
import EconomicCalendar from '../components/Trading/EconomicCalendar';
import IntelligenceAggregator from '../components/Trading/IntelligenceAggregator';
import ExchangeTicker from '../components/Trading/ExchangeTicker';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];
const INDICATORS = ['MA20', 'MA50', 'MA200', 'RSI', 'MACD', 'Bollinger', 'Volume', 'S/R'];

function fmtPrice(value: number | null | undefined): string {
  if (value == null || !isFinite(Number(value))) return '—';
  const n = Number(value);
  return n >= 1000
    ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : `$${n.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
}

function fmtPct(value: number | null | undefined): string {
  if (value == null || !isFinite(Number(value))) return '—';
  return `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
}

function fmtTime(value: string | null | undefined): string {
  if (!value) return 'Nunca';
  try {
    return new Date(value).toLocaleString('pt-AO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return 'Nunca';
  }
}

function ProfessionalChartShell() {
  const { selectedAsset, analysis, loading } = useTrading();
  const [interval, setInterval] = useState('4h');
  const [enabled, setEnabled] = useState<string[]>(['MA20', 'MA50', 'RSI', 'Volume', 'S/R']);

  const symbol = selectedAsset?.symbol ?? '—';
  const name = selectedAsset?.name ?? 'Selecione um ativo no scanner';
  const price = selectedAsset ? Number(selectedAsset.last_price) : null;
  const change = selectedAsset ? Number(selectedAsset.price_change_percent_24h) : null;
  const high = selectedAsset?.high_24h ? Number(selectedAsset.high_24h) : null;
  const low = selectedAsset?.low_24h ? Number(selectedAsset.low_24h) : null;
  const volume = selectedAsset?.volume_24h ? Number(selectedAsset.volume_24h) : null;
  const lastSync = selectedAsset?.last_sync_at ?? null;
  const candles = (analysis as any)?.candles ?? (analysis as any)?.ohlcv ?? null;
  const provider = (analysis as any)?.provider ?? (analysis as any)?.source ?? null;

  const providerStatus = useMemo(() => {
    if (!selectedAsset) return 'Selecione um ativo para carregar dados reais';
    if (loading) return 'A carregar dados do fornecedor...';
    if (provider) return `Dados reais via ${provider}`;
    if (lastSync) return `Última sincronização ${fmtTime(lastSync)}`;
    return 'A aguardar dados reais do fornecedor configurado';
  }, [selectedAsset, loading, provider, lastSync]);

  const hasCandles = Array.isArray(candles) && candles.length > 0;

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-950/70 overflow-hidden">
      {/* Cabeçalho: ativo + preço dinâmico */}
      <div className="flex flex-col gap-4 border-b border-slate-800 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-white font-semibold">
            <CandlestickChart className="text-emerald-400 shrink-0" size={20} />
            <span className="truncate">{symbol}</span>
            {change != null && (
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${change >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                {fmtPct(change)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400 truncate">
            {name} · {providerStatus} · UTC
          </p>
          {price != null && (
            <p className="mt-1 text-2xl font-bold text-white font-mono">{fmtPrice(price)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {INTERVALS.map(item => (
            <button
              key={item}
              onClick={() => setInterval(item)}
              className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${interval === item ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Indicadores */}
      <div className="flex flex-wrap gap-2 p-4">
        {INDICATORS.map(item => (
          <button
            key={item}
            onClick={() => setEnabled(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item])}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${enabled.includes(item) ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-300' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Área do gráfico — dinâmica conforme candles recebidas */}
      <div className="relative mx-4 mb-4 h-80 rounded-xl border border-slate-800 bg-[linear-gradient(to_right,rgba(51,65,85,.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,.22)_1px,transparent_1px)] bg-[size:48px_40px] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-400" size={28} />
          </div>
        )}

        {!loading && !hasCandles && (
          <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
            <div>
              <Activity className="mx-auto mb-3 text-emerald-400" />
              <p className="font-medium text-white">
                {selectedAsset ? 'Sem velas disponíveis para este ativo' : 'Selecione um ativo no scanner'}
              </p>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                A Edge Function entrega velas OHLCV normalizadas de Twelve Data, Alpha Vantage ou Massive. Nenhum preço é simulado quando a fonte está indisponível.
              </p>
            </div>
          </div>
        )}

        {!loading && hasCandles && (
          <div className="absolute bottom-3 right-3 rounded-lg bg-slate-950/90 px-3 py-2 text-xs text-slate-400">
            {candles.length} velas · intervalo {interval} · fonte {provider ?? 'real'}
          </div>
        )}

        <div className="absolute bottom-3 left-3 rounded-lg bg-slate-950/90 px-3 py-2 text-xs text-slate-400">
          Projeções futuras aparecem como faixas condicionais, não como certezas.
        </div>
      </div>

      {/* Estatísticas 24h dinâmicas */}
      {(high != null || low != null || volume != null) && (
        <div className="flex flex-wrap gap-4 px-4 pb-4 text-xs text-slate-400">
          {high != null && (
            <span>Máx 24h: <span className="text-emerald-400 font-mono">{fmtPrice(high)}</span></span>
          )}
          {low != null && (
            <span>Mín 24h: <span className="text-red-400 font-mono">{fmtPrice(low)}</span></span>
          )}
          {volume != null && (
            <span>Volume 24h: <span className="text-white font-mono">{volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></span>
          )}
          {lastSync && (
            <span>Sync: <span className="text-slate-300">{fmtTime(lastSync)}</span></span>
          )}
        </div>
      )}
    </section>
  );
}

function TradeInner() {
  const { selectedAsset, analysis, predictions, loading, error } = useTrading();

  const hasAnalysis = !!analysis;
  const hasPredictions = !!predictions;

  return (
    <div className="space-y-6 -mt-5 -mx-5 lg:-mt-7 lg:-mx-7">
      <ExchangeTicker />

      <div className="px-5 lg:px-7 space-y-6 pt-6">
        <header className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/20 p-3 shrink-0">
            <CandlestickChart className="text-emerald-400" size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">IK Trading Intelligence</h1>
            <p className="text-sm text-slate-400">
              {selectedAsset
                ? `Análise de ${selectedAsset.symbol} com dados reais e cenários probabilísticos explicáveis`
                : 'Selecione um ativo no scanner para ver análise profissional com dados reais'}
            </p>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <ProfessionalChartShell />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div>
            <MarketScanner />
          </div>
          <div className="space-y-6 lg:col-span-2">
            {loading && !hasAnalysis && (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-emerald-400" size={24} />
              </div>
            )}

            {!loading && !hasAnalysis && selectedAsset && (
              <div className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-5 text-center text-sm text-slate-400">
                A análise ainda não está disponível para este ativo. Tente novamente em alguns instantes.
              </div>
            )}

            {!selectedAsset && (
              <div className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-5 text-center text-sm text-slate-400">
                Selecione um ativo no scanner à esquerda para carregar a análise.
              </div>
            )}

            {hasAnalysis && <IntelligenceAggregator />}
            {hasAnalysis && <AIAnalysisPanel />}
            {hasPredictions && <PredictionCard />}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-white">
              <Newspaper className="text-cyan-400" size={19} /> Notícias, sentimento e fatores macro
            </h2>
            <p className="text-sm text-slate-400">
              A análise combina informações técnicas, fundamentais e macroeconómicas, mostra fontes e reduz a confiança quando os sinais entram em conflito.
            </p>
          </section>
          <section className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-white">
              <ShieldAlert className="text-amber-400" size={19} /> Gestão de risco
            </h2>
            <p className="text-sm text-slate-400">
              Zonas de risco, oportunidade e invalidação são apresentadas com horizonte definido. A plataforma pode abster-se quando os dados forem insuficientes.
            </p>
          </section>
        </div>

        <EconomicCalendar />

        <aside className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-slate-300">
          <p className="flex gap-2">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={16} />
            <span>
              <strong>Aviso:</strong> As análises são educacionais e probabilísticas. Não constituem aconselhamento financeiro, recomendação de investimento ou garantia de desempenho. Mercados financeiros envolvem risco, incluindo a possibilidade de perda total do capital.
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}

export default function Trade() {
  return (
    <TradingProvider>
      <TradeInner />
    </TradingProvider>
  );
}
