import { useState, useEffect } from 'react';
import {
  CandlestickChart,
  BookOpen,
  Zap,
  Calculator,
  Bot,
  Award,
  Layers,
  Search,
  RotateCcw,
  Sparkles,
  Shield,
  TrendingUp,
  Globe
} from 'lucide-react';

import {
  MARKET_CATALOG,
  generateCandlesForAsset,
  type ExtendedAsset,
  type Candle
} from '../../lib/tradingSimulationData';

import CandlestickChartCanvas from './CandlestickChartCanvas';
import OrderBookAndDepth from './OrderBookAndDepth';
import TradeExecutionPanel from './TradeExecutionPanel';
import PositionsAndJournal, {
  type PositionItem,
  type OptionItem,
  type TradeHistoryItem
} from './PositionsAndJournal';

import PatternQuizChallenge from './PatternQuizChallenge';
import HistoricalBacktestReplay from './HistoricalBacktestReplay';
import RiskPositionCalculator from './RiskPositionCalculator';
import AITradingTutor from './AITradingTutor';

export default function TradeAcademySuite() {
  const [activeMainTab, setActiveMainTab] = useState<
    'terminal' | 'quiz' | 'replay' | 'calculator' | 'tutor'
  >('terminal');

  // Seleção de Mercado
  const [selectedAsset, setSelectedAsset] = useState<ExtendedAsset>(MARKET_CATALOG[0]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('4h');
  const [enabledIndicators, setEnabledIndicators] = useState<string[]>([
    'MA20',
    'MA50',
    'RSI',
    'Volume',
    'S/R'
  ]);

  // Preço Live e Velas em Tempo Real
  const [currentPrice, setCurrentPrice] = useState<number>(selectedAsset.last_price);
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateCandlesForAsset(selectedAsset.last_price, timeframe, 60)
  );

  // Estado da Banca e Portfólio de Treino
  const [demoBalanceUsdt, setDemoBalanceUsdt] = useState<number>(10000);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);

  // Progresso de Trader (Gamificação XP & Nível)
  const [traderXp, setTraderXp] = useState<number>(350);
  const traderLevel = Math.floor(traderXp / 500) + 1;
  const nextLevelXp = traderLevel * 500;

  // Atualizar velas quando o ativo ou timeframe mudar
  useEffect(() => {
    setCurrentPrice(selectedAsset.last_price);
    setCandles(generateCandlesForAsset(selectedAsset.last_price, timeframe, 60));
  }, [selectedAsset, timeframe]);

  // Tick Engine de Simulação de Preço ao Vivo (A cada 1.5s atualiza o último candle)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(prevPrice => {
        const volatility = prevPrice > 1000 ? 0.0012 : 0.003;
        const change = (Math.random() - 0.495) * volatility * prevPrice;
        const newPrice = Number((prevPrice + change).toFixed(selectedAsset.precision));

        // Atualizar a última vela do gráfico
        setCandles(prevCandles => {
          if (prevCandles.length === 0) return prevCandles;
          const lastIndex = prevCandles.length - 1;
          const lastCandle = { ...prevCandles[lastIndex] };

          lastCandle.close = newPrice;
          lastCandle.high = Math.max(lastCandle.high, newPrice);
          lastCandle.low = Math.min(lastCandle.low, newPrice);
          lastCandle.volume += Math.round(Math.random() * 50);

          const updated = [...prevCandles];
          updated[lastIndex] = lastCandle;
          return updated;
        });

        // Atualizar PnL das posições abertas em tempo real
        setPositions(prevPositions =>
          prevPositions.map(pos => {
            if (pos.symbol !== selectedAsset.symbol) return pos;
            const priceDiff = newPrice - pos.entryPrice;
            const multiplier = pos.type === 'long' ? 1 : -1;
            const pnlPercent = (priceDiff / pos.entryPrice) * multiplier * pos.leverage * 100;
            const pnlUsdt = (pos.marginUsdt * pnlPercent) / 100;

            return {
              ...pos,
              markPrice: newPrice,
              pnlUsdt: Number(pnlUsdt.toFixed(2)),
              pnlPercent: Number(pnlPercent.toFixed(2))
            };
          })
        );

        // Atualizar cotação das Opções
        setOptions(prevOptions =>
          prevOptions.map(opt => {
            if (opt.symbol !== selectedAsset.symbol) return opt;
            return { ...opt, currentPrice: newPrice };
          })
        );

        return newPrice;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedAsset]);

  // Alternar Indicadores Técnicos
  const handleToggleIndicator = (ind: string) => {
    setEnabledIndicators(current =>
      current.includes(ind) ? current.filter(i => i !== ind) : [...current, ind]
    );
  };

  // Ganhar XP
  const handleEarnXp = (amount: number) => {
    setTraderXp(prev => prev + amount);
  };

  // Executar Ordem de Futuros
  const handleExecuteFuturesPosition = (
    type: 'long' | 'short',
    marginUsdt: number,
    leverage: number,
    takeProfit?: number,
    stopLoss?: number
  ) => {
    if (marginUsdt <= 0 || marginUsdt > demoBalanceUsdt) {
      alert('Saldo insuficiente na banca demo!');
      return;
    }

    setDemoBalanceUsdt(b => b - marginUsdt);

    const isLong = type === 'long';
    const liqPrice = isLong
      ? Number((currentPrice * (1 - 0.9 / leverage)).toFixed(selectedAsset.precision))
      : Number((currentPrice * (1 + 0.9 / leverage)).toFixed(selectedAsset.precision));

    const newPosition: PositionItem = {
      id: Math.random().toString(36).substring(2, 9),
      symbol: selectedAsset.symbol,
      type,
      leverage,
      entryPrice: currentPrice,
      markPrice: currentPrice,
      liquidationPrice: liqPrice,
      marginUsdt,
      takeProfit,
      stopLoss,
      pnlUsdt: 0,
      pnlPercent: 0,
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setPositions(prev => [newPosition, ...prev]);
    handleEarnXp(25);
  };

  // Executar Opção Temporal
  const handleExecuteBinaryOption = (
    direction: 'call' | 'put',
    amountUsdt: number,
    durationSeconds: number
  ) => {
    if (amountUsdt <= 0 || amountUsdt > demoBalanceUsdt) {
      alert('Saldo insuficiente!');
      return;
    }

    setDemoBalanceUsdt(b => b - amountUsdt);

    const expiryTimestamp = Date.now() + durationSeconds * 1000;
    const payoutUsdt = amountUsdt * 0.88;

    const newOption: OptionItem = {
      id: Math.random().toString(36).substring(2, 9),
      symbol: selectedAsset.symbol,
      direction,
      entryPrice: currentPrice,
      currentPrice: currentPrice,
      amountUsdt,
      expiryTimestamp,
      payoutUsdt,
      status: 'active'
    };

    setOptions(prev => [newOption, ...prev]);

    // Timer de expiração
    setTimeout(() => {
      setOptions(prevOptions => {
        const opt = prevOptions.find(o => o.id === newOption.id);
        if (!opt) return prevOptions;

        const won =
          direction === 'call'
            ? opt.currentPrice >= opt.entryPrice
            : opt.currentPrice <= opt.entryPrice;

        if (won) {
          setDemoBalanceUsdt(b => b + amountUsdt + payoutUsdt);
          handleEarnXp(75);
        }

        // Registrar no Histórico
        const historyItem: TradeHistoryItem = {
          id: opt.id,
          symbol: opt.symbol,
          side: `OPTION ${direction.toUpperCase()}`,
          entryPrice: opt.entryPrice,
          exitPrice: opt.currentPrice,
          amountUsdt,
          pnlUsdt: won ? payoutUsdt : -amountUsdt,
          result: won ? 'win' : 'loss',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          aiNote: won ? 'Entrada no timing correto!' : 'Entrada em contra-tendência.'
        };

        setTradeHistory(h => [historyItem, ...h]);
        return prevOptions.filter(o => o.id !== newOption.id);
      });
    }, durationSeconds * 1000);
  };

  // Fechar Posição de Futuros
  const handleClosePosition = (positionId: string) => {
    const pos = positions.find(p => p.id === positionId);
    if (!pos) return;

    const returnAmount = pos.marginUsdt + pos.pnlUsdt;
    setDemoBalanceUsdt(b => Math.max(0, b + returnAmount));

    const isWin = pos.pnlUsdt >= 0;
    if (isWin) handleEarnXp(50);

    const historyItem: TradeHistoryItem = {
      id: pos.id,
      symbol: pos.symbol,
      side: `${pos.type.toUpperCase()} ${pos.leverage}x`,
      leverage: pos.leverage,
      entryPrice: pos.entryPrice,
      exitPrice: pos.markPrice,
      amountUsdt: pos.marginUsdt,
      pnlUsdt: pos.pnlUsdt,
      result: isWin ? 'win' : 'loss',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      aiNote: isWin
        ? 'Operação lucrativa dentro dos limites.'
        : 'Atenção: Acompanhe a média móvel antes da entrada.'
    };

    setTradeHistory(h => [historyItem, ...h]);
    setPositions(p => p.filter(item => item.id !== positionId));
  };

  // Filtragem de Ativos
  const filteredAssets = MARKET_CATALOG.filter(asset => {
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesSearch =
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Estatísticas de Desempenho
  const totalTradesCount = tradeHistory.length;
  const winningTradesCount = tradeHistory.filter(t => t.pnlUsdt > 0).length;
  const winRatePercent = totalTradesCount > 0 ? Math.round((winningTradesCount / totalTradesCount) * 100) : 0;
  const totalProfitUsdt = tradeHistory.reduce((acc, t) => acc + t.pnlUsdt, 0);

  return (
    <div className="space-y-6">
      {/* Topo: Perfil de Nível do Trader & Barra de XP */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20">
            L{traderLevel}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white">IK Trading Academy & Terminal</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                Simulador Profissional
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pratique nos mercados globais (Cripto, Forex, Ações) com gráficos estilo Bybit/Binance.
            </p>
          </div>
        </div>

        <div className="w-full md:w-64 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between text-slate-300 font-semibold">
            <span>Progresso Trader XP</span>
            <span className="text-emerald-400">{traderXp} / {nextLevelXp} XP</span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (traderXp / nextLevelXp) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navegação Principal por Abas */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 rounded-2xl overflow-x-auto text-xs font-bold gap-1">
        <button
          onClick={() => setActiveMainTab('terminal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeMainTab === 'terminal'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CandlestickChart size={16} /> Terminal de Trading
        </button>
        <button
          onClick={() => setActiveMainTab('quiz')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeMainTab === 'quiz'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen size={16} /> Quiz & Padrões
        </button>
        <button
          onClick={() => setActiveMainTab('replay')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeMainTab === 'replay'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap size={16} /> Replay Histórico
        </button>
        <button
          onClick={() => setActiveMainTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeMainTab === 'calculator'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator size={16} /> Calculadora de Risco
        </button>
        <button
          onClick={() => setActiveMainTab('tutor')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeMainTab === 'tutor'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bot size={16} /> IA Mentor Coach
        </button>
      </div>

      {/* CONTEÚDO DA ABA: TERMINAL DE TRADING */}
      {activeMainTab === 'terminal' && (
        <div className="space-y-6">
          {/* Seletor de Categorias de Mercado + Busca */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
              {[
                { id: 'all', label: 'Todos os Mercados' },
                { id: 'crypto', label: '⚡ Cripto' },
                { id: 'forex', label: '🌐 Forex' },
                { id: 'stocks', label: '📈 Ações' },
                { id: 'commodities', label: '🥇 Commodities' },
                { id: 'indices', label: '📊 Índices' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Buscar ativo (ex: BTC, EUR...)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Carrossel / Grade de Ativos Rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {filteredAssets.map(asset => {
              const isSelected = selectedAsset.id === asset.id;
              const isPositive = asset.price_change_percent_24h >= 0;

              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all font-mono ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-bold text-white text-xs">{asset.symbol}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                      }`}
                    >
                      {isPositive ? '+' : ''}{asset.price_change_percent_24h}%
                    </span>
                  </div>
                  <p className="text-slate-200 font-bold text-sm mt-1">
                    ${asset.last_price.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Layout Principal do Terminal: Gráfico (E) + Livro de Ofertas (M) + Painel de Ordens (D) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 xl:col-span-8">
              <CandlestickChartCanvas
                symbol={selectedAsset.symbol}
                price={currentPrice}
                candles={candles}
                timeframe={timeframe}
                enabledIndicators={enabledIndicators}
                onTimeframeChange={setTimeframe}
                onToggleIndicator={handleToggleIndicator}
              />
            </div>

            <div className="lg:col-span-5 xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <OrderBookAndDepth
                currentPrice={currentPrice}
                symbol={selectedAsset.symbol}
                precision={selectedAsset.precision}
              />
              <TradeExecutionPanel
                symbol={selectedAsset.symbol}
                currentPrice={currentPrice}
                availableBalanceUsdt={demoBalanceUsdt}
                onExecuteSpotTrade={() => {}}
                onExecuteFuturesPosition={handleExecuteFuturesPosition}
                onExecuteBinaryOption={handleExecuteBinaryOption}
                precision={selectedAsset.precision}
              />
            </div>
          </div>

          {/* Tabela de Posições e Diário de Trades */}
          <PositionsAndJournal
            positions={positions}
            options={options}
            tradeHistory={tradeHistory}
            onClosePosition={handleClosePosition}
            onResetDemoBalance={() => setDemoBalanceUsdt(10000)}
          />
        </div>
      )}

      {/* OUTRAS ABAS */}
      {activeMainTab === 'quiz' && <PatternQuizChallenge onEarnXp={handleEarnXp} />}
      {activeMainTab === 'replay' && <HistoricalBacktestReplay onEarnXp={handleEarnXp} />}
      {activeMainTab === 'calculator' && <RiskPositionCalculator />}
      {activeMainTab === 'tutor' && (
        <AITradingTutor
          traderLevel={traderLevel}
          winRate={winRatePercent}
          totalTrades={totalTradesCount}
          totalProfitUsdt={totalProfitUsdt}
          onEarnXp={handleEarnXp}
        />
      )}
    </div>
  );
}
