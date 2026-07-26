import { useState } from 'react';
import { AlertTriangle, CandlestickChart, GraduationCap, Search, Globe, ShieldAlert } from 'lucide-react';
import { TradingProvider, useTrading } from '../context/TradingContext';
import ExchangeTicker from '../components/Trading/ExchangeTicker';
import EconomicCalendar from '../components/Trading/EconomicCalendar';
import TradeAcademySuite from '../components/Trading/TradeAcademySuite';
import MarketScanner from '../components/Trading/MarketScanner';
import AIAnalysisPanel from '../components/Trading/AIAnalysisPanel';
import PredictionCard from '../components/Trading/PredictionCard';
import IntelligenceAggregator from '../components/Trading/IntelligenceAggregator';

function AIScannerAnalysisView() {
  const { selectedAsset, analysis, predictions } = useTrading();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner de Ativos na Esquerda */}
        <div className="lg:col-span-5 xl:col-span-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <MarketScanner />
        </div>

        {/* Análise de IA e Previsões na Direita */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {selectedAsset ? (
            <>
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <AIAnalysisPanel />
              </div>

              {predictions && (
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                  <PredictionCard />
                </div>
              )}

              {analysis && (
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                  <IntelligenceAggregator />
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Search className="mx-auto text-emerald-400" size={32} />
              <h3 className="text-lg font-bold text-white">Selecione um ativo no Scanner</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Escolha qualquer Cripto, Par de Forex, Ação ou Commodity na lista para gerar a análise de indicadores (RSI, MACD, Média Móvel), sentimento e cenários probabilísticos de preço.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TradeInner() {
  const [activeView, setActiveView] = useState<'academy' | 'scanner' | 'macro'>('academy');

  return (
    <div className="space-y-6 -mt-5 -mx-5 lg:-mt-7 lg:-mx-7">
      <ExchangeTicker />

      <div className="px-5 lg:px-7 space-y-6 pt-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-500/20 p-3 shrink-0 border border-emerald-500/30">
              <CandlestickChart className="text-emerald-400" size={26} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                IK Trading Hub & Pro Terminal
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Plataforma completa de simulação profissional, scanner de ativos globais, análise probabilística de IA e notícias macroeconômicas.
              </p>
            </div>
          </div>

          <div className="flex border border-slate-800 bg-slate-900/80 p-1 rounded-2xl text-xs font-bold shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveView('academy')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                activeView === 'academy'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap size={15} /> Terminal & Simulação
            </button>
            <button
              onClick={() => setActiveView('scanner')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                activeView === 'scanner'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search size={15} /> Scanner & Análise IA
            </button>
            <button
              onClick={() => setActiveView('macro')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                activeView === 'macro'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe size={15} /> Calendário & Macro
            </button>
          </div>
        </header>

        {activeView === 'academy' && <TradeAcademySuite />}
        {activeView === 'scanner' && <AIScannerAnalysisView />}
        {activeView === 'macro' && (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-5">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-white">
                  <Globe className="text-cyan-400" size={19} /> Notícias, Sentimento e Fatores Macro
                </h2>
                <p className="text-sm text-slate-400">
                  A análise combina informações técnicas, fundamentais e macroeconómicas, mostrando fontes e reduzindo a confiança quando os sinais entram em conflito.
                </p>
              </section>
              <section className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-5">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-white">
                  <ShieldAlert className="text-amber-400" size={19} /> Gestão de Risco & Invalidação
                </h2>
                <p className="text-sm text-slate-400">
                  Zonas de risco, oportunidade e invalidação são apresentadas com horizonte definido. Nunca arrisque mais do que a sua regra de capital tolera.
                </p>
              </section>
            </div>

            <EconomicCalendar />
          </div>
        )}

        <aside className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-slate-300">
          <p className="flex gap-2">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={16} />
            <span>
              <strong>Aviso Legal & Educacional:</strong> O sistema IK Trading Academy é um ambiente de treinamento simulado e aprendizagem técnica. Nenhuma operação envolve dinheiro real. As análises não constituem conselho financeiro.
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}

export default function Trade() {
  return (
    <TradingProvider>
      <TradeInner />
    </TradingProvider>
  );
}

