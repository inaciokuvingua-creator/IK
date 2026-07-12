import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, BrainCircuit, CandlestickChart, Newspaper, ShieldAlert } from 'lucide-react';
import { TradingProvider } from '../context/TradingContext';
import MarketScanner from '../components/Trading/MarketScanner';
import AIAnalysisPanel from '../components/Trading/AIAnalysisPanel';
import PredictionCard from '../components/Trading/PredictionCard';
import EconomicCalendar from '../components/Trading/EconomicCalendar';
import IntelligenceAggregator from '../components/Trading/IntelligenceAggregator';
import ExchangeTicker from '../components/Trading/ExchangeTicker';
import TradingMentorAI from '../components/Trading/TradingMentorAI';

const intervals = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];
const indicators = ['MA20', 'MA50', 'MA200', 'RSI', 'MACD', 'Bollinger', 'Volume', 'S/R'];

function ProfessionalChartShell() {
  const [interval, setInterval] = useState('4h');
  const [enabled, setEnabled] = useState(['MA20', 'MA50', 'RSI', 'Volume', 'S/R']);
  const providerStatus = useMemo(() => 'Dados reais via fornecedor configurado', []);

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-950/70 overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-800 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-white font-semibold"><CandlestickChart className="text-emerald-400" size={20}/> BTC/USD</div>
          <p className="mt-1 text-xs text-slate-400">{providerStatus} · UTC · última atualização apresentada no gráfico</p>
        </div>
        <div className="flex flex-wrap gap-2">{intervals.map(item => <button key={item} onClick={() => setInterval(item)} className={`rounded-lg px-3 py-1.5 text-xs ${interval === item ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>{item}</button>)}</div>
      </div>
      <div className="flex flex-wrap gap-2 p-4">{indicators.map(item => <button key={item} onClick={() => setEnabled(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item])} className={`rounded-full border px-3 py-1 text-xs ${enabled.includes(item) ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-300' : 'border-slate-700 text-slate-400'}`}>{item}</button>)}</div>
      <div className="relative mx-4 mb-4 h-80 rounded-xl border border-slate-800 bg-[linear-gradient(to_right,rgba(51,65,85,.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,.22)_1px,transparent_1px)] bg-[size:48px_40px]">
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center"><div><Activity className="mx-auto mb-3 text-emerald-400"/><p className="font-medium text-white">Área do gráfico OHLCV real</p><p className="mt-2 max-w-xl text-sm text-slate-400">A Edge Function entrega velas normalizadas de Twelve Data, Alpha Vantage ou Massive. Nenhum preço é simulado quando a fonte estiver indisponível.</p></div></div>
        <div className="absolute bottom-3 right-3 rounded-lg bg-slate-950/90 px-3 py-2 text-xs text-slate-400">Projeções futuras aparecem como faixas condicionais, não como certezas.</div>
      </div>
    </section>
  );
}

export default function Trade() {
  return (
    <TradingProvider><div className="space-y-6 -mt-5 -mx-5 lg:-mt-7 lg:-mx-7"><ExchangeTicker/><div className="px-5 lg:px-7 space-y-6 pt-6">
      <header className="flex items-start gap-3"><div className="rounded-xl bg-emerald-500/20 p-3"><BrainCircuit className="text-emerald-400" size={22}/></div><div><h1 className="text-2xl font-bold text-white">IK AI Trading Intelligence</h1><p className="text-sm text-slate-400">Análise profissional com dados reais e cenários probabilísticos explicáveis</p></div></header>
      <ProfessionalChartShell/>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><div><MarketScanner/></div><div className="space-y-6 lg:col-span-2"><IntelligenceAggregator/><AIAnalysisPanel/><PredictionCard/></div></div>
      <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><Newspaper className="text-cyan-400" size={19}/> Notícias, sentimento e fatores macro</h2><p className="text-sm text-slate-400">A análise combina informações técnicas, fundamentais e macroeconómicas, mostra fontes e reduz a confiança quando os sinais entram em conflito.</p></section><section className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><ShieldAlert className="text-amber-400" size={19}/> Gestão de risco</h2><p className="text-sm text-slate-400">Zonas de risco, oportunidade e invalidação são apresentadas com horizonte definido. A plataforma pode abster-se quando os dados forem insuficientes.</p></section></div>
      <TradingMentorAI/><EconomicCalendar/>
      <aside className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-slate-300"><p className="flex gap-2"><AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={16}/><span><strong>Aviso:</strong> As análises são educacionais e probabilísticas. Não constituem aconselhamento financeiro, recomendação de investimento ou garantia de desempenho. Mercados financeiros envolvem risco, incluindo a possibilidade de perda total do capital.</span></p></aside>
    </div></div></TradingProvider>
  );
}
