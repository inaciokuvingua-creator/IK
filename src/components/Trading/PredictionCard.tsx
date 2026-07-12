import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export default function PredictionCard() {
  const { analysis, selectedAsset } = useTrading();

  if (!selectedAsset || !analysis) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
        <p className="text-gray-400">Selecione um ativo para ver previsões</p>
      </div>
    );
  }

  const predictions = analysis.predictions;

  const ScenarioBox = ({ 
    title, 
    icon: Icon, 
    color, 
    target, 
    probability 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    color: string; 
    target: string; 
    probability: number;
  }) => (
    <div className={`p-4 rounded-xl border ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        {Icon}
        <h4 className="font-semibold text-white">{title}</h4>
      </div>
      <div className="mb-3">
        <p className="text-2xl font-bold text-white">{target}</p>
        <p className="text-xs text-gray-400 mt-1">Alvo de Preço</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Probabilidade</span>
        <span className="font-bold text-white">{(probability * 100).toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
        <div
          className={`h-1.5 rounded-full transition-all ${color.includes('emerald') ? 'bg-emerald-500' : color.includes('amber') ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${probability * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-white">Previsões da IA</h3>
        <p className="text-sm text-gray-400 mt-1">Cenários de preço para os próximos dias</p>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScenarioBox
          title="Cenário Otimista"
          icon={<TrendingUp size={18} className="text-emerald-400" />}
          color="bg-emerald-950/20 border-emerald-500/30"
          target={predictions.optimistic.target}
          probability={predictions.optimistic.probability}
        />
        <ScenarioBox
          title="Cenário Neutro"
          icon={<Minus size={18} className="text-amber-400" />}
          color="bg-amber-950/20 border-amber-500/30"
          target={predictions.neutral.target}
          probability={predictions.neutral.probability}
        />
        <ScenarioBox
          title="Cenário Pessimista"
          icon={<TrendingDown size={18} className="text-red-400" />}
          color="bg-red-950/20 border-red-500/30"
          target={predictions.pessimistic.target}
          probability={predictions.pessimistic.probability}
        />
      </div>

      {/* Explanation */}
      <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertTriangle size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-white mb-2">Análise da IA</h4>
            <p className="text-sm text-gray-300 leading-relaxed">{predictions.explanation}</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-400 mb-1">Aviso Importante</h4>
            <p className="text-xs text-gray-300">
              Trading envolve riscos significativos. Não garantimos lucros. As previsões são baseadas em análise histórica e podem não refletir eventos futuros. Consulte um consultor financeiro antes de tomar decisões de investimento.
            </p>
          </div>
        </div>
      </div>

      {/* Probability Distribution Chart */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-4">Distribuição de Probabilidades</h4>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-emerald-400">Otimista</span>
              <span className="text-sm font-medium text-white">{(predictions.optimistic.probability * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full"
                style={{ width: `${predictions.optimistic.probability * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-amber-400">Neutro</span>
              <span className="text-sm font-medium text-white">{(predictions.neutral.probability * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full"
                style={{ width: `${predictions.neutral.probability * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-red-400">Pessimista</span>
              <span className="text-sm font-medium text-white">{(predictions.pessimistic.probability * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${predictions.pessimistic.probability * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
