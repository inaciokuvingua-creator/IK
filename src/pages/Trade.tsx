import { TrendingUp } from 'lucide-react';
import { TradingProvider } from '../context/TradingContext';
import MarketScanner from '../components/Trading/MarketScanner';
import AIAnalysisPanel from '../components/Trading/AIAnalysisPanel';
import PredictionCard from '../components/Trading/PredictionCard';
import EconomicCalendar from '../components/Trading/EconomicCalendar';
import IntelligenceAggregator from '../components/Trading/IntelligenceAggregator';
import ExchangeTicker from '../components/Trading/ExchangeTicker';

export default function Trade() {
  return (
    <TradingProvider>
      <div className="space-y-6 -mt-5 -mx-5 lg:-mt-7 lg:-mx-7">
        <ExchangeTicker />
        
        <div className="px-5 lg:px-7 space-y-6 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">IK AI Trading Intelligence</h1>
            <p className="text-sm text-gray-400">Análise de mercados em tempo real com inteligência artificial</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Market Scanner */}
          <div className="lg:col-span-1">
            <MarketScanner />
          </div>

          {/* Right Column - Analysis and Predictions */}
          <div className="lg:col-span-2 space-y-6">
            <IntelligenceAggregator />
            <AIAnalysisPanel />
            <PredictionCard />
          </div>
        </div>

        {/* Economic Calendar - Full Width */}
        <div>
          <EconomicCalendar />
        </div>

        {/* Footer Info */}
        <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-4">
          <p className="text-xs text-gray-300">
            <strong>Nota:</strong> As análises fornecidas pela IA são baseadas em dados históricos e indicadores técnicos. 
            Não constituem recomendações de investimento. Trading envolve riscos significativos. Consulte um consultor 
            financeiro profissional antes de tomar decisões de investimento. Não garantimos lucros.
          </p>
        </div>
        </div>
      </div>
    </TradingProvider>
  );
}
