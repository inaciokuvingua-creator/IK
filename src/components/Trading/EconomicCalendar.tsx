import React, { useState } from 'react';
import { Calendar, AlertCircle, TrendingUp } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import type { ImpactLevel } from '../../types/trading';

export default function EconomicCalendar() {
  const { economicEvents, loading } = useTrading();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const impactColors: Record<ImpactLevel, string> = {
    low: 'bg-blue-950/20 border-blue-500/30 text-blue-400',
    medium: 'bg-amber-950/20 border-amber-500/30 text-amber-400',
    high: 'bg-red-950/20 border-red-500/30 text-red-400',
  };

  const impactIcons: Record<ImpactLevel, React.ReactNode> = {
    low: <AlertCircle size={14} />,
    medium: <AlertCircle size={14} />,
    high: <TrendingUp size={14} />,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-AO', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={20} className="text-emerald-400" />
        <div>
          <h3 className="text-lg font-bold text-white">Calendário Económico</h3>
          <p className="text-xs text-gray-400">Próximos eventos que podem afetar os mercados</p>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-2">
        {economicEvents.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
            <p className="text-gray-400">Nenhum evento económico próximo</p>
          </div>
        ) : (
          economicEvents.map(event => (
            <button
              key={event.id}
              onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
              className={`w-full p-4 rounded-xl border transition-all text-left ${
                expandedId === event.id
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-white truncate">{event.event_name}</h4>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 whitespace-nowrap ${impactColors[event.impact as ImpactLevel]}`}>
                      {impactIcons[event.impact as ImpactLevel]}
                      {event.impact.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(event.event_time)}</p>
                  {event.currency && (
                    <p className="text-xs text-gray-500 mt-1">Moeda: {event.currency}</p>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === event.id && (
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-400">Previsão</p>
                      <p className="text-sm font-semibold text-white">{event.forecast ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Anterior</p>
                      <p className="text-sm font-semibold text-white">{event.previous ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Atual</p>
                      <p className="text-sm font-semibold text-emerald-400">{event.actual ?? '-'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Categoria</p>
                    <p className="text-sm text-gray-300">{event.category}</p>
                  </div>
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3">
        <p className="text-xs text-gray-400 font-medium mb-2">Níveis de Impacto:</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-xs text-gray-300">Baixo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-gray-300">Médio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs text-gray-300">Alto</span>
          </div>
        </div>
      </div>
    </div>
  );
}
