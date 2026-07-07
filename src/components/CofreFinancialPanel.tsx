import React from 'react';

export default function CofreFinancialPanel({ sim }: { sim: any }) {
  if (!sim) return null;
  const { balance, totalNeeded, purchases, remaining, items } = sim;

  const formatted = (v: number) => new Intl.NumberFormat().format(Math.round(v * 100) / 100);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Saldo</p>
          <p className="text-2xl font-semibold">{formatted(balance)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Total necessário</p>
          <p className="text-lg font-medium">{formatted(totalNeeded)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Sugestões de compra</p>
          <p className="text-lg font-medium">{purchases.length}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Saldo restante</p>
          <p className="text-lg font-medium">{formatted(remaining)}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-400">Top custos</p>
        <ul className="mt-2 space-y-2">
          {items.slice(0, 3).map((it: any) => (
            <li key={it.item.id} className="flex items-center justify-between bg-white/5 rounded p-2">
              <div>
                <div className="text-sm">{it.item.nome}</div>
                <div className="text-xs text-muted">Qt: {it.quantity}</div>
              </div>
              <div className="text-sm">{formatted(it.bestTotal)}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
