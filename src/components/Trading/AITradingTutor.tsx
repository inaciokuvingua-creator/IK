import { useState } from 'react';
import {
  Sparkles,
  Bot,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Award,
  Loader2
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface AITradingTutorProps {
  traderLevel: number;
  winRate: number;
  totalTrades: number;
  totalProfitUsdt: number;
  onEarnXp: (amount: number) => void;
}

export default function AITradingTutor({
  traderLevel,
  winRate,
  totalTrades,
  totalProfitUsdt,
  onEarnXp
}: AITradingTutorProps) {
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleGenerateCoachAnalysis = async () => {
    setLoading(true);
    setAiAdvice(null);

    try {
      // Tenta usar a API do Gemini via @google/genai se a chave existir no ambiente
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Você é um Mentor Sênior de Trading Profissional (IA Tutor). Analise o desempenho recente do aluno e forneça um plano de ação tático em 3 pontos curtos e diretos em Português:
- Nível de Trader: ${traderLevel}
- Taxa de Acerto (Win Rate): ${winRate}%
- Total de Operações Simuladas: ${totalTrades}
- Lucro/Prejuízo Acumulado: $${totalProfitUsdt} USDT

Responda no formato:
1. Ponto Forte Identificado
2. Alerta de Erro de Gestão de Risco a Evitar
3. Próximo Exercício Recomendado`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt
        });

        if (response.text) {
          setAiAdvice(response.text);
          onEarnXp(100);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Fallback para motor de regras locais do Tutor:', err);
    }

    // Regras inteligentes locais caso a chave não esteja presente ou ocorra erro
    setTimeout(() => {
      let adviceText = '';
      if (winRate >= 60) {
        adviceText = `🎯 **Excelente Desempenho Tático!**
1. **Ponto Forte:** Sua taxa de acerto de ${winRate}% demonstra boa disciplina na seleção de entradas em zonas de suporte/resistência.
2. **Cuidados com a Ganância:** Evite aumentar bruscamente a alavancagem após uma sequência de vitórias (FOMO).
3. **Próximo Passo:** Mantenha a meta fixa de Risco/Retorno 1:2.5 e pratique o Replay Histórico no cenário do Ouro!`;
      } else {
        adviceText = `📊 **Plano de Correção de Operações:**
1. **Ajuste Inicial:** Sua taxa de acerto está em ${winRate}%. O principal motivo costuma ser a ausência de Stop Loss pré-calculado.
2. **Regra de Ouro:** Nunca arrisque mais do que 1.5% do seu capital total em uma única operação.
3. **Exercício:** Faça o Quiz de Padrões de Candlesticks para treinar a identificação do Engolfo de Alta antes de abrir ordens!`;
      }
      setAiAdvice(adviceText);
      onEarnXp(100);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              IA Trading Tutor & Mentor Pessoal
            </h2>
            <p className="text-xs text-slate-400">
              Análise inteligente do seu comportamento de trading, gestão de risco e sugestões de aula.
            </p>
          </div>
        </div>

        <button
          disabled={loading}
          onClick={handleGenerateCoachAnalysis}
          className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Brain size={16} />
          )}
          {loading ? 'A analisar...' : 'Gerar Mentoria Completa'}
        </button>
      </div>

      {aiAdvice ? (
        <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-5 space-y-3 text-sm text-slate-200">
          <div className="flex items-center gap-2 text-purple-300 font-bold">
            <Sparkles size={18} className="text-amber-400" /> Relatório Tático do Mentor
          </div>
          <div className="whitespace-pre-line leading-relaxed text-xs sm:text-sm font-sans">
            {aiAdvice}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center space-y-3">
          <Brain className="mx-auto text-purple-400 animate-pulse" size={32} />
          <h3 className="text-sm font-bold text-white">Solicite uma auditoria das suas operações</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            A Inteligência Artificial avaliará a sua taxa de acerto (${winRate}%), o seu gerenciamento de banca e indicará exatamente onde melhorar.
          </p>
        </div>
      )}
    </div>
  );
}
