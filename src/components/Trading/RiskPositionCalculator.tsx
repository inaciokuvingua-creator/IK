import { useState } from 'react';
import { ShieldCheck, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function RiskPositionCalculator() {
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [entryPrice, setEntryPrice] = useState<number>(67450);
  const [stopLossPrice, setStopLossPrice] = useState<number>(66100);
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(70150);

  // Cálculos matemáticos de gestão de risco
  const maxRiskUsdt = accountBalance * (riskPercent / 100);
  const stopLossDistance = Math.abs(entryPrice - stopLossPrice);
  const stopLossDistancePercent = entryPrice > 0 ? (stopLossDistance / entryPrice) * 100 : 0;

  const takeProfitDistance = Math.abs(takeProfitPrice - entryPrice);
  const takeProfitDistancePercent = entryPrice > 0 ? (takeProfitDistance / entryPrice) * 100 : 0;

  const riskRewardRatio = stopLossDistance > 0 ? takeProfitDistance / stopLossDistance : 0;

  // Tamanho do Lote / Posição Recomendada
  const positionSizeUnits = stopLossDistance > 0 ? maxRiskUsdt / stopLossDistance : 0;
  const positionSizeUsdt = positionSizeUnits * entryPrice;

  // Alavancagem mínima recomendada
  const minRequiredLeverage = accountBalance > 0 ? Math.ceil(positionSizeUsdt / accountBalance) : 1;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 space-y-6 shadow-2xl">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Calculator size={22} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Calculadora de Risco & Tamanho da Posição</h2>
          <p className="text-xs text-slate-400">
            Calcule o tamanho exato da ordem para nunca perder mais do que o seu limite pré-estabelecido!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Banca Total (USDT)</label>
          <input
            type="number"
            value={accountBalance}
            onChange={e => setAccountBalance(Number(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-medium mb-1">Risco Aceitável (%)</label>
          <input
            type="number"
            step="0.1"
            value={riskPercent}
            onChange={e => setRiskPercent(Number(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-medium mb-1">Preço de Entrada ($)</label>
          <input
            type="number"
            value={entryPrice}
            onChange={e => setEntryPrice(Number(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-medium mb-1">Stop Loss ($)</label>
          <input
            type="number"
            value={stopLossPrice}
            onChange={e => setStopLossPrice(Number(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono"
          />
        </div>
      </div>

      {/* Resultados da Gestão de Risco */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 font-medium">Perda Máxima Tolerada</span>
          <p className="text-xl font-bold font-mono text-rose-400">-${maxRiskUsdt.toFixed(2)} USDT</p>
          <span className="text-[11px] text-slate-500">{riskPercent}% da banca total</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 font-medium">Tamanho Ideal da Ordem</span>
          <p className="text-xl font-bold font-mono text-emerald-400">${positionSizeUsdt.toFixed(2)} USDT</p>
          <span className="text-[11px] text-slate-500">{positionSizeUnits.toFixed(4)} Unidades</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 font-medium">Relação Risco / Retorno (R:R)</span>
          <p className={`text-xl font-bold font-mono ${riskRewardRatio >= 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
            1 : {riskRewardRatio.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500">
            {riskRewardRatio >= 2 ? '✅ R:R Excelente (>1:2)' : '⚠️ Atenção: R:R abaixo do recomendado (1:2)'}
          </span>
        </div>
      </div>
    </div>
  );
}
