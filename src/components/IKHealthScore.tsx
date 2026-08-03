import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Cofre, Negocio, PatrimonioItem, Transacao } from '../lib/supabase';

type Props = {
  cofres: Cofre[];
  transacoes: Transacao[];
  negocios: Negocio[];
  patrimonio: PatrimonioItem[];
  onNavigate: (page: string) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scoreLabel(score: number) {
  if (score >= 80) return { label: 'Excelente', tone: 'text-emerald-400', Icon: ShieldCheck };
  if (score >= 55) return { label: 'Estavel', tone: 'text-amber-400', Icon: Activity };
  return { label: 'Atencao', tone: 'text-red-400', Icon: AlertTriangle };
}

export default function IKHealthScore({ cofres, transacoes, negocios, patrimonio, onNavigate }: Props) {
  const saldoCofres = cofres.reduce((sum, c) => sum + c.saldo, 0);

  const receitasTx = transacoes
    .filter((tx) => tx.tipo === 'entrada')
    .reduce((sum, tx) => sum + tx.valor, 0);

  const despesasTx = transacoes
    .filter((tx) => tx.tipo === 'saida')
    .reduce((sum, tx) => sum + tx.valor, 0);

  const receitaNegocios = negocios.reduce((sum, n) => sum + n.receita_mensal, 0);
  const despesaNegocios = negocios.reduce((sum, n) => sum + n.despesa_mensal, 0);

  const totalPatrimonio = patrimonio.reduce((sum, p) => sum + p.valor_atual, 0);

  const totalReceita = receitasTx + receitaNegocios;
  const totalDespesa = despesasTx + despesaNegocios;
  const fluxo = totalReceita - totalDespesa;

  const reservaRatio = totalDespesa > 0 ? saldoCofres / totalDespesa : 1;
  const estabilidadeFluxo = totalReceita > 0 ? fluxo / totalReceita : 0;
  const coberturaPatrimonial = totalDespesa > 0 ? totalPatrimonio / totalDespesa : 1;

  const reservaScore = clamp(reservaRatio * 45, 0, 45);
  const fluxoScore = clamp((estabilidadeFluxo + 0.5) * 30, 0, 30);
  const patrimonioScore = clamp(coberturaPatrimonial * 25, 0, 25);

  const healthScore = Math.round(clamp(reservaScore + fluxoScore + patrimonioScore, 0, 100));
  const { label, tone, Icon } = scoreLabel(healthScore);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">IK Financial Health</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Indice de saude financeira</h3>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-semibold ${tone}`}>
          <Icon size={13} />
          {label}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-bold text-white">{healthScore}</p>
          <p className="text-xs text-gray-500">de 100 pontos</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('financeiro')}
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20"
        >
          Melhorar indice
        </button>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all"
          style={{ width: `${healthScore}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-gray-400 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2">
          Reserva: <span className="font-semibold text-gray-200">{Math.round(reservaScore)}/45</span>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2">
          Fluxo: <span className="font-semibold text-gray-200">{Math.round(fluxoScore)}/30</span>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2">
          Patrimonio: <span className="font-semibold text-gray-200">{Math.round(patrimonioScore)}/25</span>
        </div>
      </div>
    </section>
  );
}
