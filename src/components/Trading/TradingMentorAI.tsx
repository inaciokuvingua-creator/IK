import React, { useState, useEffect } from 'react';
import { GraduationCap, Lightbulb, MessageSquare, ChevronRight, PlayCircle } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
 
export default function TradingMentorAI() {
  const { analysis, selectedAsset, loading } = useTrading();
  const [activeLesson, setActiveLesson] = useState<string | null>(null);

  const getDidacticExplanation = () => {
    if (!analysis) return "Olá! Selecione um ativo e eu explicarei tudo o que está a acontecer no mercado agora, como se fosse uma aula particular.";
    
    return `Olá! Vamos analisar o ${selectedAsset?.symbol}. Atualmente, observamos um cenário ${analysis.sentiment.label}. 
    Isso acontece porque o RSI está em ${analysis.technical.rsi}, o que nos diz que o ativo está com uma boa força de compra, mas ainda não está 'sobrecomprado'. 
    Além disso, detetamos um padrão '${analysis.patterns[0]}', que é uma figura clássica que geralmente indica continuação de tendência.`;
  };

  const lessons = [
    { id: 'rsi', title: 'O que é o RSI?', description: 'Aprenda a medir a força do mercado.' },
    { id: 'patterns', title: 'Padrões Gráficos', description: 'Como identificar figuras de reversão.' },
    { id: 'sentiment', title: 'Sentimento de Mercado', description: 'Entenda a psicologia dos traders.' },
  ];

  return (
    <div className="bg-gradient-to-br from-indigo-900/40 to-emerald-900/40 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">IK Trading Mentor</h3>
            <p className="text-xs text-indigo-300 font-medium">Seu guia didático em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Modo Aula Ativo
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Mentor Message */}
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center border-2 border-indigo-400/50">
            <span className="text-[10px] font-bold text-white">IK</span>
          </div>
          <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-sm text-gray-200 leading-relaxed italic">
              "{getDidacticExplanation()}"
            </p>
            {analysis && (
              <button className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                <PlayCircle size={14} />
                Continuar aula sobre este ativo
              </button>
            )}
          </div>
        </div>

        {/* Quick Lessons Grid */}
        <div>
          <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Lightbulb size={14} />
            Lições Rápidas
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => setActiveLesson(lesson.id)}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-all group"
              >
                <h5 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{lesson.title}</h5>
                <p className="text-[10px] text-gray-400 mt-1">{lesson.description}</p>
                <div className="mt-2 flex items-center text-[10px] text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-all">
                  Começar <ChevronRight size={10} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ask Mentor */}
        <div className="relative">
          <input
            type="text"
            placeholder="Pergunte ao mentor: 'O que significa este RSI?'"
            className="w-full pl-4 pr-12 py-3 bg-black/30 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white hover:bg-indigo-400 transition-colors">
            <MessageSquare size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
