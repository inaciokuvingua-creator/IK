import React from 'react';
import { Globe, Share2, MessageSquare, ExternalLink } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export default function IntelligenceAggregator() {
  const { analysis, loading } = useTrading();

  if (loading || !analysis) return null;

  const news = analysis.sentiment.recent_news || [];
  const externalIntel = analysis.external_intel || { summary: 'Análise agregada indisponível', aggregated_sources: [] as string[] };

  return (
    <div className="space-y-4">
      {/* External Intelligence Summary */}
      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Share2 size={18} className="text-emerald-400" />
          <h4 className="font-semibold text-white">Inteligência Agregada</h4>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed mb-4">
          {externalIntel.summary || 'Análise agregada indisponível'}
        </p>
        <div className="flex flex-wrap gap-2">
          {(externalIntel.aggregated_sources || []).map((source: string, idx: number) => (
            <span key={idx} className="px-2 py-1 bg-gray-800 text-gray-400 text-[10px] rounded-lg border border-gray-700">
              {source}
            </span>
          ))}
        </div>
      </div>

      {/* Real-time News Feed */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-blue-400" />
            <h4 className="font-semibold text-white">Notícias em Tempo Real</h4>
          </div>
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Live Feed</span>
        </div>
        <div className="divide-y divide-gray-700">
          {news.map((item: any, idx: number) => (
            <div key={idx} className="p-4 hover:bg-gray-700/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h5 className="text-sm font-medium text-white leading-snug">{item.title}</h5>
                <ExternalLink size={14} className="text-gray-500 shrink-0 mt-1" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{item.source}</span>
                <span className="text-[10px] text-gray-600">•</span>
                <span className={`text-[10px] font-bold ${
                  item.sentiment === 'Bullish' ? 'text-emerald-400' : 
                  item.sentiment === 'Bearish' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {item.sentiment}
                </span>
                <span className="text-[10px] text-gray-600 ml-auto">
                  {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {news.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">Nenhuma notícia recente encontrada para este ativo.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bot/Chat Intelligence Integration Hint */}
      <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={16} className="text-blue-400" />
          <h5 className="text-xs font-bold text-white uppercase tracking-wider">Integração de Bots</h5>
        </div>
        <p className="text-[11px] text-gray-400">
          Este módulo está sincronizado com as suas conversas anteriores e análises de outros agentes IK. 
          A IA utiliza este histórico para contextualizar as previsões atuais.
        </p>
      </div>
    </div>
  );
}
