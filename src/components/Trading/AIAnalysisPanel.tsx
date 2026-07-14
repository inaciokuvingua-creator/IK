import React from 'react';
import { TrendingUp, AlertCircle, Zap, Lightbulb } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export default function AIAnalysisPanel() {
  const { analysis, selectedAsset, loading } = useTrading();

  if (!selectedAsset) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
        <p className="text-gray-400">Selecione um ativo para ver a análise</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
        <p className="text-gray-400">Nenhuma análise disponível</p>
      </div>
    );
  }

  const sentimentColor = {
    bullish: 'text-emerald-400 bg-emerald-950/30',
    bearish: 'text-red-400 bg-red-950/30',
    neutral: 'text-amber-400 bg-amber-950/30',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{selectedAsset.symbol}</h3>
          <p className="text-sm text-gray-400">Análise Técnica e Sentimento</p>
        </div>
        <div className={`px-3 py-1 rounded-lg font-medium text-sm ${sentimentColor[analysis.sentiment.label]}`}>
          {analysis.sentiment.label.toUpperCase()}
        </div>
      </div>

      {/* Sentiment Score */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-300">Sentimento de Mercado</p>
          <span className="text-xl font-bold text-emerald-400">{(analysis.sentiment.score * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all"
            style={{ width: `${analysis.sentiment.score * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{analysis.sentiment.news_summary}</p>
      </div>

      {/* Technical Indicators */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Zap size={16} className="text-amber-400" />
          Indicadores Técnicos
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-700">
            <span className="text-sm text-gray-400">RSI (14)</span>
            <span className="font-medium text-white">{analysis.technical.rsi}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-700">
            <span className="text-sm text-gray-400">MACD</span>
            <span className="font-medium text-emerald-400">{analysis.technical.macd}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-400">Médias Móveis</span>
            <span className="font-medium text-white">{analysis.technical.moving_averages}</span>
          </div>
        </div>
      </div>

      {/* Signals */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <AlertCircle size={16} className="text-blue-400" />
          Sinais de Compra/Venda
        </h4>
        <div className="space-y-2">
          {analysis.technical.signals.map((signal, idx) => (
            <div key={idx} className="flex items-center gap-2 py-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-gray-300">{signal}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Patterns */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-purple-400" />
          Padrões Gráficos
        </h4>
        <div className="flex flex-wrap gap-2">
          {analysis.patterns.map((pattern, idx) => (
            <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-lg">
              {pattern}
            </span>
          ))}
        </div>
      </div>

      {/* Pro Tip - Didactic Element */}
      {analysis.mentor && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={16} className="text-emerald-400" />
            <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Dica do Mentor</h5>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            {analysis.mentor.pro_tip}
          </p>
        </div>
      )}
    </div>
  );
}
