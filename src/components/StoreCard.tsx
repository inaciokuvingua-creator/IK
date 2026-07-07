import React from 'react';

export default function StoreCard({ store, onOpen }: { store: any; onOpen: () => void }) {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden shadow-sm">
      <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${store.banner_url || '/public/store-banner.png'})` }} />
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-white font-semibold text-lg truncate">{store.nome}</h3>
            <p className="text-gray-400 text-sm truncate">{store.categoria || 'Geral'}</p>
          </div>
          {store.verified && <span className="text-emerald-400 text-xs px-2 py-1 bg-emerald-500/10 rounded-full">Verificada</span>}
        </div>
        <p className="text-gray-500 text-sm mt-3 h-14 overflow-hidden">{store.descricao || 'Sem descrição'}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            <div>{store.total_sales ?? 0} vendas</div>
            <div>Rating {Number(store.rating ?? 0).toFixed(1)}</div>
          </div>
          <button onClick={onOpen} className="btn btn-sm bg-emerald-500 hover:bg-emerald-400 text-white">Ver loja</button>
        </div>
      </div>
    </div>
  );
}
