import React from 'react';
import { RefreshCw, ArrowRightLeft } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export default function ExchangeTicker() {
  const { analysis, loading } = useTrading();

  if (loading || !analysis?.exchange_context) return null;

  const rates = analysis.exchange_context.rates;

  return (
    <div className="bg-gray-900/80 backdrop-blur-md border-y border-gray-800 py-2 overflow-hidden relative">
      <div className="flex items-center gap-6 animate-marquee whitespace-nowrap px-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <ArrowRightLeft size={14} className="text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-tighter">Live FX</span>
        </div>
        
        {Object.entries(rates).map(([pair, rate]) => (
          <div key={pair} className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">{pair}</span>
            <span className="text-sm font-mono text-emerald-400">{(rate as number).toFixed(4)}</span>
            <div className="w-1 h-1 rounded-full bg-gray-700" />
          </div>
        ))}
        
        {/* Duplicate for seamless loop */}
        {Object.entries(rates).map(([pair, rate]) => (
          <div key={`${pair}-dup`} className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">{pair}</span>
            <span className="text-sm font-mono text-emerald-400">{(rate as number).toFixed(4)}</span>
            <div className="w-1 h-1 rounded-full bg-gray-700" />
          </div>
        ))}
      </div>

      <style>{`
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
