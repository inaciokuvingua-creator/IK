import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Layers, Activity } from 'lucide-react';
import { generateOrderBook, type OrderBookData, type MarketRecentTrade } from '../../lib/tradingSimulationData';

interface OrderBookAndDepthProps {
  currentPrice: number;
  symbol: string;
  precision?: number;
  onSelectPrice?: (price: number) => void;
}

export default function OrderBookAndDepth({
  currentPrice,
  symbol,
  precision = 2,
  onSelectPrice
}: OrderBookAndDepthProps) {
  const [activeTab, setActiveTab] = useState<'book' | 'trades'>('book');
  const [bookData, setBookData] = useState<OrderBookData>(() => generateOrderBook(currentPrice, precision));
  const [recentTrades, setRecentTrades] = useState<MarketRecentTrade[]>([]);

  // Atualiza livro de ofertas e fita de ordens em tempo real (tick live)
  useEffect(() => {
    setBookData(generateOrderBook(currentPrice, precision));

    // Adiciona uma nova negociação na fita
    const isBuy = Math.random() > 0.48;
    const variation = (Math.random() - 0.5) * (currentPrice * 0.0008);
    const tradePrice = Number((currentPrice + variation).toFixed(precision));
    const tradeAmount = Number((Math.random() * 1.8 + 0.05).toFixed(3));
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newTrade: MarketRecentTrade = {
      id: Math.random().toString(36).substring(2, 9),
      price: tradePrice,
      amount: tradeAmount,
      time: nowStr,
      side: isBuy ? 'buy' : 'sell'
    };

    setRecentTrades(prev => [newTrade, ...prev.slice(0, 14)]);
  }, [currentPrice, precision]);

  // Encontra o volume máximo para a barra de profundidade acumulada
  const maxAskTotal = bookData.asks.length > 0 ? bookData.asks[0].total : 1;
  const maxBidTotal = bookData.bids.length > 0 ? bookData.bids[bookData.bids.length - 1].total : 1;
  const maxTotal = Math.max(maxAskTotal, maxBidTotal) || 1;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden flex flex-col h-full shadow-xl">
      {/* Abas Livro de Ordens / Histórico de Negócios */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1 text-xs">
        <button
          onClick={() => setActiveTab('book')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-semibold rounded-lg transition-all ${
            activeTab === 'book'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={13} /> Livro de Ofertas
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-semibold rounded-lg transition-all ${
            activeTab === 'trades'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity size={13} /> Fita de Negócios
        </button>
      </div>

      {activeTab === 'book' && (
        <div className="p-3 text-xs font-mono flex-1 flex flex-col justify-between">
          {/* Cabeçalho da Tabela */}
          <div className="grid grid-cols-3 text-slate-500 pb-2 border-b border-slate-800/60 font-sans text-[11px]">
            <span>Preço (USDT)</span>
            <span className="text-right">Qtd</span>
            <span className="text-right">Total</span>
          </div>

          {/* Vendas (Asks - Vermelho) */}
          <div className="space-y-1 py-2 my-auto">
            {bookData.asks.slice(-6).map((item, idx) => {
              const depthPercent = Math.min(100, Math.round((item.total / maxTotal) * 100));
              return (
                <div
                  key={`ask-${idx}`}
                  onClick={() => onSelectPrice?.(item.price)}
                  className="group relative grid grid-cols-3 py-0.5 cursor-pointer hover:bg-rose-500/10 rounded px-1 transition-colors"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none rounded-r transition-all duration-300"
                    style={{ width: `${depthPercent}%` }}
                  />
                  <span className="text-rose-400 font-semibold relative z-10">{item.price.toFixed(precision)}</span>
                  <span className="text-slate-300 text-right relative z-10">{item.amount}</span>
                  <span className="text-slate-400 text-right relative z-10">{item.total}</span>
                </div>
              );
            })}
          </div>

          {/* Indicador Central de Preço Médio / Spread */}
          <div className="my-2 py-2 px-3 bg-slate-900/80 border-y border-slate-800 flex items-center justify-between rounded-lg font-sans">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white font-mono">{currentPrice.toFixed(precision)}</span>
              <span className="flex items-center text-xs font-semibold text-emerald-400">
                <ArrowUpRight size={14} /> $
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Spread: {bookData.spread.toFixed(precision)}</span>
          </div>

          {/* Compras (Bids - Verde) */}
          <div className="space-y-1 py-2 my-auto">
            {bookData.bids.slice(0, 6).map((item, idx) => {
              const depthPercent = Math.min(100, Math.round((item.total / maxTotal) * 100));
              return (
                <div
                  key={`bid-${idx}`}
                  onClick={() => onSelectPrice?.(item.price)}
                  className="group relative grid grid-cols-3 py-0.5 cursor-pointer hover:bg-emerald-500/10 rounded px-1 transition-colors"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none rounded-r transition-all duration-300"
                    style={{ width: `${depthPercent}%` }}
                  />
                  <span className="text-emerald-400 font-semibold relative z-10">{item.price.toFixed(precision)}</span>
                  <span className="text-slate-300 text-right relative z-10">{item.amount}</span>
                  <span className="text-slate-400 text-right relative z-10">{item.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'trades' && (
        <div className="p-3 text-xs font-mono flex-1 overflow-y-auto max-h-80">
          <div className="grid grid-cols-3 text-slate-500 pb-2 border-b border-slate-800/60 font-sans text-[11px] mb-2">
            <span>Preço</span>
            <span className="text-right">Tamanho</span>
            <span className="text-right">Hora</span>
          </div>
          <div className="space-y-1.5">
            {recentTrades.map(trade => (
              <div key={trade.id} className="grid grid-cols-3 py-0.5 hover:bg-slate-900 rounded px-1">
                <span className={`font-semibold flex items-center gap-0.5 ${trade.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {trade.side === 'buy' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {trade.price.toFixed(precision)}
                </span>
                <span className="text-slate-300 text-right">{trade.amount}</span>
                <span className="text-slate-500 text-right text-[11px]">{trade.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
