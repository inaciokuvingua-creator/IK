import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Filter, RefreshCw, Search } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import type { AssetType } from '../../types/trading';

export default function MarketScanner() {
  const { assets, selectedAsset, setSelectedAsset, analyzeAsset, loading, fetchAssets } = useTrading();
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesType = filterType === 'all' || a.type === filterType;
      const matchesSearch = a.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           a.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [assets, filterType, searchTerm]);

  const assetTypes: { value: AssetType | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'crypto', label: '₿ Crypto' },
    { value: 'forex', label: '💱 Forex' },
    { value: 'stocks', label: '📊 Ações' },
    { value: 'indices', label: '📈 Índices' },
    { value: 'commodities', label: '🛢️ Commodities' },
    { value: 'etfs', label: '💼 ETFs' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Scanner de Mercados</h2>
          <p className="text-sm text-gray-400 mt-1">Monitorize ativos em tempo real</p>
        </div>
        <button
          onClick={fetchAssets}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Pesquisar símbolo ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {assetTypes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterType(value)}
              className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                filterType === value
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map(asset => (
          <button
            key={asset.id}
            onClick={() => {
              setSelectedAsset(asset);
              analyzeAsset(asset.symbol);
            }}
            className={`p-4 rounded-xl border transition-all text-left ${
              selectedAsset?.id === asset.id
                ? 'bg-emerald-500/10 border-emerald-500/50'
                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-white">{asset.symbol}</p>
                <p className="text-xs text-gray-400">{asset.name}</p>
              </div>
              <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-lg">
                {asset.type}
              </span>
            </div>

            {/* Mock price data - in production, fetch from market data API */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">$1,234.56</span>
              <div className="flex items-center gap-1 text-emerald-400">
                <TrendingUp size={14} />
                <span className="text-sm font-medium">+2.34%</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-xs">
              <span className="text-gray-500">Vol: 2.5M</span>
              <span className="text-gray-500">24h High: $1,250</span>
            </div>
          </button>
        ))}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">Nenhum ativo encontrado</p>
        </div>
      )}
    </div>
  );
}
