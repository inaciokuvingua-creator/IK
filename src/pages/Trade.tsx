import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BadgeCheck, BarChart3, BookOpen, BrainCircuit, ChevronRight, Clock3, Coins, DollarSign, Flame, GraduationCap, LineChart, Shield, Sparkles, Target, TrendingUp, Zap } from 'lucide-react';
import type { EconomicNews, LearningModule, MarketCandle, TradingAsset, TradingChallenge, TradingIndicator, TradingPosition, TradingPsychology, TradingRankingEntry, TradingTimeframe } from '../types/trading';

const createCandles = (basePrice: number, volatility: number, count = 48): MarketCandle[] => {
  const candles: MarketCandle[] = [];
  let price = basePrice;
  for (let i = 0; i < count; i += 1) {
    const open = price;
    const drift = (Math.random() - 0.5) * volatility;
    const close = Math.max(1, open + drift);
    const high = Math.max(open, close) + Math.abs(drift) * 0.8;
    const low = Math.min(open, close) - Math.abs(drift) * 0.8;
    candles.push({ open, high, low, close, volume: 1200 + i * 18 + Math.round(Math.random() * 300) });
    price = close;
  }
  return candles;
};

const initialAssets: TradingAsset[] = [
  {
    id: 'eurusd',
    symbol: 'EUR/USD',
    name: 'Euro vs Dólar',
    type: 'forex',
    exchange: 'IK Prime FX',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    price: 1.0848,
    change: 0.38,
    volume: '18.2B',
    trend: 'bullish',
    volatility: 0.0012,
    description: 'Momentum de alta após dados de inflação resilientes.',
    candles: createCandles(1.0848, 0.0012),
  },
  {
    id: 'btcusd',
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    type: 'crypto',
    exchange: 'IK Crypto',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    price: 65412,
    change: -1.12,
    volume: '4.8B',
    trend: 'neutral',
    volatility: 1800,
    description: 'Range apertado com pressão de venda institucional.',
    candles: createCandles(65412, 1800),
  },
  {
    id: 'sp500',
    symbol: 'SP500',
    name: 'S&P 500',
    type: 'indices',
    exchange: 'IK Futures',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    price: 5480,
    change: 0.82,
    volume: '2.6B',
    trend: 'bullish',
    volatility: 52,
    description: 'Risco de mercado em fase de recuperação estrutural.',
    candles: createCandles(5480, 52),
  },
  {
    id: 'xauusd',
    symbol: 'XAU/USD',
    name: 'Ouro',
    type: 'commodities',
    exchange: 'IK Metals',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    price: 2350,
    change: 0.19,
    volume: '1.1B',
    trend: 'bullish',
    volatility: 18,
    description: 'Proteção de portfólio e fluxo de hedge.',
    candles: createCandles(2350, 18),
  },
];

const initialLearning: LearningModule[] = [
  { id: 'basics', title: 'Fundamentos do mercado', category: 'Iniciante', completed: true, progress: 100 },
  { id: 'risk', title: 'Gestão de risco', category: 'Intermediário', completed: false, progress: 65 },
  { id: 'smart-money', title: 'Smart Money Concepts', category: 'Avançado', completed: false, progress: 28 },
];

const initialNews: EconomicNews[] = [
  { id: 'n1', title: 'Banco Central sinaliza postura cautelosa', impact: 'high', time: '10 min', summary: 'Aumento de juros pode fortalecer o dólar e pressionar pares de risco.', category: 'Macro' },
  { id: 'n2', title: 'BTC se estabiliza acima da média de curto prazo', impact: 'medium', time: '25 min', summary: 'Instituições acumulam posições e o volume oscila em tendência lateral.', category: 'Cripto' },
  { id: 'n3', title: 'S&P 500 reage a dados de emprego', impact: 'medium', time: '40 min', summary: 'Mercado encara forte participação de compradores em pullbacks.', category: 'Índices' },
];

const initialPsychology: TradingPsychology = {
  fear: 24,
  greed: 31,
  impulsiveTrades: 2,
  discipline: 81,
  focus: 76,
};

const initialChallenges: TradingChallenge[] = [
  { id: 'c1', title: '10 operações com risco controlado', description: 'Complete 10 trades respeitando stop loss e sem risco excessivo.', reward: 'Badge Disciplina', completed: true },
  { id: 'c2', title: 'Análise antes de entrar', description: 'Faça uma análise clara antes de cada operação por 5 dias.', reward: 'XP +200', completed: false },
  { id: 'c3', title: 'Master da gestão de risco', description: 'Mantenha risco máximo por operação abaixo de 2%.', reward: 'Rank Elite', completed: false },
];

const initialRanking: TradingRankingEntry[] = [
  { id: 'r1', name: 'Ana Cruz', xp: 1840, winRate: 78, badge: 'Elite' },
  { id: 'r2', name: 'Mikel', xp: 1560, winRate: 71, badge: 'Pro' },
  { id: 'r3', name: 'Você', xp: 1320, winRate: 64, badge: 'Aprendiz' },
];

const indicatorOptions: TradingIndicator[] = ['EMA', 'RSI', 'MACD', 'Bollinger', 'Fibonacci', 'Volume', 'Support/Resistance'];
const timeframeOptions: TradingTimeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D'];

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: value > 999 ? 0 : 2 }).format(value);

export default function Trade() {
  const [assets, setAssets] = useState<TradingAsset[]>(initialAssets);
  const [selectedAssetId, setSelectedAssetId] = useState(initialAssets[0].id);
  const [positions, setPositions] = useState<TradingPosition[]>([]);
  const [closedTrades, setClosedTrades] = useState<TradingPosition[]>([]);
  const [learningModules, setLearningModules] = useState<LearningModule[]>(initialLearning);
  const [newsFeed, setNewsFeed] = useState<EconomicNews[]>(initialNews);
  const [psychology] = useState<TradingPsychology>(initialPsychology);
  const [marketPulse, setMarketPulse] = useState([{ label: 'Compradores institucionais', intensity: 'Alta' }, { label: 'Vendedores de curto prazo', intensity: 'Moderada' }, { label: 'Baleias de mercado', intensity: 'Ativa' }, { label: 'Robôs de execução', intensity: 'Elevada' }]);
  const [account, setAccount] = useState({ balance: 100000, equity: 100000, marginUsed: 0, freeMargin: 100000, xp: 320, level: 'Profissional' });
  const [orderForm, setOrderForm] = useState({ side: 'buy' as 'buy' | 'sell', type: 'market' as 'market' | 'limit', quantity: '1', leverage: '10', stopLoss: '', takeProfit: '', limitPrice: '' });
  const [aiInsight, setAiInsight] = useState('Analisando o mercado em tempo real para fornecer um mapa claro de risco e oportunidade.');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TradingTimeframe>('15m');
  const [selectedIndicators, setSelectedIndicators] = useState<TradingIndicator[]>(['EMA', 'RSI', 'Volume']);
  const [selectedTool, setSelectedTool] = useState<'Trend' | 'Support' | 'Resistance' | 'Fibonacci'>('Trend');
  const [challenges] = useState<TradingChallenge[]>(initialChallenges);
  const [ranking] = useState<TradingRankingEntry[]>(initialRanking);

  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === selectedAssetId) ?? assets[0], [assets, selectedAssetId]);

  const riskMetrics = useMemo(() => {
    const entry = selectedAsset.price;
    const stopLoss = orderForm.stopLoss ? Number(orderForm.stopLoss) : undefined;
    const takeProfit = orderForm.takeProfit ? Number(orderForm.takeProfit) : undefined;
    const quantity = Number(orderForm.quantity || 1);
    const leverage = Number(orderForm.leverage || 1);
    const estimatedRisk = stopLoss ? Math.abs(entry - stopLoss) * quantity : entry * 0.01 * quantity;
    const estimatedReward = takeProfit ? Math.abs(takeProfit - entry) * quantity : estimatedRisk * 1.5;
    const rrRatio = estimatedRisk > 0 ? estimatedReward / estimatedRisk : 0;
    return {
      estimatedRisk,
      estimatedReward,
      rrRatio,
      margin: (quantity * entry) / leverage,
      liquidation: orderForm.side === 'buy' ? 'Em análise' : 'Monitorado',
    };
  }, [orderForm.leverage, orderForm.quantity, orderForm.side, orderForm.stopLoss, orderForm.takeProfit, selectedAsset.price]);

  const performance = useMemo(() => {
    const totalTrades = closedTrades.length;
    const wins = closedTrades.filter((trade) => trade.unrealizedPnl > 0).length;
    const loss = closedTrades.filter((trade) => trade.unrealizedPnl < 0).length;
    const totalPnL = closedTrades.reduce((sum, trade) => sum + trade.unrealizedPnl, 0);
    return {
      totalTrades,
      winRate: totalTrades ? Math.round((wins / totalTrades) * 100) : 0,
      avgWin: totalTrades ? totalPnL / Math.max(1, wins) : 0,
      avgLoss: totalTrades ? totalPnL / Math.max(1, loss) : 0,
      totalPnL,
    };
  }, [closedTrades]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAssets((prev) => prev.map((asset) => {
        const drift = (Math.random() - 0.5) * asset.volatility * 0.75;
        const nextPrice = Math.max(1, asset.price + drift);
        const nextChange = ((nextPrice - asset.price) / asset.price) * 100;
        const nextCandles = [...asset.candles.slice(-47), {
          open: asset.candles[asset.candles.length - 1]?.close ?? asset.price,
          high: Math.max(asset.candles[asset.candles.length - 1]?.close ?? asset.price, nextPrice),
          low: Math.min(asset.candles[asset.candles.length - 1]?.close ?? asset.price, nextPrice),
          close: nextPrice,
          volume: asset.candles[asset.candles.length - 1]?.volume ? asset.candles[asset.candles.length - 1].volume + Math.round(Math.random() * 120) : 2000,
        }];
        return {
          ...asset,
          price: nextPrice,
          change: nextChange,
          trend: nextChange > 0.05 ? 'bullish' : nextChange < -0.05 ? 'bearish' : 'neutral',
          candles: nextCandles,
          updated_at: new Date().toISOString(),
        };
      }));
      setNewsFeed((prev) => {
        if (prev.length === 0) return prev;
        const [first, ...rest] = prev;
        return [...rest, { ...first, time: `${Math.max(1, Number(first.time.replace(/\D/g, '')) - 1)} min` }];
      });
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setAssets((prev) => prev.map((asset) => {
      if (asset.id !== selectedAssetId) return asset;
      const latest = asset.candles[asset.candles.length - 1];
      if (!latest) return asset;
      const direction = latest.close >= latest.open ? 'alta' : 'baixa';
      setAiInsight(`O mercado de ${asset.symbol} está em ${direction} com pressão de ${asset.trend === 'bullish' ? 'compradores' : 'vendedores'} e risco controlado. O plano ideal é manter disciplina e validar breakout antes da entrada.`);
      setMarketPulse([
        { label: 'Compradores institucionais', intensity: asset.trend === 'bullish' ? 'Alta' : 'Moderada' },
        { label: 'Vendedores de curto prazo', intensity: asset.trend === 'bearish' ? 'Alta' : 'Moderada' },
        { label: 'Baleias de mercado', intensity: asset.change > 0.5 ? 'Ativa' : 'Neutra' },
        { label: 'Robôs de execução', intensity: 'Elevada' },
      ]);
      return asset;
    }));
  }, [selectedAssetId]);

  useEffect(() => {
    setPositions((prev) => {
      const nextPositions = prev.map((position) => {
        const asset = assets.find((item) => item.id === position.assetId);
        if (!asset) return position;
        const updated = (asset.price - position.entryPrice) * position.quantity * (position.side === 'buy' ? 1 : -1);
        return { ...position, currentPrice: asset.price, unrealizedPnl: updated };
      });
      const openingValue = nextPositions.reduce((sum, position) => sum + position.unrealizedPnl, 0);
      setAccount((current) => ({
        ...current,
        equity: current.balance + openingValue,
      }));
      return nextPositions;
    });
  }, [assets]);

  const closePosition = (positionId: string) => {
    const target = positions.find((position) => position.id === positionId);
    if (!target) return;
    const realized = target.unrealizedPnl;
    setPositions((prev) => prev.filter((position) => position.id !== positionId));
    setClosedTrades((prev) => [...prev, { ...target, unrealizedPnl: realized }]);
    setAccount((current) => ({
      ...current,
      balance: current.balance + realized,
      equity: current.equity + realized,
      marginUsed: Math.max(0, current.marginUsed - target.marginUsed),
      freeMargin: current.freeMargin + target.marginUsed,
      xp: current.xp + 25,
    }));
    setLearningModules((prev) => prev.map((module) => module.id === 'risk' ? { ...module, completed: true, progress: 100 } : module));
    setAiInsight(`Operação ${target.symbol} fechada com ${realized >= 0 ? 'lucro' : 'prejuízo'} de ${formatCurrency(Math.abs(realized))}. A IA recomenda revisar a entrada e manter a gestão de risco.`);
  };

  const openPosition = () => {
    if (!selectedAsset) return;
    const quantity = Number(orderForm.quantity || 1);
    const leverage = Number(orderForm.leverage || 1);
    const entryPrice = orderForm.type === 'limit' && orderForm.limitPrice ? Number(orderForm.limitPrice) : selectedAsset.price;
    const marginUsed = (quantity * entryPrice) / leverage;
    const position: TradingPosition = {
      id: `pos-${Date.now()}`,
      assetId: selectedAsset.id,
      symbol: selectedAsset.symbol,
      side: orderForm.side,
      entryPrice,
      currentPrice: entryPrice,
      quantity,
      leverage,
      stopLoss: orderForm.stopLoss ? Number(orderForm.stopLoss) : undefined,
      takeProfit: orderForm.takeProfit ? Number(orderForm.takeProfit) : undefined,
      marginUsed,
      unrealizedPnl: 0,
      openedAt: new Date().toISOString(),
    };
    setPositions((prev) => [...prev, position]);
    setAccount((current) => ({
      ...current,
      balance: current.balance - marginUsed,
      equity: current.equity - marginUsed,
      marginUsed: current.marginUsed + marginUsed,
      freeMargin: current.freeMargin - marginUsed,
      xp: current.xp + 18,
    }));
    setLearningModules((prev) => prev.map((module) => module.id === 'basics' ? { ...module, completed: true, progress: 100 } : module));
    setAiInsight(`Entrada ${orderForm.side === 'buy' ? 'long' : 'short'} registrada em ${selectedAsset.symbol}. A IA sugere acompanhar o stop loss e avaliar o risco/recompensa antes do próximo movimento.`);
  };

  const chartMax = Math.max(...selectedAsset.candles.map((candle) => candle.high));
  const chartMin = Math.min(...selectedAsset.candles.map((candle) => candle.low));
  const chartWidth = 560;
  const chartHeight = 260;
  const candleWidth = chartWidth / selectedAsset.candles.length - 6;

  return (
    <div className="space-y-6 -mt-5 -mx-5 lg:-mt-7 lg:-mx-7 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(135deg,_#020617,_#0f172a)]">
      <div className="px-5 lg:px-7 py-6 space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-emerald-500/20 bg-slate-950/70 p-5 shadow-2xl shadow-emerald-500/10 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/20 p-3 text-emerald-400"><TrendingUp size={20} /></div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">IK FINANCE TRADING LAB</p>
                <h1 className="text-2xl font-semibold text-white">Terminal profissional de simulação</h1>
              </div>
            </div>
            <p className="max-w-2xl text-sm text-slate-400">Aprenda, pratique e evolua com um ambiente de mercado inspirado em plataformas profissionais, mas dedicado à educação e à disciplina do trader.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Saldo virtual</div>
              <div className="mt-1 text-lg font-semibold text-white">{formatCurrency(account.balance)}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Equity</div>
              <div className="mt-1 text-lg font-semibold text-white">{formatCurrency(account.equity)}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Nível</div>
              <div className="mt-1 text-lg font-semibold text-emerald-400">{account.level}</div>
            </div>
          </div>
        </header>
        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-2xl shadow-black/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-800 p-2 text-emerald-400"><BarChart3 size={18} /></div>
                <div>
                  <p className="text-lg font-semibold text-white">Terminal de trading</p>
                  <p className="text-sm text-slate-400">Gráfico simulado com ação, volume e contexto de risco.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-sm text-slate-300">
                <Activity size={14} className="text-emerald-400" />
                Mercado ao vivo • {selectedAsset.symbol}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {assets.map((asset) => (
                <button key={asset.id} onClick={() => setSelectedAssetId(asset.id)} className={`rounded-full px-3 py-1.5 text-sm transition ${selectedAsset.id === asset.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>
                  {asset.symbol}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {timeframeOptions.map((timeframe) => (
                <button key={timeframe} onClick={() => setSelectedTimeframe(timeframe)} className={`rounded-full px-3 py-1.5 text-sm transition ${selectedTimeframe === timeframe ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>
                  {timeframe}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-white">
                    <span className="text-xl font-semibold">{selectedAsset.symbol}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${selectedAsset.change >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                      {selectedAsset.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {selectedAsset.change.toFixed(2)}%
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{selectedAsset.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold text-white">{formatCurrency(selectedAsset.price)}</p>
                  <p className="text-sm text-slate-500">Volume: {selectedAsset.volume}</p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="mb-3 flex flex-wrap gap-2">
                  {indicatorOptions.map((indicator) => {
                    const active = selectedIndicators.includes(indicator);
                    return (
                      <button key={indicator} onClick={() => setSelectedIndicators((prev) => prev.includes(indicator) ? prev.filter((item) => item !== indicator) : [...prev, indicator])} className={`rounded-full px-2.5 py-1 text-xs transition ${active ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>
                        {indicator}
                      </button>
                    );
                  })}
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {(['Trend', 'Support', 'Resistance', 'Fibonacci'] as const).map((tool) => (
                    <button key={tool} onClick={() => setSelectedTool(tool)} className={`rounded-full px-2.5 py-1 text-xs transition ${selectedTool === tool ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>
                      {tool}
                    </button>
                  ))}
                </div>
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[280px] w-full">
                  <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="#1e293b" strokeDasharray="4 4" />
                  {selectedAsset.candles.map((candle, index) => {
                    const x = index * (candleWidth + 6) + 6;
                    const yOpen = ((chartMax - candle.open) / (chartMax - chartMin || 1)) * (chartHeight - 20) + 10;
                    const yClose = ((chartMax - candle.close) / (chartMax - chartMin || 1)) * (chartHeight - 20) + 10;
                    const high = ((chartMax - candle.high) / (chartMax - chartMin || 1)) * (chartHeight - 20) + 10;
                    const low = ((chartMax - candle.low) / (chartMax - chartMin || 1)) * (chartHeight - 20) + 10;
                    const isUp = candle.close >= candle.open;
                    return (
                      <g key={`${candle.open}-${index}`}>
                        <line x1={x + candleWidth / 2} y1={high} x2={x + candleWidth / 2} y2={low} stroke={isUp ? '#34d399' : '#f87171'} strokeWidth="1.5" />
                        <rect x={x} y={Math.min(yOpen, yClose)} width={candleWidth} height={Math.max(6, Math.abs(yOpen - yClose))} rx="3" fill={isUp ? '#34d399' : '#f87171'} opacity="0.85" />
                      </g>
                    );
                  })}
                  {selectedIndicators.includes('Volume') && <line x1="20" y1="230" x2="520" y2="230" stroke="#38bdf8" strokeDasharray="2 2" />}
                  {selectedTool !== 'Trend' && <line x1="40" y1="60" x2="500" y2="220" stroke="#fbbf24" strokeDasharray="6 4" />}
                </svg>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-white">
                <Shield size={16} className="text-emerald-400" />
                <h2 className="font-semibold">Sistema de ordens</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setOrderForm((prev) => ({ ...prev, side: 'buy' }))} className={`rounded-2xl px-3 py-2 text-sm ${orderForm.side === 'buy' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>Comprar</button>
                  <button onClick={() => setOrderForm((prev) => ({ ...prev, side: 'sell' }))} className={`rounded-2xl px-3 py-2 text-sm ${orderForm.side === 'sell' ? 'bg-rose-500 text-white' : 'bg-slate-900 text-slate-300'}`}>Vender</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setOrderForm((prev) => ({ ...prev, type: 'market' }))} className={`rounded-2xl px-3 py-2 text-sm ${orderForm.type === 'market' ? 'bg-slate-800 text-white' : 'bg-slate-900 text-slate-400'}`}>Market</button>
                  <button onClick={() => setOrderForm((prev) => ({ ...prev, type: 'limit' }))} className={`rounded-2xl px-3 py-2 text-sm ${orderForm.type === 'limit' ? 'bg-slate-800 text-white' : 'bg-slate-900 text-slate-400'}`}>Limit</button>
                </div>
                <label className="text-sm text-slate-400">
                  Quantidade
                  <input value={orderForm.quantity} onChange={(event) => setOrderForm((prev) => ({ ...prev, quantity: event.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-400">
                  Alavancagem
                  <input value={orderForm.leverage} onChange={(event) => setOrderForm((prev) => ({ ...prev, leverage: event.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-white" />
                </label>
                {orderForm.type === 'limit' && (
                  <label className="text-sm text-slate-400">
                    Preço limite
                    <input value={orderForm.limitPrice} onChange={(event) => setOrderForm((prev) => ({ ...prev, limitPrice: event.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-white" />
                  </label>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm text-slate-400">
                    Stop loss
                    <input value={orderForm.stopLoss} onChange={(event) => setOrderForm((prev) => ({ ...prev, stopLoss: event.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-white" />
                  </label>
                  <label className="text-sm text-slate-400">
                    Take profit
                    <input value={orderForm.takeProfit} onChange={(event) => setOrderForm((prev) => ({ ...prev, takeProfit: event.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-white" />
                  </label>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between"><span>Risco estimado</span><span className="text-amber-400">{formatCurrency(riskMetrics.estimatedRisk)}</span></div>
                  <div className="mt-2 flex items-center justify-between"><span>Recompensa estimada</span><span className="text-emerald-400">{formatCurrency(riskMetrics.estimatedReward)}</span></div>
                  <div className="mt-2 flex items-center justify-between"><span>RR</span><span className="text-cyan-400">{riskMetrics.rrRatio.toFixed(2)}x</span></div>
                  <div className="mt-2 flex items-center justify-between"><span>Margem</span><span className="text-white">{formatCurrency(riskMetrics.margin)}</span></div>
                  <div className="mt-2 flex items-center justify-between"><span>Liquidação</span><span className="text-slate-400">{riskMetrics.liquidation}</span></div>
                </div>
                <button onClick={openPosition} className="rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">Executar ordem</button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-white">
                <BrainCircuit size={16} className="text-cyan-400" />
                <h2 className="font-semibold">Mentor de treinamento</h2>
              </div>
              <div className="mt-3 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-3 text-sm text-slate-300">
                <p className="font-medium text-white">{aiInsight}</p>
                <div className="mt-3 flex items-center gap-2 text-cyan-400"><Sparkles size={14} /> <span>Risco: {selectedAsset.change >= 0 ? 'moderado' : 'elevado'}</span></div>
              </div>
            </section>
          </aside>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white"><Target size={16} className="text-emerald-400" /> <h2 className="font-semibold">Operações abertas</h2></div>
              <div className="text-sm text-slate-500">Gestão de risco ativa</div>
            </div>
            <div className="mt-4 space-y-3">
              {positions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-500">Nenhuma operação aberta. Use o terminal para iniciar seu primeiro desafio.</div>
              ) : positions.map((position) => (
                <div key={position.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{position.symbol}</p>
                      <p className="text-sm text-slate-400">{position.side === 'buy' ? 'Long' : 'Short'} • {position.quantity} lotes</p>
                    </div>
                    <div className={`rounded-full px-2.5 py-1 text-xs ${position.unrealizedPnl >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                      {position.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnl)}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>Entrada: {formatCurrency(position.entryPrice)}</span>
                    <span>Atual: {formatCurrency(position.currentPrice)}</span>
                    <span>Alavancagem: {position.leverage}x</span>
                  </div>
                  <button onClick={() => closePosition(position.id)} className="mt-3 rounded-2xl border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400">Fechar posição</button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white"><BookOpen size={16} className="text-emerald-400" /> <h2 className="font-semibold">Módulos de aprendizagem</h2></div>
              <div className="text-sm text-slate-500">Nível profissional</div>
            </div>
            <div className="mt-4 space-y-3">
              {learningModules.map((module) => (
                <div key={module.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{module.title}</p>
                      <p className="text-sm text-slate-400">{module.category}</p>
                    </div>
                    {module.completed ? <BadgeCheck size={16} className="text-emerald-400" /> : <Clock3 size={16} className="text-slate-500" />}
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${module.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white"><LineChart size={16} className="text-emerald-400" /> <h2 className="font-semibold">Histórico e evolução</h2></div>
              <div className="text-sm text-slate-500">Acompanhamento profissional</div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Taxa de acerto</p>
                <p className="mt-1 text-xl font-semibold text-white">{performance.winRate}%</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Lucro total</p>
                <p className="mt-1 text-xl font-semibold text-emerald-400">{formatCurrency(performance.totalPnL)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">XP</p>
                <p className="mt-1 text-xl font-semibold text-cyan-400">{account.xp}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {closedTrades.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-500">O seu histórico de operações aparecerá aqui à medida que fechar posições.</div>
              ) : closedTrades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
                  <span>{trade.symbol} • {trade.side === 'buy' ? 'Long' : 'Short'}</span>
                  <span className={trade.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{trade.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(trade.unrealizedPnl)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-white"><GraduationCap size={16} className="text-emerald-400" /> <h2 className="font-semibold">Psicologia do trader</h2></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Disciplina</span>
                <span className="font-semibold text-white">{psychology.discipline}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${psychology.discipline}%` }} /></div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Medo</span>
                <span className="font-semibold text-white">{psychology.fear}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-cyan-500" style={{ width: `${psychology.fear}%` }} /></div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Ganância</span>
                <span className="font-semibold text-white">{psychology.greed}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${psychology.greed}%` }} /></div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-400">
              <div className="flex items-center gap-2 text-amber-400"><AlertTriangle size={14} /> <span>Entradas impulsivas: {psychology.impulsiveTrades}</span></div>
              <p className="mt-2 text-slate-300">A disciplina melhora quando a análise comece antes da ordem e o risco for pré-definido.</p>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-white"><Flame size={16} className="text-amber-400" /> <h2 className="font-semibold">Notícias e calendário</h2></div>
            <div className="mt-4 space-y-3">
              {newsFeed.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{item.title}</p>
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-amber-400">{item.impact}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{item.summary}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{item.category}</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-white"><Coins size={16} className="text-cyan-400" /> <h2 className="font-semibold">Desafios e ranking</h2></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-sm font-semibold text-white">Desafios ativos</p>
              <div className="mt-3 space-y-2">
                {challenges.map((challenge) => (
                  <div key={challenge.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
                    <div>
                      <p className="text-white">{challenge.title}</p>
                      <p className="text-slate-400">{challenge.description}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${challenge.completed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-300'}`}>{challenge.reward}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-sm font-semibold text-white">Ranking</p>
              <div className="mt-3 space-y-2">
                {ranking.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
                    <div>
                      <p className="text-white">{entry.name}</p>
                      <p className="text-slate-400">{entry.winRate}% de acerto</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400">{entry.xp} XP</p>
                      <p className="text-slate-500">{entry.badge}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-emerald-400"><DollarSign size={16} /> <span>Este módulo é uma simulação educativa profissional. O objetivo é treinar disciplina, risco, análise e psicologia sem expor o usuário a perdas reais.</span></div>
        </div>
      </div>
    </div>
  );
}
