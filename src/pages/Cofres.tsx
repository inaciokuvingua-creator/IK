import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, X, ArrowUpRight, ArrowDownRight, ChevronDown, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Cofre, Transacao } from '../lib/supabase';
import { formatDate } from '../lib/format';
import { useCurrency } from '../context/CurrencyContext';
import { useNotifyAction } from '../lib/notify';
import { supabase as sb } from '../lib/supabase';
import type { GoalItem } from '../lib/supabase';
import { computeQuoteTotal } from '../lib/costEngine';
import { computeSimulationForCofre } from '../lib/costEngine';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const TX_CATS = ['alimentação', 'moradia', 'transporte', 'saúde', 'educação', 'lazer', 'investimento', 'salário', 'negócio', 'outros'];

type CofreForm = { nome: string; descricao: string; saldo: string; cor: string; meta: string };
type TxForm = { tipo: 'entrada' | 'saida'; valor: string; descricao: string; categoria: string; data_transacao: string };

function emptyTxForm(): TxForm {
  return { tipo: 'entrada', valor: '0', descricao: '', categoria: TX_CATS[0], data_transacao: new Date().toISOString().slice(0, 10) };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function Cofres() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const notify = useNotifyAction();
  const [cofres, setCofres] = useState<Cofre[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [selected, setSelected] = useState<Cofre | null>(null);
  const [loading, setLoading] = useState(true);

  const [cofreForm, setCofreForm] = useState<CofreForm>({ nome: '', descricao: '', saldo: '0', cor: COLORS[0], meta: '' });
  const [showCofreModal, setShowCofreModal] = useState(false);
  const [editingCofre, setEditingCofre] = useState<Cofre | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transacao | null>(null);
  const [txForm, setTxForm] = useState<TxForm>(emptyTxForm());

  const [saving, setSaving] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GoalItem | null>(null);
  const [itemForm, setItemForm] = useState<{ nome: string; categoria: string; descricao: string; quantidade: string; preco_unitario: string; moeda: string }>({ nome: '', categoria: '', descricao: '', quantidade: '1', preco_unitario: '0', moeda: 'KZ' });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchAll = async () => {
    try {
      const [c, tx] = await withTimeout(
        Promise.all([
          supabase.from('cofres').select('*').order('created_at', { ascending: false }),
          supabase.from('transacoes').select('*').not('cofre_id', 'is', null).order('data_transacao', { ascending: false }),
        ]),
        12000,
        'Tempo esgotado ao carregar cofres.',
      );
      if (c.error) throw c.error;
      if (tx.error) throw tx.error;
      setCofres((c.data ?? []).map((item) => ({
        ...item,
        nome: item.nome ?? 'Cofre',
        descricao: item.descricao ?? null,
        saldo: Number(item.saldo ?? 0),
        cor: item.cor ?? COLORS[0],
        meta: item.meta == null ? null : Number(item.meta),
      })) as Cofre[]);
      setTransacoes((tx.data ?? []).map((item) => ({
        ...item,
        valor: Number(item.valor ?? 0),
        descricao: item.descricao ?? 'Transação',
        categoria: item.categoria ?? 'outros',
        data_transacao: item.data_transacao ?? new Date().toISOString().slice(0, 10),
      })) as Transacao[]);
      setError(null);
    } catch (err) {
      console.error('fetch cofres', err);
      setError('Nao foi possivel carregar os cofres agora.');
      setCofres([]);
      setTransacoes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel('cofres-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cofres' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, fetchAll)
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, []);

    const openNewItem = () => {
        setEditingItem(null);
        setItemForm({ nome: '', categoria: '', descricao: '', quantidade: '1', preco_unitario: '0', moeda: 'KZ' });
        setShowItemModal(true);
    };

    const saveItem = async () => {
        if (!selected) return;
        setSaving(true);
        const payload = {
            cofre_id: selected.id,
            nome: itemForm.nome,
            categoria: itemForm.categoria || null,
            descricao: itemForm.descricao || null,
            quantidade: Number(itemForm.quantidade || 1),
            preco_unitario: Number(itemForm.preco_unitario || 0),
            moeda: itemForm.moeda || 'KZ'
        };
        try {
            const { data, error } = await sb.from('goal_items').insert([payload]).select().maybeSingle();
            if (error) throw error;
            if (data) setGoalItems((g) => [data as GoalItem].concat(g));
            setShowItemModal(false);
        } catch (err) {
            console.error(err);
            await notify('cofre', 'Erro ao salvar item', 'Nao foi possivel guardar o item do objetivo.');
        } finally { setSaving(false); }
    };

  // Keep selected in sync after re-fetch
  useEffect(() => {
    if (selected) {
      const updated = cofres.find((c) => c.id === selected.id);
      if (updated) setSelected(updated);
      else setSelected(null);
    }
  }, [cofres, selected]);

  useEffect(() => {
    if (!selected && cofres.length > 0) {
      setSelected(cofres[0]);
    }
  }, [cofres, selected]);

  // ── Cofre CRUD ─────────────────────────────────────────────────────────────
  const openNewCofre = () => {
    setEditingCofre(null);
    setCofreForm({ nome: '', descricao: '', saldo: '0', cor: COLORS[0], meta: '' });
    setError(null);
    setShowCofreModal(true);
  };

  const openEditCofre = (c: Cofre) => {
    setEditingCofre(c);
    setCofreForm({ nome: c.nome, descricao: c.descricao ?? '', saldo: String(c.saldo), cor: c.cor, meta: c.meta ? String(c.meta) : '' });
    setError(null);
    setShowCofreModal(true);
  };

  const saveCofre = async () => {
    setError(null);
    if (!cofreForm.nome.trim()) { setError('Nome é obrigatório'); return; }
    setSaving(true);
    const payload = {
      nome: cofreForm.nome.trim(),
      descricao: cofreForm.descricao || null,
      cor: cofreForm.cor,
      meta: cofreForm.meta ? parseFloat(cofreForm.meta) : null,
      ...(!editingCofre && { saldo: parseFloat(cofreForm.saldo) || 0 }),
    };
    const { error } = editingCofre
      ? await supabase.from('cofres').update(payload).eq('id', editingCofre.id)
      : await supabase.from('cofres').insert(payload);
    if (error) { setError(error.message); setSaving(false); return; }
    await fetchAll();
    setShowCofreModal(false);
    setSaving(false);
    await notify('cofre', editingCofre ? 'Cofre atualizado' : 'Novo cofre criado', payload.nome);
  };

  const deleteCofre = async (id: string) => {
    if (!confirm(t('cofres.confirmarCofre'))) return;
    await supabase.from('transacoes').update({ cofre_id: null }).eq('cofre_id', id);
    await supabase.from('cofres').delete().eq('id', id);
    if (selected?.id === id) setSelected(null);
    await fetchAll();
    await notify('cofre', 'Cofre excluído', 'O cofre foi removido com sucesso');
  };

  // ── Transação CRUD ──────────────────────────────────────────────────────────
  const openNewTx = () => {
    setEditingTx(null);
    setTxForm(emptyTxForm());
    setError(null);
    setShowTxModal(true);
  };

  const openEditTx = (tx: Transacao) => {
    setEditingTx(tx);
    setTxForm({ tipo: tx.tipo, valor: String(tx.valor), descricao: tx.descricao, categoria: tx.categoria, data_transacao: tx.data_transacao });
    setError(null);
    setShowTxModal(true);
  };

  const saveTx = async () => {
    setError(null);
    if (!txForm.valor || parseFloat(txForm.valor) <= 0) { setError('Valor deve ser positivo'); return; }
    if (!txForm.descricao.trim()) { setError('Descrição é obrigatória'); return; }
    if (!selected) return;
    setSaving(true);

    const novoValor = parseFloat(txForm.valor);
    const payload = { tipo: txForm.tipo, valor: novoValor, descricao: txForm.descricao.trim(), categoria: txForm.categoria, data_transacao: txForm.data_transacao };

    if (editingTx) {
      // Recalculate saldo: revert old tx, apply new tx
      const saldoSemAntiga = editingTx.tipo === 'entrada'
        ? selected.saldo - editingTx.valor
        : selected.saldo + editingTx.valor;
      const novoSaldo = txForm.tipo === 'entrada' ? saldoSemAntiga + novoValor : saldoSemAntiga - novoValor;

      const { error } = await supabase.from('transacoes').update(payload).eq('id', editingTx.id);
      if (error) { setError(error.message); setSaving(false); return; }
      await supabase.from('cofres').update({ saldo: novoSaldo }).eq('id', selected.id);
    } else {
      const { error } = await supabase.from('transacoes').insert({ ...payload, cofre_id: selected.id });
      if (error) { setError(error.message); setSaving(false); return; }
      const novoSaldo = txForm.tipo === 'entrada' ? selected.saldo + novoValor : selected.saldo - novoValor;
      await supabase.from('cofres').update({ saldo: novoSaldo }).eq('id', selected.id);
    }

    await fetchAll();
    setShowTxModal(false);
    setTxForm(emptyTxForm());
    setSaving(false);
    const acao = editingTx ? 'atualizada' : 'registrada';
    await notify('cofre', `Transação ${acao}`, `${payload.descricao} — ${novoValor} Kz no cofre ${selected.nome}`);
  };

  const deleteTx = async (tx: Transacao) => {
    if (!selected) return;
    if (!confirm(t('cofres.confirmarTx'))) return;
    setDeleting(tx.id);
    const novoSaldo = tx.tipo === 'entrada' ? selected.saldo - tx.valor : selected.saldo + tx.valor;
    await supabase.from('transacoes').delete().eq('id', tx.id);
    await supabase.from('cofres').update({ saldo: novoSaldo }).eq('id', selected.id);
    await fetchAll();
    setDeleting(null);
    await notify('cofre', 'Transação excluída', `${tx.descricao} removida do cofre ${selected.nome}`);
  };

  const cofreTx = selected ? transacoes.filter((tx) => tx.cofre_id === selected.id) : [];

  // Goal items
  const [goalItems, setGoalItems] = useState<GoalItem[]>([]);
  const fetchGoalItems = async (cofreId?: string | null) => {
    if (!cofreId) { setGoalItems([]); return; }
    const { data } = await sb.from('goal_items').select('*').eq('cofre_id', cofreId).order('created_at', { ascending: false });
    setGoalItems(data as GoalItem[] ?? []);
  };

  useEffect(() => { if (selected) fetchGoalItems(selected.id); else setGoalItems([]); }, [selected]);
  useEffect(() => { if (selected) { (async () => { try { const r = await computeSimulationForCofre(selected.id, 'KZ'); setSimResult(r); } catch (e) { console.error(e); } })(); } else setSimResult(null); }, [selected]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const fetchAlerts = async (cofreId?: string | null) => {
    if (!cofreId) { setAlerts([]); return; }
    const { data } = await sb.from('alerts').select('*').eq('cofre_id', cofreId).order('created_at', { ascending: false });
    setAlerts(data || []);
  };
  useEffect(() => { if (selected) fetchAlerts(selected.id); else setAlerts([]); }, [selected]);

  const markAlertRead = async (id: string) => {
    try {
      await sb.from('alerts').update({ lida: true }).eq('id', id);
      await fetchAlerts(selected?.id);
    } catch (e) { console.error(e); }
  };

  const markAllAlertsRead = async () => {
    if (!selected) return;
    try {
      await sb.from('alerts').update({ lida: true }).eq('cofre_id', selected.id);
      await fetchAlerts(selected.id);
    } catch (e) { console.error(e); }
  };

  const [showQuotesModal, setShowQuotesModal] = useState(false);
  const [currentQuotes, setCurrentQuotes] = useState<any[]>([]);
  const [quoteItem, setQuoteItem] = useState<GoalItem | null>(null);
  const [quoteForm, setQuoteForm] = useState<{ fornecedor: string; preco_unitario: string; moeda: string; frete: string; seguro: string; iva_percent: string; outras: string }>(
    { fornecedor: '', preco_unitario: '0', moeda: 'KZ', frete: '{}', seguro: '0', iva_percent: '0', outras: '[]' }
  );

  const openQuotes = async (item: GoalItem) => {
    setQuoteItem(item);
    setShowQuotesModal(true);
    // fetch quotes + totals
    try {
      const res = await sb.from('goal_item_quotes').select('*').eq('item_id', item.id);
      const quotes = res.data || [];
      const enhanced = [] as any[];
      for (const q of quotes) {
        const totals = await computeQuoteTotal(q, item.quantidade || 1, 'KZ');
        enhanced.push({ quote: q, totals });
      }
      enhanced.sort((a, b) => (a.totals.total || 0) - (b.totals.total || 0));
      setCurrentQuotes(enhanced);
    } catch (e) { console.error(e); setCurrentQuotes([]); }
  };

  const addQuote = async () => {
    if (!quoteItem) return;
    setSaving(true);
    try {
      const payload = {
        item_id: quoteItem.id,
        fornecedor: quoteForm.fornecedor || null,
        preco_unitario: Number(quoteForm.preco_unitario || 0),
        moeda: quoteForm.moeda || 'KZ',
        frete: JSON.parse(quoteForm.frete || '{}'),
        seguro: Number(quoteForm.seguro || 0),
        seguro_moeda: quoteForm.moeda || 'KZ',
        iva_percent: Number(quoteForm.iva_percent || 0),
        taxas_alfandega: [],
        outras_despesas: JSON.parse(quoteForm.outras || '[]')
      };
      const { error } = await sb.from('goal_item_quotes').insert([payload]).select().maybeSingle();
      if (error) throw error;
      // recompute list
      await openQuotes(quoteItem);
      setQuoteForm({ fornecedor: '', preco_unitario: '0', moeda: 'KZ', frete: '{}', seguro: '0', iva_percent: '0', outras: '[]' });
    } catch (err) { console.error(err); await notify('cofre', 'Erro ao salvar cotacao', 'Nao foi possivel guardar a cotacao do objetivo.'); }
    finally { setSaving(false); }
  };

  const [showSimModal, setShowSimModal] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);

  const runSimulation = async () => {
    if (!selected) return;
    setSimLoading(true);
    try {
      const res = await computeSimulationForCofre(selected.id, 'KZ');
      setSimResult(res);
      setShowSimModal(true);
      // create alert if needed
      try { await (await import('../lib/costEngine')).createSimulationAlertIfNeeded(res); } catch (e) { console.error('alert create failed', e); }
    } catch (e) { console.error(e); await notify('cofre', 'Erro ao simular', 'Nao foi possivel executar a simulacao do cofre.'); }
    finally { setSimLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 anim-page">
      {error && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('cofres.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('cofres.subtitle')}</p>
        </div>
        <button onClick={openNewCofre} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors btn-liquid btn-ripple">
          <Plus size={16} /> {t('cofres.novoCofre')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cofre list */}
        <div className="space-y-3">
          {cofres.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <p className="text-gray-500 text-sm">{t('cofres.nenhumCofre')}</p>
            </div>
          )}
          {cofres.map((c) => {
            const progresso = c.meta && c.meta > 0 ? Math.min(100, Math.round((c.saldo / c.meta) * 100)) : null;
            return (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={`bg-gray-900 border rounded-2xl p-5 cursor-pointer transition-all ${selected?.id === c.id ? 'border-emerald-600 shadow-lg shadow-emerald-900/20' : 'border-gray-800 hover:border-gray-700'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: c.cor + '22' }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.cor }} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{c.nome}</p>
                      {c.descricao && <p className="text-gray-500 text-xs">{c.descricao}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEditCofre(c)} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => deleteCofre(c.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>

                <p className="text-2xl font-bold text-white mt-3">{format(c.saldo)}</p>

                {c.meta && c.meta > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500 flex items-center gap-1"><Target size={11} /> {t('cofres.meta', { val: format(c.meta) })}</span>
                      <span className="font-medium" style={{ color: c.cor }}>{progresso}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progresso}%`, backgroundColor: c.cor }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <p className="text-gray-500">{t('cofres.selecionar')}</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-white font-semibold">{selected.nome}</h2>
                  <p className="text-gray-500 text-xs">{t('cofres.txCount', { n: cofreTx.length, val: format(selected.saldo) })}</p>
                </div>
                  <div className="flex gap-2">
                    <button onClick={openNewTx} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
                      <Plus size={15} /> {t('cofres.addTx')}
                    </button>
                    <button onClick={runSimulation} className="flex items-center gap-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors" disabled={simLoading}>
                      🔎 {simLoading ? 'Simulando...' : 'Simular'}
                    </button>
                  </div>
              </div>

              <div className="grid xl:grid-cols-2 gap-4 mb-5">
                <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Itens da meta</h3>
                    <button onClick={openNewItem} className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200">
                      + Novo item
                    </button>
                  </div>
                  {goalItems.length === 0 ? (
                    <p className="text-gray-500 text-xs">Nenhum item cadastrado para esta meta.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-48 overflow-auto pr-1">
                      {goalItems.map((item) => {
                        const total = (item.quantidade || 0) * (item.preco_unitario || 0);
                        return (
                          <div key={item.id} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm text-white font-medium">{item.nome}</p>
                                <p className="text-xs text-gray-500">{item.categoria || 'Sem categoria'}</p>
                              </div>
                              <button onClick={() => openQuotes(item)} className="text-xs px-2 py-1 rounded-lg bg-amber-900/50 hover:bg-amber-900 text-amber-200">
                                Cotações
                              </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              {item.quantidade} x {format(item.preco_unitario || 0)} ({item.moeda || 'KZ'}) · Total {format(total)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Alertas do cofre</h3>
                    <button
                      onClick={markAllAlertsRead}
                      disabled={alerts.length === 0}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-xs text-gray-200"
                    >
                      Marcar todas lidas
                    </button>
                  </div>
                  {alerts.length === 0 ? (
                    <p className="text-gray-500 text-xs">Sem alertas para este cofre.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-48 overflow-auto pr-1">
                      {alerts.map((alert) => (
                        <div key={alert.id} className={`rounded-xl border p-3 ${alert.lida ? 'border-gray-800 bg-gray-900/60' : 'border-amber-800/70 bg-amber-950/20'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm text-white font-medium">{alert.titulo || 'Alerta'}</p>
                              <p className="text-xs text-gray-400 mt-1">{alert.corpo || 'Sem detalhes.'}</p>
                            </div>
                            {!alert.lida && (
                              <button onClick={() => markAlertRead(alert.id)} className="text-xs px-2 py-1 rounded-lg bg-emerald-900/40 hover:bg-emerald-900 text-emerald-200">
                                Marcar lida
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {cofreTx.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 text-sm">{t('cofres.nenhumaTx')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800/40">
                  {cofreTx.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 py-3 group">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tx.tipo === 'entrada' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                        {tx.tipo === 'entrada' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{tx.descricao}</p>
                        <p className="text-gray-500 text-xs">{formatDate(tx.data_transacao || tx.created_at)} · {tx.categoria}</p>
                      </div>
                      <span className={`text-sm font-semibold mr-2 shrink-0 ${tx.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.tipo === 'entrada' ? '+' : '-'}{format(tx.valor)}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => openEditTx(tx)} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-700 transition-colors" title={t('cofres.editar')}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteTx(tx)} disabled={deleting === tx.id} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50" title={t('cofres.excluir')}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cofre Modal */}
      {showCofreModal && (
        <Modal title={editingCofre ? t('cofres.editarCofre') : t('cofres.novoCofre2')} onClose={() => setShowCofreModal(false)}>
          <div className="space-y-4">
            <Field label={t('cofres.nome')}>
              <input value={cofreForm.nome} onChange={(e) => setCofreForm({ ...cofreForm, nome: e.target.value })} className="input" placeholder={t('cofres.nomePlaceholder')} />
            </Field>
            <Field label={t('cofres.descricao')}>
              <input value={cofreForm.descricao} onChange={(e) => setCofreForm({ ...cofreForm, descricao: e.target.value })} className="input" placeholder={t('cofres.descPlaceholder')} />
            </Field>
            {!editingCofre && (
              <Field label={t('cofres.saldoInicial')}>
                <input type="number" value={cofreForm.saldo} onChange={(e) => setCofreForm({ ...cofreForm, saldo: e.target.value })} className="input" placeholder="0" />
              </Field>
            )}
            <Field label={t('cofres.saldoMeta')}>
              <input type="number" value={cofreForm.meta} onChange={(e) => setCofreForm({ ...cofreForm, meta: e.target.value })} className="input" placeholder={t('cofres.metaPlaceholder')} />
            </Field>
            <Field label={t('cofres.cor')}>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setCofreForm({ ...cofreForm, cor: c })} className={`w-8 h-8 rounded-full transition-transform ${cofreForm.cor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-gray-900' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </Field>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCofreModal(false)} className="flex-1 border border-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">{t('cofres.cancelar')}</button>
              <button onClick={saveCofre} disabled={saving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {saving ? t('cofres.salvando') : t('cofres.salvar')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Transaction Modal */}
      {showTxModal && (
        <Modal title={editingTx ? t('cofres.editarTx') : t('cofres.novaTx')} onClose={() => setShowTxModal(false)}>
          <div className="space-y-4">
            <Field label={t('cofres.tipoTx')}>
              <div className="grid grid-cols-2 gap-2">
                {(['entrada', 'saida'] as const).map((tp) => (
                  <button key={tp} onClick={() => setTxForm({ ...txForm, tipo: tp })} className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${txForm.tipo === tp ? (tp === 'entrada' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {tp === 'entrada' ? t('cofres.entrada') : t('cofres.saida')}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('cofres.valorTx')}>
              <input type="number" value={txForm.valor} onChange={(e) => setTxForm({ ...txForm, valor: e.target.value })} className="input" placeholder="0" min="0" step="1" />
            </Field>
            <Field label={t('cofres.descTx')}>
              <input value={txForm.descricao} onChange={(e) => setTxForm({ ...txForm, descricao: e.target.value })} className="input" placeholder={t('cofres.descTxPlaceholder')} />
            </Field>
            <Field label={t('cofres.catTx')}>
              <div className="relative">
                <select value={txForm.categoria} onChange={(e) => setTxForm({ ...txForm, categoria: e.target.value })} className="input appearance-none pr-9">
                  {TX_CATS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </Field>
            <Field label={t('cofres.dataTx')}>
              <input type="date" value={txForm.data_transacao} onChange={(e) => setTxForm({ ...txForm, data_transacao: e.target.value })} className="input" />
            </Field>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowTxModal(false)} className="flex-1 border border-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">{t('cofres.cancelar')}</button>
              <button onClick={saveTx} disabled={saving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {saving ? t('cofres.salvando') : editingTx ? t('cofres.salvarAlteracoes') : t('cofres.adicionar')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showItemModal && (
        <Modal title={editingItem ? 'Editar item da meta' : 'Novo item da meta'} onClose={() => setShowItemModal(false)}>
          <div className="space-y-4">
            <Field label="Nome do item">
              <input value={itemForm.nome} onChange={(e) => setItemForm({ ...itemForm, nome: e.target.value })} className="input" placeholder="Ex.: Laptop, Equipamento, Curso..." />
            </Field>
            <Field label="Categoria">
              <input value={itemForm.categoria} onChange={(e) => setItemForm({ ...itemForm, categoria: e.target.value })} className="input" placeholder="Tecnologia, Estudos, Casa..." />
            </Field>
            <Field label="Descrição">
              <input value={itemForm.descricao} onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })} className="input" placeholder="Opcional" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantidade">
                <input type="number" min="1" step="1" value={itemForm.quantidade} onChange={(e) => setItemForm({ ...itemForm, quantidade: e.target.value })} className="input" />
              </Field>
              <Field label="Preço unitário">
                <input type="number" min="0" step="1" value={itemForm.preco_unitario} onChange={(e) => setItemForm({ ...itemForm, preco_unitario: e.target.value })} className="input" />
              </Field>
            </div>
            <Field label="Moeda">
              <input value={itemForm.moeda} onChange={(e) => setItemForm({ ...itemForm, moeda: e.target.value.toUpperCase() })} className="input" placeholder="KZ" />
            </Field>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowItemModal(false)} className="flex-1 border border-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
              <button onClick={saveItem} disabled={saving || !itemForm.nome.trim()} className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {saving ? 'Salvando...' : 'Salvar item'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showQuotesModal && (
        <Modal title={`Cotações · ${quoteItem?.nome ?? 'Item'}`} onClose={() => setShowQuotesModal(false)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-3 space-y-3">
              <p className="text-xs text-gray-400">Adicionar cotação</p>
              <Field label="Fornecedor">
                <input value={quoteForm.fornecedor} onChange={(e) => setQuoteForm({ ...quoteForm, fornecedor: e.target.value })} className="input" placeholder="Nome da loja/fornecedor" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço unitário">
                  <input type="number" min="0" step="1" value={quoteForm.preco_unitario} onChange={(e) => setQuoteForm({ ...quoteForm, preco_unitario: e.target.value })} className="input" />
                </Field>
                <Field label="Moeda">
                  <input value={quoteForm.moeda} onChange={(e) => setQuoteForm({ ...quoteForm, moeda: e.target.value.toUpperCase() })} className="input" />
                </Field>
              </div>
              <button onClick={addQuote} disabled={saving} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {saving ? 'Salvando...' : 'Salvar cotação'}
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {currentQuotes.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhuma cotação para este item.</p>
              ) : (
                currentQuotes.map((entry, index) => (
                  <div key={entry.quote.id} className={`rounded-xl border p-3 ${index === 0 ? 'border-emerald-700 bg-emerald-950/20' : 'border-gray-800 bg-gray-900/60'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-white font-medium">{entry.quote.fornecedor || 'Fornecedor sem nome'}</p>
                      {index === 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200">Melhor custo</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Preço unitário: {format(Number(entry.quote.preco_unitario || 0))} · Total estimado: {format(Number(entry.totals?.total || 0))}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {showSimModal && simResult && (
        <Modal title="Resultado da simulação" onClose={() => setShowSimModal(false)}>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-3">
              <p className="text-gray-400 text-xs">Cofre</p>
              <p className="text-white font-medium">{selected?.nome}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-3">
                <p className="text-gray-400 text-xs">Saldo atual</p>
                <p className="text-white font-semibold">{format(Number(simResult.saldo_atual || selected?.saldo || 0))}</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-3">
                <p className="text-gray-400 text-xs">Meta estimada</p>
                <p className="text-white font-semibold">{format(Number(simResult.meta_total || selected?.meta || 0))}</p>
              </div>
            </div>
            {typeof simResult.message === 'string' && (
              <p className="text-xs text-amber-200 rounded-xl border border-amber-900/50 bg-amber-950/30 p-3">{simResult.message}</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
