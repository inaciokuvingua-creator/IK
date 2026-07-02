import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PatrimonioItem } from '../lib/supabase';
import { formatDate, formatPercent } from '../lib/format';
import { useCurrency } from '../context/CurrencyContext';
import { useNotifyAction } from '../lib/notify';

const CATEGORIAS = ['imóvel', 'veículo', 'investimento', 'equipamento', 'cripto', 'arte', 'outros'];

type Form = { nome: string; categoria: string; valor_aquisicao: string; valor_atual: string; data_aquisicao: string; descricao: string };
const emptyForm: Form = { nome: '', categoria: 'outros', valor_aquisicao: '0', valor_atual: '0', data_aquisicao: '', descricao: '' };

export default function Patrimonio() {
  const [items, setItems] = useState<PatrimonioItem[]>([]);
  const { format } = useCurrency();
  const notify = useNotifyAction();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PatrimonioItem | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('todos');

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetch = async () => {
    const { data, error } = await supabase.from('patrimonio').select('*').order('created_at', { ascending: false });
    if (!error) setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    const ch = supabase
      .channel('patrimonio-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrimonio' }, fetch)
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (item: PatrimonioItem) => {
    setEditing(item);
    setForm({ nome: item.nome, categoria: item.categoria, valor_aquisicao: String(item.valor_aquisicao), valor_atual: String(item.valor_atual), data_aquisicao: item.data_aquisicao ?? '', descricao: item.descricao ?? '' });
    setShowModal(true);
  };

  const save = async () => {
    setError(null);
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return; }
    setSaving(true);
    const payload = { nome: form.nome.trim(), categoria: form.categoria, valor_aquisicao: parseFloat(form.valor_aquisicao) || 0, valor_atual: parseFloat(form.valor_atual) || 0, data_aquisicao: form.data_aquisicao || null, descricao: form.descricao || null };
    const q = editing ? supabase.from('patrimonio').update(payload).eq('id', editing.id) : supabase.from('patrimonio').insert(payload);
    const { error } = await q;
    if (error) { setError(error.message); setSaving(false); return; }
    await fetch();
    setShowModal(false);
    setSaving(false);
    await notify('patrimonio', editing ? 'Ativo atualizado' : 'Novo ativo registrado', payload.nome);
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este ativo?')) return;
    const item = items.find(i => i.id === id);
    await supabase.from('patrimonio').delete().eq('id', id);
    await fetch();
    if (item) await notify('patrimonio', 'Ativo excluído', `${item.nome} foi removido do patrimônio`);
  };

  const allCats = ['todos', ...Array.from(new Set(items.map((i) => i.categoria)))];
  const visible = filterCat === 'todos' ? items : items.filter((i) => i.categoria === filterCat);

  const totalAquisicao = items.reduce((s, i) => s + i.valor_aquisicao, 0);
  const totalAtual = items.reduce((s, i) => s + i.valor_atual, 0);
  const variacaoTotal = totalAquisicao > 0 ? ((totalAtual - totalAquisicao) / totalAquisicao) * 100 : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Patrimônio</h1>
          <p className="text-gray-400 text-sm mt-0.5">Seus ativos e investimentos</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={16} /> Novo Ativo
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs mb-1">Valor de Aquisição</p>
          <p className="text-xl font-bold text-white">{format(totalAquisicao)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs mb-1">Valor Atual</p>
          <p className="text-xl font-bold text-white">{format(totalAtual)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs mb-1">Variação Total</p>
          <div className="flex items-center gap-1.5">
            {variacaoTotal >= 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-red-400" />}
            <p className={`text-xl font-bold ${variacaoTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPercent(variacaoTotal)}</p>
          </div>
          <p className={`text-sm font-medium mt-0.5 ${totalAtual - totalAquisicao >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
            {totalAtual - totalAquisicao >= 0 ? '+' : ''}{format(totalAtual - totalAquisicao)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {allCats.map((c) => (
          <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCat === c ? 'bg-emerald-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-700'}`}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhum ativo encontrado</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3.5">Ativo</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3.5 hidden sm:table-cell">Categoria</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-4 py-3.5">Aquisição</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-4 py-3.5">Atual</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-4 py-3.5 hidden md:table-cell">Variação</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3.5 hidden lg:table-cell">Aquisição em</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {visible.map((item) => {
                  const variacao = item.valor_aquisicao > 0 ? ((item.valor_atual - item.valor_aquisicao) / item.valor_aquisicao) * 100 : 0;
                  return (
                    <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-white text-sm font-medium">{item.nome}</p>
                        {item.descricao && <p className="text-gray-500 text-xs">{item.descricao}</p>}
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{item.categoria}</span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-300">{format(item.valor_aquisicao)}</td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-white">{format(item.valor_atual)}</td>
                      <td className="px-4 py-4 text-right hidden md:table-cell">
                        <span className={`text-sm font-medium flex items-center justify-end gap-1 ${variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {variacao >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {formatPercent(variacao)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-gray-500 hidden lg:table-cell">
                        {item.data_aquisicao ? formatDate(item.data_aquisicao) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => remove(item.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-700 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{editing ? 'Editar Ativo' : 'Novo Ativo'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nome</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" placeholder="Ex: Apartamento centro" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Categoria</label>
                <div className="relative">
                  <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="input appearance-none pr-9">
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Valor de aquisição</label>
                  <input type="number" value={form.valor_aquisicao} onChange={(e) => setForm({ ...form, valor_aquisicao: e.target.value })} className="input" min="0" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Valor atual</label>
                  <input type="number" value={form.valor_atual} onChange={(e) => setForm({ ...form, valor_atual: e.target.value })} className="input" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Data de aquisição (opcional)</label>
                <input type="date" value={form.data_aquisicao} onChange={(e) => setForm({ ...form, data_aquisicao: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Descrição (opcional)</label>
                <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="input" placeholder="Detalhes adicionais" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">Cancelar</button>
                <button onClick={save} disabled={saving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
