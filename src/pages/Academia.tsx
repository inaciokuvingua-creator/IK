import { useMemo, useState } from 'react';
import { BookOpen, Briefcase, Building2, Calculator, CheckCircle2, ClipboardCheck, Crown, Landmark, Rocket, ShieldCheck, Target, TrendingUp } from 'lucide-react';

type Level = 'Basico' | 'Intermediario' | 'Avancado';

type Track = {
  id: string;
  title: string;
  level: Level;
  summary: string;
  outcomes: string[];
};

type Pillar = {
  id: string;
  name: string;
  icon: React.ElementType;
  intro: string;
  tracks: Track[];
  routes: { label: string; page: string }[];
};

const PILLARS: Pillar[] = [
  {
    id: 'empreendedorismo',
    name: 'Empreendedorismo',
    icon: Rocket,
    intro: 'Da validacao de ideia ao crescimento com governanca e expansao.',
    tracks: [
      {
        id: 'emp-b',
        title: 'Oportunidade + MVP + Proposta de valor',
        level: 'Basico',
        summary: 'Defina problema, cliente e proposta de valor com experimentacao rapida.',
        outcomes: ['Mapa de problema-cliente', 'MVP funcional', 'Business Model Canvas inicial'],
      },
      {
        id: 'emp-i',
        title: 'Go-to-market + vendas + autoridade',
        level: 'Intermediario',
        summary: 'Estruture canais de aquisicao, oferta comercial e rotina de conversao.',
        outcomes: ['Plano de lancamento', 'Funil de marketing/vendas', 'Playbook de posicionamento'],
      },
      {
        id: 'emp-a',
        title: 'Escala + cap table + M&A readiness',
        level: 'Avancado',
        summary: 'Prepare expansao, captação e governanca para crescimento sustentavel.',
        outcomes: ['Plano de escala regional', 'Data room de investimento', 'Checklist de governanca'],
      },
    ],
    routes: [
      { label: 'Negocios', page: 'negocios' },
      { label: 'Marketplace', page: 'marketplace' },
      { label: 'Minha Loja', page: 'minha-loja' },
    ],
  },
  {
    id: 'contabilidade',
    name: 'Contabilidade',
    icon: Calculator,
    intro: 'Do fundamento contabil a leitura estrategica das demonstracoes.',
    tracks: [
      {
        id: 'cont-b',
        title: 'Ativo, passivo, patrimonio, receitas e despesas',
        level: 'Basico',
        summary: 'Consolide estrutura de contas e consistencia de registros.',
        outcomes: ['Plano de contas simplificado', 'Balancete operacional', 'Padrao de classificacao'],
      },
      {
        id: 'cont-i',
        title: 'Balanço, DRE e fluxo de caixa',
        level: 'Intermediario',
        summary: 'Analise demonstracoes e obrigacoes fiscais com rotina mensal.',
        outcomes: ['DRE mensal', 'Fluxo de caixa projetado', 'Mapa de obrigacoes'],
      },
      {
        id: 'cont-a',
        title: 'Contabilidade gerencial + auditoria + normas',
        level: 'Avancado',
        summary: 'Implemente visao de performance por unidade e conformidade robusta.',
        outcomes: ['Pacote gerencial executivo', 'Trilha de auditoria', 'Conformidade internacional'],
      },
    ],
    routes: [
      { label: 'Financeiro', page: 'financeiro' },
      { label: 'Relatorios', page: 'relatorios' },
    ],
  },
  {
    id: 'gestao',
    name: 'Gestao',
    icon: Building2,
    intro: 'Execucao diaria, projetos e lideranca em escala.',
    tracks: [
      {
        id: 'gest-b',
        title: 'Organizacao, tempo e comunicacao',
        level: 'Basico',
        summary: 'Defina prioridades e rituais de execucao consistentes.',
        outcomes: ['Agenda tatica semanal', 'Padrao de comunicacao', 'Ritual de revisao'],
      },
      {
        id: 'gest-i',
        title: 'Projetos (Agile) + KPIs/OKRs + delegacao',
        level: 'Intermediario',
        summary: 'Conecte iniciativas, metas e performance de equipe.',
        outcomes: ['Board de projetos', 'OKRs trimestrais', 'Matriz de responsabilidade'],
      },
      {
        id: 'gest-a',
        title: 'Estrategia + mudanca + lideranca executiva',
        level: 'Avancado',
        summary: 'Conduza transformacoes, cultura e tomada de decisao em crise.',
        outcomes: ['Mapa estrategico 12-24 meses', 'Plano de mudanca', 'Modelo de governanca de crise'],
      },
    ],
    routes: [
      { label: 'Empresas', page: 'empresas' },
      { label: 'Dashboard', page: 'dashboard' },
    ],
  },
  {
    id: 'controle',
    name: 'Controle',
    icon: ClipboardCheck,
    intro: 'Controle operacional, budget, riscos e compliance.',
    tracks: [
      {
        id: 'ctrl-b',
        title: 'Registro diario + conciliacao + saldo',
        level: 'Basico',
        summary: 'Garanta consistencia dos dados operacionais e financeiros.',
        outcomes: ['Checklist diario', 'Conferencias de saldo', 'Historico confiavel'],
      },
      {
        id: 'ctrl-i',
        title: 'Budget + desvios + aprovacao de despesas',
        level: 'Intermediario',
        summary: 'Implemente disciplina de planejamento e execucao financeira.',
        outcomes: ['Orcamento por centro', 'Relatorio de desvios', 'Fluxo de aprovacao'],
      },
      {
        id: 'ctrl-a',
        title: 'ERM + auditoria interna + automacao',
        level: 'Avancado',
        summary: 'Escale controle com risco corporativo e trilhas de auditoria.',
        outcomes: ['Mapa de risco corporativo', 'Matriz de controles internos', 'Automacao de monitoramento'],
      },
    ],
    routes: [
      { label: 'Cofres', page: 'cofres' },
      { label: 'Financeiro', page: 'financeiro' },
      { label: 'Relatorios', page: 'relatorios' },
    ],
  },
  {
    id: 'financas',
    name: 'Financas',
    icon: Landmark,
    intro: 'Fluxo de caixa, investimento, valuation e estrutura de capital.',
    tracks: [
      {
        id: 'fin-b',
        title: 'Fluxo de caixa pessoal/empresarial + reserva',
        level: 'Basico',
        summary: 'Organize liquidez e separacao entre caixa pessoal e empresarial.',
        outcomes: ['Politica de reserva', 'Fluxo de caixa base', 'Separacao de contas'],
      },
      {
        id: 'fin-i',
        title: 'Capital de giro + VPL/TIR + financiamento',
        level: 'Intermediario',
        summary: 'Avalie projetos e custo de capital para decisoes de crescimento.',
        outcomes: ['Modelo de viabilidade', 'Plano de capital de giro', 'Matriz de financiamento'],
      },
      {
        id: 'fin-a',
        title: 'WACC + valuation + engenharia financeira',
        level: 'Avancado',
        summary: 'Aprimore estrategia de valor com alocacao e alavancagem responsavel.',
        outcomes: ['Modelo de valuation', 'Estrategia de estrutura de capital', 'Politica de portfolio'],
      },
    ],
    routes: [
      { label: 'Trade Lab', page: 'trade' },
      { label: 'Patrimonio', page: 'patrimonio' },
      { label: 'Relatorios', page: 'relatorios' },
    ],
  },
];

const LS_KEY = 'ik-academia-progress-v1';

export default function Academia() {
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const completion = useMemo(() => {
    const total = PILLARS.reduce((sum, pillar) => sum + pillar.tracks.length, 0);
    const checked = Object.values(done).filter(Boolean).length;
    return { total, checked, percent: total ? Math.round((checked / total) * 100) : 0 };
  }, [done]);

  const toggle = (trackId: string) => {
    setDone((prev) => {
      const next = { ...prev, [trackId]: !prev[trackId] };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const goPage = (page: string) => {
    window.dispatchEvent(new CustomEvent('navigatePage', { detail: { page } }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-gray-950 to-slate-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Crown size={14} /> IK Academy 360
            </div>
            <h1 className="mt-3 text-2xl font-bold text-white">Trilha integrada de dominio tecnico e de negocios</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Este modulo consolida os 5 pilares essenciais para engenheiros, desenvolvedores e criadores de ecossistemas comerciais,
              com progressao de Basico para Avancado e ligacao direta aos modulos reais da plataforma.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 min-w-52">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Progresso</div>
            <div className="mt-1 text-2xl font-bold text-white">{completion.percent}%</div>
            <div className="mt-2 h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${completion.percent}%` }} />
            </div>
            <div className="mt-2 text-xs text-slate-300">{completion.checked} de {completion.total} trilhas concluidas</div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <article key={pillar.id} className="rounded-3xl border border-slate-800 bg-gray-900/80 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-white">
                    <Icon size={18} className="text-emerald-400" />
                    <h2 className="text-lg font-semibold">{pillar.name}</h2>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{pillar.intro}</p>
                </div>
                <button
                  onClick={() => goPage(pillar.routes[0]?.page ?? 'dashboard')}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-500"
                >
                  Abrir modulo
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {pillar.tracks.map((track) => (
                  <div key={track.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggle(track.id)}
                        className={`mt-0.5 rounded-full ${done[track.id] ? 'text-emerald-400' : 'text-slate-600'} hover:text-emerald-300`}
                        aria-label={`Marcar ${track.title}`}
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{track.title}</p>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-slate-300">
                            {track.level}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">{track.summary}</p>
                        <p className="mt-2 text-xs text-slate-500">Resultados esperados: {track.outcomes.join(' • ')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {pillar.routes.map((route) => (
                  <button
                    key={`${pillar.id}-${route.page}`}
                    onClick={() => goPage(route.page)}
                    className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                  >
                    {route.label}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-blue-500/20 bg-blue-950/20 p-5">
        <div className="flex items-center gap-2 text-blue-300">
          <Target size={16} />
          <h3 className="font-semibold">Modo de execucao recomendado (90 dias)</h3>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-2xl border border-blue-900/50 bg-slate-950/50 p-3">
            <p className="font-medium text-white">Dias 1-30</p>
            <p className="mt-1 text-slate-300">Concluir niveis Basicos e padronizar rotina de registro/controle no Financeiro + Cofres.</p>
          </div>
          <div className="rounded-2xl border border-blue-900/50 bg-slate-950/50 p-3">
            <p className="font-medium text-white">Dias 31-60</p>
            <p className="mt-1 text-slate-300">Avancar para Intermediario com metas, budget, funil comercial e operacao da loja/empresa.</p>
          </div>
          <div className="rounded-2xl border border-blue-900/50 bg-slate-950/50 p-3">
            <p className="font-medium text-white">Dias 61-90</p>
            <p className="mt-1 text-slate-300">Executar blocos Avancados: risco corporativo, valuation e estrategia de escala.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-1"><BookOpen size={12} /> Aprendizagem continua</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-1"><TrendingUp size={12} /> Evolucao orientada a KPI</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-1"><ShieldCheck size={12} /> Controle e compliance</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-1"><Briefcase size={12} /> Execucao de negocio</span>
        </div>
      </section>
    </div>
  );
}
