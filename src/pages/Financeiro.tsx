import { useEffect, useRef, useState } from 'react';
import {
  Plus, ArrowUpCircle, ArrowDownCircle, Wallet, ChevronDown,
  X, TrendingUp, AlertTriangle, Pencil, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Transacao } from '../lib/supabase';
import { formatDate } from '../lib/format';
import { useCurrency } from '../context/CurrencyContext';
import { useNotifyAction } from '../lib/notify';

const CATEGORIAS_RECEITA = ['Salário', 'Negócio', 'Investimento', 'Freelance', 'Aluguel', 'Outros'];
const CATEGORIAS_DESPESA = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros'];

type TxForm = { tipo: 'entrada' | 'saida'; categoria: string; valor: string; data_transacao: string };
const emptyForm = (): TxForm => ({ tipo: 'entrada', categoria: '', valor: '', data_transacao: new Date().toISOString().split('T')[0] });

export default function Financeiro() {
  const { format } = useCurrency();
  const notify = useNotifyAction();
  const [movimentos, setMovimentos] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transacao | null>(null);
  const [form, setForm] = useState<TxForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMovimentos = async () => {
    const { data } = await supabase
      .from('transacoes')
      .select('*')
      .is('cofre_id', null)
      .order('data_transacao', { ascending: false });
    setMovimentos(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMovimentos();
    const ch = supabase
      .channel('financeiro-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, fetchMovimentos)
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setShowModal(true);
  };

  const openEdit = (m: Transacao) => {
    setEditing(m);
    setForm({
      tipo: m.tipo,
      categoria: m.categoria.charAt(0).toUpperCase() + m.categoria.slice(1),
      valor: String(m.valor),
      data_transacao: m.data_transacao,
    });
    setError(null);
    setShowModal(true);
  };

  const save = async () => {
    setError(null);
    if (!form.valor || parseFloat(form.valor) <= 0) { setError('Valor deve ser positivo'); return; }
    if (!form.categoria.trim()) { setError('Selecione uma categoria'); return; }
    setSaving(true);

    const payload = {
      tipo: form.tipo,
      valor: parseFloat(form.valor),
      descricao: form.categoria,
      categoria: form.categoria.toLowerCase(),
      data_transacao: form.data_transacao,
    };

    const { error } = editing
      ? await supabase.from('transacoes').update(payload).eq('id', editing.id)
      : await supabase.from('transacoes').insert({ ...payload, cofre_id: null });

    if (error) { setError(error.message); setSaving(false); return; }
    await fetchMovimentos();
    setShowModal(false);
    setSaving(false);
    const acao = editing ? 'atualizado' : 'registrado';
    const tipo = payload.tipo === 'entrada' ? 'Receita' : 'Despesa';
    await notify('transaction', `${tipo} ${acao}`, `${payload.categoria} — ${payload.valor} Kz`);
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este movimento?')) return;
    setDeleting(id);
    const { data: del } = await supabase.from('transacoes').select('categoria,valor').eq('id', id).maybeSingle();
    await supabase.from('transacoes').delete().eq('id', id);
    await fetchMovimentos();
    setDeleting(null);
    if (del) await notify('transaction', 'Movimento excluído', `${del.categoria} — ${del.valor} Kz`);
  };

  const receitas = movimentos.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0);
  const despesas = movimentos.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0);
  const saldo = receitas - despesas;
  const limiteSeguro = receitas * 0.3;
  const saudeFinanceira = receitas > 0 ? Math.min(100, Math.round((saldo / receitas) * 100)) : 0;

  const topCats = Object.entries(
    movimentos
      .filter((m) => m.tipo === 'saida')
      .reduce<Record<string, number>>((acc, m) => {
        acc[m.categoria] = (acc[m.categoria] ?? 0) + m.valor;
        return acc;
      }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = Math.max(...topCats.map(([, v]) => v), 1);

  const healthColor = saudeFinanceira >= 60 ? 'emerald' : saudeFinanceira >= 30 ? 'amber' : 'red';

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Controle Financeiro</h1>
          <p className="text-gray-400 text-sm mt-0.5">Receitas, despesas e saúde financeira</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} /> Novo Movimento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-emerald-400" />
            <p className="text-gray-400 text-xs">Saldo Atual</p>
          </div>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-white' : 'text-red-400'}`}>{format(saldo)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle size={16} className="text-emerald-400" />
            <p className="text-gray-400 text-xs">Total Receitas</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{format(receitas)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle size={16} className="text-red-400" />
            <p className="text-gray-400 text-xs">Total Despesas</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{format(despesas)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-emerald-400" />
            <h2 className="font-semibold text-white">Análise Automática</h2>
          </div>
          <div className="mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Saúde Financeira</span>
              <span className={`font-bold text-${healthColor}-400`}>{saudeFinanceira}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 bg-${healthColor}-500`}
                style={{ width: `${saudeFinanceira}%` }}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <p className="text-sm text-gray-300">Pode gastar com segurança</p>
              <span className="text-emerald-400 font-bold text-sm">{format(limiteSeguro)}</span>
            </div>
            <div className={`flex items-start gap-2 p-3 rounded-xl ${despesas > receitas * 0.7 ? 'bg-red-950/40 border border-red-900/40' : 'bg-emerald-950/40 border border-emerald-900/40'}`}>
              <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${despesas > receitas * 0.7 ? 'text-red-400' : 'text-emerald-400'}`} />
              <p className={`text-xs leading-relaxed ${despesas > receitas * 0.7 ? 'text-red-300' : 'text-emerald-300'}`}>
                {despesas > receitas * 0.7
                  ? 'Atenção: suas despesas estão acima de 70% da receita. Reduza gastos.'
                  : 'Ótimo! Seus gastos estão dentro do limite recomendado. Guarde 30% da renda.'}
              </p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-5">Despesas por Categoria</h2>
          {topCats.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Nenhuma despesa registrada</p>
          ) : (
            <div className="space-y-3">
              {topCats.map(([cat, valor]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-300 capitalize">{cat}</span>
                    <span className="text-red-400 font-medium">{format(valor)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${(valor / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">
          Histórico de Movimentos
          <span className="text-gray-500 font-normal text-sm ml-2">({movimentos.length})</span>
        </h2>

        {movimentos.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 text-sm mb-3">Nenhum movimento registrado</p>
            <button onClick={openNew} className="text-xs text-emerald-400 border border-emerald-900/50 px-3 py-1.5 rounded-lg hover:border-emerald-800 transition-colors">
              Adicionar primeiro movimento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {movimentos.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3 group">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${m.tipo === 'entrada' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                  {m.tipo === 'entrada' ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium capitalize">{m.categoria}</p>
                  <p className="text-gray-500 text-xs">{formatDate(m.data_transacao)}</p>
                </div>
                <strong className={`text-sm font-bold mr-2 ${m.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {m.tipo === 'entrada' ? '+' : '-'}{format(m.valor)}
                </strong>
                {/* Actions — visible on hover */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => openEdit(m)}
                    className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    disabled={deleting === m.id}
                    className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{editing ? 'Editar Movimento' : 'Novo Movimento'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['entrada', 'saida'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, tipo: t, categoria: '' })}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${form.tipo === t ? (t === 'entrada' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                      {t === 'entrada' ? 'Receita' : 'Despesa'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Categoria</label>
                <div className="relative">
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="input appearance-none pr-9"
                  >
                    <option value="">Selecionar...</option>
                    {(form.tipo === 'entrada' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Valor (na moeda base)</label>
                <input
                  type="number"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="input"
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Data</label>
                <input
                  type="date"
                  value={form.data_transacao}
                  onChange={(e) => setForm({ ...form, data_transacao: e.target.value })}
                  className="input"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">Cancelar</button>
                <button onClick={save} disabled={saving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
