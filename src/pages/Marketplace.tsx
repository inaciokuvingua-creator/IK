import { useEffect, useState } from 'react';
import {
  ShoppingBag, Search, Star, CheckCircle, Filter,
  Package, Download, MapPin, Tag, TrendingUp, Grid3X3, List
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCurrency } from '../context/CurrencyContext';

type Product = {
  id: string; store_id: string; owner_id: string; nome: string; descricao: string | null;
  preco: number; moeda: string; tipo: 'digital' | 'physical'; categoria: string;
  imagem_url: string | null; ativo: boolean; destaque: boolean; total_vendas: number; created_at: string;
  stores?: { nome: string; slug: string; verified: boolean; };
};

const CATS = ['todos','música','beats','cursos','livros','templates','arquivos','produtos','outros'];
const TIPOS = ['todos','digital','physical'];

export default function Marketplace() {
  const { format } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [view, setView] = useState<'grid'|'list'>('grid');
  const [selected, setSelected] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('products').select('*, stores(nome, slug, verified)').eq('ativo', true).order('destaque', { ascending: false }).order('total_vendas', { ascending: false }).limit(60);
    if (cat !== 'todos') q = q.eq('categoria', cat);
    if (tipo !== 'todos') q = q.eq('tipo', tipo);
    if (search) q = q.ilike('nome', `%${search}%`);
    const { data } = await q;
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [cat, tipo]);

  const handleSearch = () => load();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag size={22} className="text-emerald-400" /> Marketplace
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Descubra produtos digitais e físicos de criadores e lojas</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition-colors ${view==='grid' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><Grid3X3 size={15} /></button>
          <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-colors ${view==='list' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><List size={15} /></button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar produtos..."
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl py-2.5 pl-10 pr-4 text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors" />
        </div>
        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
          <option value="todos">Todos os tipos</option>
          <option value="digital">Digital</option>
          <option value="physical">Físico</option>
        </select>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${cat === c ? 'bg-emerald-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'}`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} animate-pulse`}>
          {[...Array(8)].map((_, i) => <div key={i} className="h-52 bg-gray-900 rounded-2xl border border-gray-800" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
          <Package size={36} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum produto encontrado</p>
          <p className="text-gray-600 text-sm mt-1">Tente outros filtros ou seja o primeiro a vender aqui!</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {products.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              className={`text-left bg-gray-900 border border-gray-800 hover:border-emerald-700 rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:shadow-emerald-900/10 group ${view === 'list' ? 'flex items-center gap-4 p-4' : ''}`}>
              {view === 'grid' ? (
                <>
                  <div className="h-36 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
                    {p.imagem_url ? (
                      <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-700">
                        {p.tipo === 'digital' ? <Download size={28} /> : <Package size={28} />}
                      </div>
                    )}
                    {p.destaque && <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Em destaque</div>}
                    <div className="absolute bottom-2 left-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.tipo === 'digital' ? 'bg-blue-950 text-blue-400' : 'bg-orange-950 text-orange-400'}`}>
                        {p.tipo === 'digital' ? 'Digital' : 'Físico'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-white font-semibold text-sm leading-tight mb-1 line-clamp-2">{p.nome}</p>
                    {p.stores && (
                      <div className="flex items-center gap-1 mb-2">
                        <p className="text-gray-500 text-xs">{p.stores.nome}</p>
                        {p.stores.verified && <CheckCircle size={10} className="text-blue-400" />}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold text-sm">{format(p.preco)}</span>
                      <span className="text-gray-600 text-xs flex items-center gap-1"><TrendingUp size={10} />{p.total_vendas}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                    {p.tipo === 'digital' ? <Download size={20} className="text-blue-400" /> : <Package size={20} className="text-orange-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{p.nome}</p>
                        {p.stores && <p className="text-gray-500 text-xs flex items-center gap-1">{p.stores.nome}{p.stores.verified && <CheckCircle size={10} className="text-blue-400" />}</p>}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-emerald-400 font-bold text-sm">{format(p.preco)}</p>
                        <p className="text-gray-600 text-xs">{p.total_vendas} vendas</p>
                      </div>
                    </div>
                    {p.descricao && <p className="text-gray-500 text-xs mt-1 line-clamp-1">{p.descricao}</p>}
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Product detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
              {selected.imagem_url ? (
                <img src={selected.imagem_url} alt={selected.nome} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-600">
                  {selected.tipo === 'digital' ? <Download size={40} /> : <Package size={40} />}
                </div>
              )}
              <button onClick={() => setSelected(null)} className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-xl flex items-center justify-center text-white hover:bg-black/70 transition-colors">✕</button>
              {selected.destaque && <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">Em destaque</div>}
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight">{selected.nome}</h3>
                  {selected.stores && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-gray-400 text-sm">por {selected.stores.nome}</p>
                      {selected.stores.verified && <CheckCircle size={13} className="text-blue-400" />}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-emerald-400">{format(selected.preco)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{selected.moeda}</p>
                </div>
              </div>
              {selected.descricao && <p className="text-gray-400 text-sm leading-relaxed mb-4">{selected.descricao}</p>}
              <div className="flex flex-wrap gap-2 mb-5">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${selected.tipo === 'digital' ? 'bg-blue-950 text-blue-400' : 'bg-orange-950 text-orange-400'}`}>
                  {selected.tipo === 'digital' ? 'Produto Digital' : 'Produto Físico'}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 capitalize">{selected.categoria}</span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 flex items-center gap-1">
                  <TrendingUp size={10} /> {selected.total_vendas} vendas
                </span>
              </div>
              <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors">
                {selected.tipo === 'digital' ? 'Comprar & Baixar' : 'Comprar Produto'}
              </button>
              <p className="text-gray-600 text-xs text-center mt-3">Pagamentos internacionais · 95% para o vendedor · 5% IK Finance</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
