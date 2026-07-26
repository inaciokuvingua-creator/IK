import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  BookOpen,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { PATTERN_QUIZ_DATABASE, type PatternQuizItem } from '../../lib/tradingSimulationData';

interface PatternQuizChallengeProps {
  onEarnXp: (amount: number) => void;
}

export default function PatternQuizChallenge({ onEarnXp }: PatternQuizChallengeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuiz: PatternQuizItem = PATTERN_QUIZ_DATABASE[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswered) return;

    setIsAnswered(true);
    if (selectedOption === currentQuiz.correctIndex) {
      setScore(s => s + 1);
      onEarnXp(currentQuiz.xpReward);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    if (currentIndex < PATTERN_QUIZ_DATABASE.length - 1) {
      setCurrentIndex(c => c + 1);
    } else {
      // Reiniciar ou concluir
      setCurrentIndex(0);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 space-y-6 shadow-2xl">
      {/* Cabeçalho do Quiz */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold font-mono">
              QUESTÃO {currentIndex + 1} DE {PATTERN_QUIZ_DATABASE.length}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold">
              {currentQuiz.difficulty}
            </span>
            <span className="text-xs text-slate-400 font-semibold">{currentQuiz.category}</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mt-2 flex items-center gap-2">
            <BookOpen className="text-emerald-400" size={22} /> {currentQuiz.title}
          </h2>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-mono">
          <Award className="text-amber-400" size={18} />
          <div>
            <div className="text-slate-400">Recompensa</div>
            <strong className="text-emerald-400">+{currentQuiz.xpReward} XP</strong>
          </div>
        </div>
      </div>

      {/* Pergunta */}
      <p className="text-slate-200 font-medium text-base leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
        {currentQuiz.question}
      </p>

      {/* Exibição Visual do Padrão Gráfico de Exemplo */}
      {currentQuiz.candlesSnippet.length > 0 && (
        <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <Sparkles size={13} className="text-amber-400" /> Padrão em Exame: <strong className="text-white">{currentQuiz.patternName}</strong>
          </span>
          <div className="flex items-center justify-center gap-6 py-4">
            {currentQuiz.candlesSnippet.map((c, i) => {
              const isGreen = c.close >= c.open;
              return (
                <div key={i} className="flex flex-col items-center gap-1 font-mono text-xs">
                  <div className={`w-8 rounded flex items-center justify-center py-6 font-bold shadow-lg ${
                    isGreen ? 'bg-emerald-500 text-slate-950 border border-emerald-400' : 'bg-rose-500 text-white border border-rose-400'
                  }`}>
                    {c.time}
                  </div>
                  <span className="text-slate-400 text-[11px]">${c.close}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Opções de Resposta */}
      <div className="space-y-3">
        {currentQuiz.options.map((optionText, idx) => {
          let optionStyle = 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900';

          if (selectedOption === idx) {
            optionStyle = 'border-cyan-500 bg-cyan-500/10 text-white font-semibold';
          }

          if (isAnswered) {
            if (idx === currentQuiz.correctIndex) {
              optionStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold';
            } else if (selectedOption === idx) {
              optionStyle = 'border-rose-500 bg-rose-500/20 text-rose-300 font-bold';
            }
          }

          return (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => handleSelectOption(idx)}
              className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between ${optionStyle}`}
            >
              <span>{optionText}</span>
              {isAnswered && idx === currentQuiz.correctIndex && (
                <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
              )}
              {isAnswered && selectedOption === idx && idx !== currentQuiz.correctIndex && (
                <XCircle className="text-rose-400 shrink-0" size={20} />
              )}
            </button>
          );
        })}
      </div>

      {/* Explicação Pro após Responder */}
      {isAnswered && (
        <div className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs font-sans">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
            <Zap size={16} /> Explicação Técnica do Professor
          </div>
          <p className="text-slate-300 leading-relaxed">{currentQuiz.explanation}</p>
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-300">
            <strong>Dica Pro de Trading:</strong> {currentQuiz.traderTip}
          </div>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3 pt-2">
        {!isAnswered ? (
          <button
            disabled={selectedOption === null}
            onClick={handleSubmitAnswer}
            className="py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            Confirmar Resposta <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            Próximo Desafio <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
