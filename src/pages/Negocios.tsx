import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import type { Negocio } from '../lib/supabase';
import { useCurrency } from '../context/CurrencyContext';
import { useNotifyAction } from '../lib/notify';

const CATEGORIAS = ['tecnologia', 'varejo', 'serviços', 'alimentação', 'imóveis', 'investimentos', 'freelance', 'outros'];

type Form = { nome: string; descricao: string; categoria: string; receita_mensal: string; despesa_mensal: string; ativo: boolean };

const emptyForm: Form = { nome: '', descricao: '', categoria: 'outros', receita_mensal: '0', despesa_mensal: '0', ativo: true };

export default function Negocios() {
  const { t } = useTranslation();
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const { format } = useCurrency();
  const notify = useNotifyAction();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Negocio | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos');

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetch = async () => {
    const { data, error } = await supabase.from('negocios').select('*').order('created_at', { ascending: false });
    if (!error) setNegocios(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    const ch = supabase
      .channel('negocios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'negocios' }, fetch)
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (n: Negocio) => {
    setEditing(n);
    setForm({ nome: n.nome, descricao: n.descricao ?? '', categoria: n.categoria, receita_mensal: String(n.receita_mensal), despesa_mensal: String(n.despesa_mensal), ativo: n.ativo });
    setShowModal(true);
  };

  const save = async () => {
    setError(null);
    if (!form.nome.trim()) { setError(t('negocios.nomeObrigatorio')); return; }
    setSaving(true);
    const payload = { nome: form.nome.trim(), descricao: form.descricao || null, categoria: form.categoria, receita_mensal: parseFloat(form.receita_mensal) || 0, despesa_mensal: parseFloat(form.despesa_mensal) || 0, ativo: form.ativo };
    const q = editing ? supabase.from('negocios').update(payload).eq('id', editing.id) : supabase.from('negocios').insert(payload);
    const { error } = await q;
    if (error) { setError(error.message); setSaving(false); return; }
    await fetch();
    setShowModal(false);
    setSaving(false);
    await notify('negocio', editing ? 'Negócio atualizado' : 'Novo negócio criado', payload.nome);
  };

  const remove = async (id: string) => {
    if (!confirm(t('negocios.confirmarExcluir'))) return;
    const neg = negocios.find(n => n.id === id);
    await supabase.from('negocios').delete().eq('id', id);
    await fetch();
    if (neg) await notify('negocio', 'Negócio excluído', `${neg.nome} foi removido`);
  };

  const toggleAtivo = async (n: Negocio) => {
    await supabase.from('negocios').update({ ativo: !n.ativo }).eq('id', n.id);
    await fetch();
  };

  const visible = negocios.filter((n) => filter === 'todos' ? true : filter === 'ativo' ? n.ativo : !n.ativo);
  const totalReceita = negocios.filter((n) => n.ativo).reduce((s, n) => s + n.receita_mensal, 0);
  const totalDespesa = negocios.filter((n) => n.ativo).reduce((s, n) => s + n.despesa_mensal, 0);
  const totalLucro = totalReceita - totalDespesa;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('negocios.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('negocios.subtitle')}</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={16} /> {t('negocios.novoNegocio')}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('negocios.receitaTotal'), value: format(totalReceita), color: 'emerald' },
          { label: t('negocios.despesaTotal'), value: format(totalDespesa), color: 'red' },
          { label: t('negocios.lucroLiquido'), value: format(totalLucro), color: totalLucro >= 0 ? 'emerald' : 'red' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400 text-xs mb-1">{label}</p>
            <p className={`text-xl font-bold ${color === 'emerald' ? 'text-emerald-400' : 'text-red-400'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['todos', 'ativo', 'inativo'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-emerald-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-700'}`}>
            {t(`negocios.${f}`)}
          </button>
        ))}
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500 text-sm">{t('negocios.nenhumEncontrado')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((n) => {
            const lucro = n.receita_mensal - n.despesa_mensal;
            const margem = n.receita_mensal > 0 ? ((lucro / n.receita_mensal) * 100).toFixed(1) : '0.0';
            return (
              <div key={n.id} className={`bg-gray-900 border rounded-2xl p-5 transition-all ${n.ativo ? 'border-gray-800' : 'border-gray-800/50 opacity-60'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{n.nome}</p>
                    <span className="inline-block text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full mt-1">{n.categoria}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button onClick={() => openEdit(n)} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => remove(n.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{t('negocios.receita')}</span>
                    <span className="text-emerald-400 font-medium">{format(n.receita_mensal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{t('negocios.despesa')}</span>
                    <span className="text-red-400 font-medium">{format(n.despesa_mensal)}</span>
                  </div>
                  <div className="border-t border-gray-800 pt-2 flex justify-between text-sm">
                    <span className="text-gray-400">{t('negocios.lucro')}</span>
                    <span className={`font-bold ${lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {format(lucro)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {lucro >= 0 ? <TrendingUp size={13} className="text-emerald-400" /> : <TrendingDown size={13} className="text-red-400" />}
                    <span className="text-xs text-gray-500">{t('negocios.margem', { n: margem })}</span>
                  </div>
                  <button onClick={() => toggleAtivo(n)} className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${n.ativo ? 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {n.ativo ? t('negocios.ativo') : t('negocios.inativo')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{editing ? t('negocios.editarTitle') : t('negocios.novoTitle')}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t('negocios.nome')}</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" placeholder={t('negocios.nomePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t('negocios.descricao')}</label>
                <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="input" placeholder={t('negocios.descPlaceholder')} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t('negocios.categoria')}</label>
                <div className="relative">
                  <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="input appearance-none pr-9">
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">{t('negocios.receitaMensal')}</label>
                  <input type="number" value={form.receita_mensal} onChange={(e) => setForm({ ...form, receita_mensal: e.target.value })} className="input" placeholder="0,00" min="0" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">{t('negocios.despesaMensal')}</label>
                  <input type="number" value={form.despesa_mensal} onChange={(e) => setForm({ ...form, despesa_mensal: e.target.value })} className="input" placeholder="0,00" min="0" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setForm({ ...form, ativo: !form.ativo })} className={`w-10 h-6 rounded-full transition-colors relative ${form.ativo ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.ativo ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-400">{t('negocios.negocioAtivo')}</span>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">{t('negocios.cancelar')}</button>
                <button onClick={save} disabled={saving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  {saving ? t('negocios.salvando') : t('negocios.salvar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
