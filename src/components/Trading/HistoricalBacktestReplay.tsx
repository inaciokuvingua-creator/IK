import { useState } from 'react';
import {
  Play,
  RotateCcw,
  Zap,
  TrendingUp,
  TrendingDown,
  Award,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { HISTORICAL_SCENARIOS, type HistoricalScenario } from '../../lib/tradingSimulationData';
import CandlestickChartCanvas from './CandlestickChartCanvas';

interface HistoricalBacktestReplayProps {
  onEarnXp: (amount: number) => void;
}

export default function HistoricalBacktestReplay({ onEarnXp }: HistoricalBacktestReplayProps) {
  const [selectedScenario, setSelectedScenario] = useState<HistoricalScenario>(HISTORICAL_SCENARIOS[0]);
  const [replayStep, setReplayStep] = useState<number>(15); // revela as primeiras 15 velas
  const [balanceUsdt, setBalanceUsdt] = useState<number>(10000);
  const [activeTrade, setActiveTrade] = useState<{
    type: 'long' | 'short';
    entryPrice: number;
    amountUsdt: number;
    leverage: number;
  } | null>(null);

  const [tradeLogs, setTradeLogs] = useState<{
    type: string;
    entryPrice: number;
    exitPrice: number;
    pnlUsdt: number;
  }[]>([]);

  // Velas visíveis até o passo atual do replay
  const visibleCandles = selectedScenario.candles.slice(0, replayStep);
  const currentCandle = visibleCandles[visibleCandles.length - 1];
  const currentPrice = currentCandle ? currentCandle.close : selectedScenario.initialPrice;

  const handleNextStep = () => {
    if (replayStep < selectedScenario.candles.length) {
      setReplayStep(prev => prev + 1);
    }
  };

  const handleOpenPosition = (type: 'long' | 'short') => {
    if (activeTrade) return;
    setActiveTrade({
      type,
      entryPrice: currentPrice,
      amountUsdt: 500,
      leverage: 10
    });
  };

  const handleClosePosition = () => {
    if (!activeTrade) return;

    const priceDiff = currentPrice - activeTrade.entryPrice;
    const isLong = activeTrade.type === 'long';
    const pnlPercent = (priceDiff / activeTrade.entryPrice) * (isLong ? 1 : -1) * activeTrade.leverage;
    const pnlUsdt = activeTrade.amountUsdt * pnlPercent;

    setBalanceUsdt(b => b + pnlUsdt);
    setTradeLogs(prev => [
      ...prev,
      {
        type: activeTrade.type.toUpperCase(),
        entryPrice: activeTrade.entryPrice,
        exitPrice: currentPrice,
        pnlUsdt
      }
    ]);

    if (pnlUsdt > 0) {
      onEarnXp(200);
    }

    setActiveTrade(null);
  };

  const handleResetScenario = () => {
    setReplayStep(15);
    setBalanceUsdt(10000);
    setActiveTrade(null);
    setTradeLogs([]);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 space-y-6 shadow-2xl">
      {/* Seletor de Cenas Históricas */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Zap className="text-amber-400" size={22} /> Replay Histórico & Backtest em Tempo Real
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Teste sua estratégia em momentos históricos do mercado passo a passo sem ver o futuro!
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {HISTORICAL_SCENARIOS.map(scenario => (
            <button
              key={scenario.id}
              onClick={() => {
                setSelectedScenario(scenario);
                handleResetScenario();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedScenario.id === scenario.id
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {scenario.title}
            </button>
          ))}
        </div>
      </div>

      {/* Descrição do Cenário */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
        <div>
          <span className="font-bold text-white text-sm">{selectedScenario.title} ({selectedScenario.symbol})</span>
          <p className="text-slate-400 mt-1">{selectedScenario.description}</p>
        </div>
        <div className="flex items-center gap-3 font-mono shrink-0">
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">Banca Replay:</span>
            <strong className="text-emerald-400 text-sm">${balanceUsdt.toFixed(2)}</strong>
          </div>
          <button
            onClick={handleResetScenario}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Reiniciar Replay"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Gráfico do Replay */}
      <CandlestickChartCanvas
        symbol={selectedScenario.symbol}
        price={currentPrice}
        candles={visibleCandles}
        timeframe="4h"
        enabledIndicators={['MA20', 'RSI', 'S/R']}
        isReplayMode={true}
        onNextReplayCandle={handleNextStep}
        replayStep={replayStep}
        totalReplayCandles={selectedScenario.candles.length}
      />

      {/* Controles do Replay & Execução de Trades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div>
          <span className="text-xs font-bold text-slate-300 mb-2 block">
            1. Posição no Replay
          </span>
          {!activeTrade ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenPosition('long')}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1"
              >
                <TrendingUp size={14} /> Abrir LONG ($500 / 10x)
              </button>
              <button
                onClick={() => handleOpenPosition('short')}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs flex items-center justify-center gap-1"
              >
                <TrendingDown size={14} /> Abrir SHORT ($500 / 10x)
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-400">Trade Ativo:</span>{' '}
                <strong className={activeTrade.type === 'long' ? 'text-emerald-400' : 'text-rose-400'}>
                  {activeTrade.type.toUpperCase()} @ ${activeTrade.entryPrice}
                </strong>
              </div>
              <button
                onClick={handleClosePosition}
                className="py-1 px-3 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
              >
                Fechar Trade Agora
              </button>
            </div>
          )}
        </div>

        <div>
          <span className="text-xs font-bold text-slate-300 mb-2 block">
            2. Avançar Tempo
          </span>
          <button
            onClick={handleNextStep}
            disabled={replayStep >= selectedScenario.candles.length}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Play size={14} /> Replay Próxima Vela (+1)
          </button>
        </div>
      </div>
    </div>
  );
}
