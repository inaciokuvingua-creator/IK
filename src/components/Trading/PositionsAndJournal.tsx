import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  XCircle,
  Clock,
  History,
  CheckCircle,
  AlertCircle,
  Award,
  RotateCcw
} from 'lucide-react';

export interface PositionItem {
  id: string;
  symbol: string;
  type: 'long' | 'short';
  leverage: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  marginUsdt: number;
  takeProfit?: number;
  stopLoss?: number;
  pnlUsdt: number;
  pnlPercent: number;
  createdAt: string;
}

export interface OptionItem {
  id: string;
  symbol: string;
  direction: 'call' | 'put';
  entryPrice: number;
  currentPrice: number;
  amountUsdt: number;
  expiryTimestamp: number;
  payoutUsdt: number;
  status: 'active' | 'won' | 'lost';
}

export interface TradeHistoryItem {
  id: string;
  symbol: string;
  side: string;
  leverage?: number;
  entryPrice: number;
  exitPrice: number;
  amountUsdt: number;
  pnlUsdt: number;
  result: 'win' | 'loss' | 'closed';
  timestamp: string;
  aiNote?: string;
}

interface PositionsAndJournalProps {
  positions: PositionItem[];
  options: OptionItem[];
  tradeHistory: TradeHistoryItem[];
  onClosePosition: (positionId: string) => void;
  onResetDemoBalance: () => void;
}

export default function PositionsAndJournal({
  positions,
  options,
  tradeHistory,
  onClosePosition,
  onResetDemoBalance
}: PositionsAndJournalProps) {
  const [activeTab, setActiveTab] = useState<'positions' | 'options' | 'journal'>('positions');

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-xl">
      {/* Abas Superiores */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-2 text-xs justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg transition-all ${
              activeTab === 'positions'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp size={14} /> Posições Abertas ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('options')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg transition-all ${
              activeTab === 'options'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock size={14} /> Opções Ativas ({options.length})
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg transition-all ${
              activeTab === 'journal'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History size={14} /> Diário de Trades ({tradeHistory.length})
          </button>
        </div>

        {/* Reiniciar Banca de Treino */}
        <button
          onClick={onResetDemoBalance}
          className="flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-all font-mono text-xs"
        >
          <RotateCcw size={12} /> Reiniciar Banca Demo ($10.000)
        </button>
      </div>

      <div className="p-4 overflow-x-auto">
        {/* ABA POSIÇÕES FUTUROS */}
        {activeTab === 'positions' && (
          <div>
            {positions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                Nenhuma posição aberta no momento. Escolha um ativo e abra uma ordem no painel de execução!
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-sans">
                    <th className="pb-3">Símbolo</th>
                    <th className="pb-3">Tipo / Alavancagem</th>
                    <th className="pb-3">Preço Entrada</th>
                    <th className="pb-3">Preço Atual</th>
                    <th className="pb-3">Preço Liq.</th>
                    <th className="pb-3">Margem (USDT)</th>
                    <th className="pb-3">PnL não realizado ($ / %)</th>
                    <th className="pb-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {positions.map(pos => {
                    const isProfit = pos.pnlUsdt >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-slate-900/50">
                        <td className="py-3 font-bold text-white font-sans">{pos.symbol}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold uppercase text-[11px] ${
                              pos.type === 'long'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {pos.type} {pos.leverage}x
                          </span>
                        </td>
                        <td className="py-3 text-slate-300">${pos.entryPrice}</td>
                        <td className="py-3 text-white font-bold">${pos.markPrice}</td>
                        <td className="py-3 text-rose-400">${pos.liquidationPrice}</td>
                        <td className="py-3 text-slate-300">${pos.marginUsdt.toFixed(2)}</td>
                        <td className="py-3">
                          <div className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}${pos.pnlUsdt.toFixed(2)} ({isProfit ? '+' : ''}
                            {pos.pnlPercent.toFixed(2)}%)
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => onClosePosition(pos.id)}
                            className="px-2.5 py-1 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white font-bold transition-all text-[11px]"
                          >
                            Fechar Posição
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ABA OPÇÕES TEMPORAIS */}
        {activeTab === 'options' && (
          <div>
            {options.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                Nenhuma opção temporal em andamento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {options.map(opt => {
                  const now = Date.now();
                  const remainingSec = Math.max(0, Math.round((opt.expiryTimestamp - now) / 1000));
                  const isWinning =
                    opt.direction === 'call'
                      ? opt.currentPrice >= opt.entryPrice
                      : opt.currentPrice <= opt.entryPrice;

                  return (
                    <div
                      key={opt.id}
                      className="border border-slate-800 bg-slate-900/60 rounded-xl p-3 space-y-2 text-xs font-mono"
                    >
                      <div className="flex justify-between items-center font-sans">
                        <strong className="text-white text-sm">{opt.symbol}</strong>
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[11px] uppercase ${
                            opt.direction === 'call'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {opt.direction}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Entrada: ${opt.entryPrice}</span>
                        <span>Atual: ${opt.currentPrice}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                        <span className="text-slate-400 flex items-center gap-1 font-sans">
                          <Clock size={13} className="text-amber-400" /> Expira em:
                        </span>
                        <strong className="text-amber-400 font-bold text-sm">{remainingSec}s</strong>
                      </div>
                      <div
                        className={`text-center font-bold py-1.5 rounded-lg border ${
                          isWinning
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {isWinning ? `ITM (+${opt.payoutUsdt.toFixed(2)} USDT)` : 'OTM (-$0.00)'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA DIÁRIO DE TRADES */}
        {activeTab === 'journal' && (
          <div>
            {tradeHistory.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                Seu histórico está limpo. Complete operações para gerar auditorias do seu desempenho!
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-sans">
                    <th className="pb-3">Símbolo</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Preço Entrada / Saída</th>
                    <th className="pb-3">Resultado ($)</th>
                    <th className="pb-3">Observação da IA Tutor</th>
                    <th className="pb-3 text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tradeHistory.map(item => {
                    const isWin = item.pnlUsdt >= 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-900/50">
                        <td className="py-3 font-bold text-white font-sans">{item.symbol}</td>
                        <td className="py-3 uppercase text-slate-300">{item.side}</td>
                        <td className="py-3 text-slate-400">
                          ${item.entryPrice} → ${item.exitPrice}
                        </td>
                        <td className="py-3">
                          <strong className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                            {isWin ? '+' : ''}${item.pnlUsdt.toFixed(2)}
                          </strong>
                        </td>
                        <td className="py-3 text-slate-300 font-sans max-w-xs truncate">
                          {item.aiNote || (isWin ? 'Execução disciplinada.' : 'Respeite o Stop Loss!')}
                        </td>
                        <td className="py-3 text-right text-slate-500">{item.timestamp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
