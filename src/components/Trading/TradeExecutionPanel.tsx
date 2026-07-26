import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  DollarSign,
  AlertTriangle,
  Info,
  Clock
} from 'lucide-react';

interface TradeExecutionPanelProps {
  symbol: string;
  currentPrice: number;
  availableBalanceUsdt: number;
  onExecuteSpotTrade: (side: 'buy' | 'sell', amountUsdt: number, price: number) => void;
  onExecuteFuturesPosition: (
    type: 'long' | 'short',
    marginUsdt: number,
    leverage: number,
    takeProfit?: number,
    stopLoss?: number
  ) => void;
  onExecuteBinaryOption: (
    direction: 'call' | 'put',
    amountUsdt: number,
    durationSeconds: number
  ) => void;
  precision?: number;
}

export default function TradeExecutionPanel({
  symbol,
  currentPrice,
  availableBalanceUsdt,
  onExecuteSpotTrade,
  onExecuteFuturesPosition,
  onExecuteBinaryOption,
  precision = 2
}: TradeExecutionPanelProps) {
  const [tradeMode, setTradeMode] = useState<'futures' | 'spot' | 'options'>('futures');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [customPrice, setCustomPrice] = useState<string>(currentPrice.toString());

  // Estado Futuros
  const [leverage, setLeverage] = useState<number>(20);
  const [futuresMargin, setFuturesMargin] = useState<string>('100');
  const [enableTpSl, setEnableTpSl] = useState<boolean>(true);
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>(
    (currentPrice * 1.05).toFixed(precision)
  );
  const [stopLossPrice, setStopLossPrice] = useState<string>(
    (currentPrice * 0.97).toFixed(precision)
  );

  // Estado Opções Temporais
  const [optionAmount, setOptionAmount] = useState<string>('50');
  const [optionDuration, setOptionDuration] = useState<number>(30); // 30 segundos

  // Cálculos dinâmicos
  const executionPrice = orderType === 'market' ? currentPrice : Number(customPrice) || currentPrice;
  const numMargin = Number(futuresMargin) || 0;
  const positionValueUsdt = numMargin * leverage;
  const positionSizeUnits = positionValueUsdt / executionPrice;

  // Estimar Preço de Liquidação
  const isLongLiqPrice = Number((executionPrice * (1 - 0.9 / leverage)).toFixed(precision));
  const isShortLiqPrice = Number((executionPrice * (1 + 0.9 / leverage)).toFixed(precision));

  // Lucro/Prejuízo Previsto com TP/SL
  const tpProfitEstimate = enableTpSl && Number(takeProfitPrice) > 0
    ? ((Number(takeProfitPrice) - executionPrice) / executionPrice) * positionValueUsdt
    : 0;

  const slLossEstimate = enableTpSl && Number(stopLossPrice) > 0
    ? ((executionPrice - Number(stopLossPrice)) / executionPrice) * positionValueUsdt
    : 0;

  // Botões de % de banca
  const handleQuickPercent = (percent: number) => {
    const amount = (availableBalanceUsdt * (percent / 100)).toFixed(2);
    if (tradeMode === 'futures') setFuturesMargin(amount);
    if (tradeMode === 'options') setOptionAmount(amount);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-xl flex flex-col justify-between">
      {/* Abas Superiores de Modo */}
      <div className="flex border-b border-slate-800 bg-slate-900/80 p-1">
        <button
          onClick={() => setTradeMode('futures')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            tradeMode === 'futures'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap size={14} /> Futuros ({leverage}x)
        </button>
        <button
          onClick={() => setTradeMode('spot')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            tradeMode === 'spot'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign size={14} /> Spot (À Vista)
        </button>
        <button
          onClick={() => setTradeMode('options')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            tradeMode === 'options'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock size={14} /> Opções (Rápidas)
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Banca Disponível */}
        <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 font-medium">Banca Demo Disponível:</span>
          <span className="font-mono font-bold text-emerald-400 text-sm">
            ${availableBalanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
          </span>
        </div>

        {/* MODO FUTUROS */}
        {tradeMode === 'futures' && (
          <div className="space-y-4">
            {/* Controle de Alavancagem */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold flex items-center gap-1">
                  <Shield size={13} className="text-emerald-400" /> Alavancagem:
                </span>
                <span className={`font-mono font-bold ${leverage >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {leverage}x {leverage >= 50 && '⚠️ Alto Risco'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="125"
                step="1"
                value={leverage}
                onChange={e => setLeverage(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>1x</span>
                <span>10x</span>
                <span>25x</span>
                <span>50x</span>
                <span>100x</span>
                <span>125x</span>
              </div>
            </div>

            {/* Margem Requerida */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Margem Usada (USDT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={futuresMargin}
                  onChange={e => setFuturesMargin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-3 pr-16 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-500">USDT</span>
              </div>

              {/* Botões Rápidos % */}
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[25, 50, 75, 100].map(pct => (
                  <button
                    key={pct}
                    onClick={() => handleQuickPercent(pct)}
                    className="py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 hover:border-slate-700 hover:text-white"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Ativação de TP / SL */}
            <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Take Profit & Stop Loss</span>
                <input
                  type="checkbox"
                  checked={enableTpSl}
                  onChange={e => setEnableTpSl(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                />
              </div>

              {enableTpSl && (
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <label className="text-emerald-400 font-mono text-[11px]">TP (Lucro)</label>
                    <input
                      type="number"
                      value={takeProfitPrice}
                      onChange={e => setTakeProfitPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-emerald-500/30 rounded-lg py-1.5 px-2 font-mono text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-rose-400 font-mono text-[11px]">SL (Prejuízo)</label>
                    <input
                      type="number"
                      value={stopLossPrice}
                      onChange={e => setStopLossPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-rose-500/30 rounded-lg py-1.5 px-2 font-mono text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Resumo da Posição */}
            <div className="text-[11px] font-mono text-slate-400 space-y-1 bg-slate-900/30 p-2.5 rounded-xl border border-slate-800/60">
              <div className="flex justify-between">
                <span>Valor Total da Posição:</span>
                <strong className="text-white">${positionValueUsdt.toFixed(2)} USDT</strong>
              </div>
              <div className="flex justify-between">
                <span>Liq. Est. (Long):</span>
                <strong className="text-rose-400">${isLongLiqPrice}</strong>
              </div>
              <div className="flex justify-between">
                <span>Liq. Est. (Short):</span>
                <strong className="text-rose-400">${isShortLiqPrice}</strong>
              </div>
            </div>

            {/* Botoes de Execução Long / Short */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() =>
                  onExecuteFuturesPosition(
                    'long',
                    numMargin,
                    leverage,
                    enableTpSl ? Number(takeProfitPrice) : undefined,
                    enableTpSl ? Number(stopLossPrice) : undefined
                  )
                }
                className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <TrendingUp size={16} /> Comprar / LONG
              </button>
              <button
                onClick={() =>
                  onExecuteFuturesPosition(
                    'short',
                    numMargin,
                    leverage,
                    enableTpSl ? Number(takeProfitPrice) : undefined,
                    enableTpSl ? Number(stopLossPrice) : undefined
                  )
                }
                className="py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20 transition-all"
              >
                <TrendingDown size={16} /> Vender / SHORT
              </button>
            </div>
          </div>
        )}

        {/* MODO OPÇÕES TEMPORAIS (15s, 30s, 60s) */}
        {tradeMode === 'options' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Tempo de Expiração
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 60, 180].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setOptionDuration(sec)}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                      optionDuration === sec
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Valor da Entrada (USDT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={optionAmount}
                  onChange={e => setOptionAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-3 pr-16 text-sm font-mono text-white"
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-500">USDT</span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 font-mono flex items-center justify-between">
              <span>Payout da Operação:</span>
              <strong className="text-base text-amber-400">+88% (${(Number(optionAmount) * 0.88).toFixed(2)})</strong>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() =>
                  onExecuteBinaryOption('call', Number(optionAmount) || 10, optionDuration)
                }
                className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <TrendingUp size={16} /> CALL (Vai Subir)
              </button>
              <button
                onClick={() =>
                  onExecuteBinaryOption('put', Number(optionAmount) || 10, optionDuration)
                }
                className="py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20"
              >
                <TrendingDown size={16} /> PUT (Vai Cair)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
