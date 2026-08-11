import React from 'react';
import type { CofreSimulation } from '../lib/costEngine';

export default function CofreFinancialPanel({ sim }: { sim: CofreSimulation }) {
  if (!sim) return null;
  const { balance, goalTotal, goalProgress, totalNeeded, purchases, remaining, items, reserve, safeBudget, inflows30Days, outflows30Days, net30Days, projectedMonthlyNet, estimatedDaysToGoal, runwayDays, riskLevel, healthScore, recommendations } = sim;

  const formatted = (v: number) => new Intl.NumberFormat().format(Math.round(v * 100) / 100);
  const statusTone = riskLevel === 'high' ? 'text-red-300 border-red-900/60 bg-red-950/30' : riskLevel === 'medium' ? 'text-amber-300 border-amber-900/60 bg-amber-950/30' : 'text-emerald-300 border-emerald-900/60 bg-emerald-950/30';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-gray-400">Saldo atual</p>
          <p className="text-2xl font-semibold text-white">{formatted(balance)}</p>
        </div>
        <div className={`rounded-2xl border px-3 py-2 ${statusTone}`}>
          <p className="text-xs uppercase tracking-wider font-semibold">Saúde do cofre</p>
          <p className="text-lg font-bold">{healthScore}/100</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Meta" value={formatted(goalTotal)} />
        <Metric label="Orçamento seguro" value={formatted(safeBudget)} />
        <Metric label="Fluxo 30 dias" value={formatted(net30Days)} tone={net30Days >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <Metric label="Reserva" value={formatted(reserve)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MiniStat label="Entradas 30d" value={formatted(inflows30Days)} tone="text-emerald-400" />
        <MiniStat label="Saídas 30d" value={formatted(outflows30Days)} tone="text-red-400" />
        <MiniStat label="Projeção mensal" value={formatted(projectedMonthlyNet)} tone={projectedMonthlyNet >= 0 ? 'text-emerald-400' : 'text-red-400'} />
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400">Progresso da meta</p>
            <p className="text-sm text-white font-medium">{formatted(goalProgress)}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Saldo restante na simulação</p>
            <p className="text-sm text-white font-medium">{formatted(remaining)}</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" style={{ width: `${Math.max(0, Math.min(100, goalProgress))}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
          <div>
            <p className="uppercase tracking-wider text-[10px] mb-1">Can buy all</p>
            <p className="text-white font-medium">{purchases.length === items.length ? 'Sim' : 'Não'}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-[10px] mb-1">Tempo até meta</p>
            <p className="text-white font-medium">{estimatedDaysToGoal === null ? 'Indefinido' : `${estimatedDaysToGoal} dias`}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-[10px] mb-1">Runway</p>
            <p className="text-white font-medium">{runwayDays === null ? 'Sem risco imediato' : `${runwayDays} dias`}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-[10px] mb-1">Itens sugeridos</p>
            <p className="text-white font-medium">{purchases.length}</p>
          </div>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-3">
          <p className="text-sm text-gray-400 mb-2">Recomendações inteligentes</p>
          <ul className="space-y-2 text-sm text-gray-200">
            {recommendations.slice(0, 3).map((item, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-emerald-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-sm text-gray-400">Top custos priorizados</p>
        <ul className="mt-2 space-y-2">
          {items.slice(0, 3).map((it) => (
            <li key={it.item.id} className="flex items-center justify-between bg-white/5 rounded-xl p-2.5">
              <div className="min-w-0 pr-2">
                <div className="text-sm text-white truncate">{it.item.nome}</div>
                <div className="text-xs text-gray-400">Qt: {it.quantity}</div>
              </div>
              <div className="text-sm font-medium text-white">{formatted(it.bestTotal)}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-base font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
