import React from 'react';

export default function BusinessPanel({ onAction }: { onAction?: (action: string) => void }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <h4 className="font-semibold">Fazer Negócio</h4>
      <div className="mt-3 grid grid-cols-1 gap-2">
        <button className="btn" onClick={() => onAction?.('orçamento')}>Solicitar orçamento</button>
        <button className="btn" onClick={() => onAction?.('cotação')}>Pedir cotação</button>
        <button className="btn" onClick={() => onAction?.('reunião')}>Agendar reunião</button>
        <button className="btn" onClick={() => onAction?.('negociação')}>Iniciar negociação</button>
        <button className="btn" onClick={() => onAction?.('proposta')}>Criar proposta</button>
      </div>
    </div>
  );
}
