import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Shield } from 'lucide-react';

type Props = {
  onExplore?: () => void;
};

type Slide = {
  id: string;
  title: string;
  subtitle: string;
  metricLabel: string;
  metricValue: string;
  accent: string;
  Icon: typeof Shield;
};

const AUTOPLAY_MS = 4200;

export default function AutoPresentationSlides({ onExplore }: Props) {
  const slides = useMemo<Slide[]>(
    () => [
      {
        id: 'controle',
        title: 'Controle financeiro inteligente',
        subtitle: 'Visualize receitas, despesas e tendências em tempo real.',
        metricLabel: 'Organizacao mensal',
        metricValue: '+38%',
        accent: 'from-emerald-500/25 to-teal-500/10',
        Icon: Activity,
      },
      {
        id: 'seguranca',
        title: 'Seguranca para os seus dados',
        subtitle: 'Fluxos protegidos para operacoes e historico financeiro.',
        metricLabel: 'Confianca operacional',
        metricValue: '99.9%',
        accent: 'from-blue-500/25 to-cyan-500/10',
        Icon: Shield,
      },
      {
        id: 'insights',
        title: 'Insights claros para decidir melhor',
        subtitle: 'Acompanhe desempenho com indicadores simples e objetivos.',
        metricLabel: 'Decisoes orientadas',
        metricValue: '+26%',
        accent: 'from-amber-500/25 to-orange-500/10',
        Icon: BarChart3,
      },
    ],
    [],
  );

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [slides.length]);

  const activeSlide = slides[activeIndex];
  const ActiveIcon = activeSlide.Icon;

  return (
    <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${activeSlide.accent}`} />

      <div className="relative grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div className="text-left">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-300">
            <ActiveIcon size={14} />
            Destaque
          </p>
          <h3 className="mb-2 text-2xl font-bold text-white sm:text-3xl">{activeSlide.title}</h3>
          <p className="text-sm leading-relaxed text-gray-300 sm:text-base">{activeSlide.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-900/85 px-5 py-4 text-left sm:min-w-44">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{activeSlide.metricLabel}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{activeSlide.metricValue}</p>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-gray-800 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Ir para slide ${index + 1}`}
              className={`h-2.5 rounded-full transition-all ${index === activeIndex ? 'w-8 bg-emerald-400' : 'w-2.5 bg-gray-600 hover:bg-gray-500'}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onExplore}
          className="rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25"
        >
          Explorar agora
        </button>
      </div>
    </div>
  );
}
