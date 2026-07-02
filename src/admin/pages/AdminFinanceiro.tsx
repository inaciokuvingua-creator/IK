import { useEffect, useState } from 'react';
import { Search, Trash2, Pencil, X, Check, AlertTriangle, ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import { adminApi } from '../api';

const TABLES = [
  { id: 'transacoes', label: 'Transações' },
  { id: 'cofres',     label: 'Cofres' },
  { id: 'negocios',   label: 'Negócios' },
  { id: 'patrimonio', label: 'Patrimônio' },
];

const CATS_TX = ['alimentação','moradia','transporte','saúde','educação','lazer','salário','negócio','investimento','outros'];

type Row = Record<string, unknown>;

export default function AdminFinanceiro() {
  const [tabela, setTabela] = useState('transacoes');
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  // Filters
  const [fUserId, setFUserId] = useState('');
  const [fCat, setFCat] = useState('');
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo] = useState('');

  // Edit
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editFields, setEditFields] = useState<Row>({});

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.records({
        tabela, page: p,
        ...(fUserId && { user_id: fUserId }),
        ...(tabela === 'transacoes' && fCat && { categoria: fCat }),
        ...(tabela === 'transacoes' && fDateFrom && { data_inicio: fDateFrom }),
        ...(tabela === 'transacoes' && fDateTo && { data_fim: fDateTo }),
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, tabela]);

  const showToast = (ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 3000); };

  const deleteRow = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;
    setWorking(id);
    try {
      await adminApi.deleteRecord(tabela, id);
      showToast(true, 'Registro excluído');
      load();
    } catch (e) { showToast(false, (e as Error).message); }
    setWorking(null);
  };

  const openEdit = (row: Row) => {
    setEditRow(row);
    setEditFields({ ...row });
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setWorking(String(editRow.id));
    try {
      const id = String(editRow.id);
      // Only send editable fields (exclude id, user_id, created_at)
      const { id: _id, user_id: _uid, created_at: _ca, ...payload } = editFields;
      await adminApi.editRecord(tabela, id, payload);
      showToast(true, 'Registro atualizado');
      setEditRow(null);
      load();
    } catch (e) { showToast(false, (e as Error).message); }
    setWorking(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / 30));

  const colsForTable: Record<string, string[]> = {
    transacoes: ['tipo','valor','categoria','descricao','data_transacao','user_id'],
    cofres:     ['nome','saldo','cor','meta','user_id'],
    negocios:   ['nome','categoria','receita_mensal','despesa_mensal','ativo','user_id'],
    patrimonio: ['nome','categoria','valor_atual','valor_aquisicao','data_aquisicao','user_id'],
  };
  const cols = colsForTable[tabela] ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Registros Financeiros</h1>
        <p className="text-gray-500 text-sm">{total} registros em {TABLES.find(t => t.id === tabela)?.label}</p>
      </div>

      {/* Table selector */}
      <div className="flex gap-2 flex-wrap">
        {TABLES.map((t) => (
          <button key={t.id} onClick={() => { setTabela(t.id); setPage(1); setRows([]); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tabela === t.id ? 'bg-red-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-500" />
          <span className="text-gray-400 text-sm font-medium">Filtros</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ID do Utilizador</label>
            <input value={fUserId} onChange={(e) => setFUserId(e.target.value)}
              placeholder="uuid..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500 transition-colors" />
          </div>
          {tabela === 'transacoes' && <>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
              <select value={fCat} onChange={(e) => setFCat(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500 transition-colors">
                <option value="">Todas</option>
                {CATS_TX.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data início</label>
              <input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data fim</label>
              <input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500 transition-colors" />
            </div>
          </>}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => { setPage(1); load(1); }} className="flex items-center gap-2 text-sm text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl transition-colors">
            <Search size={14} /> Buscar
          </button>
          <button onClick={() => { setFUserId(''); setFCat(''); setFDateFrom(''); setFDateTo(''); setPage(1); load(1); }}
            className="text-sm text-gray-400 border border-gray-700 px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors">
            Limpar
          </button>
          <button onClick={() => load()} className="ml-auto p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {toast && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {toast.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {toast.msg}
        </div>
      )}

      {error && <div className="text-red-400 text-sm p-3 bg-red-950/40 border border-red-900 rounded-xl">{error}</div>}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['ID', ...cols, 'Ações'].map((h) => (
                  <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(cols.length + 2)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse w-16" /></td>)}</tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={cols.length + 2} className="text-center text-gray-500 py-10">Nenhum registro encontrado</td></tr>
              ) : rows.map((row) => (
                <tr key={String(row.id)} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">{String(row.id).substring(0, 8)}…</td>
                  {cols.map((col) => (
                    <td key={col} className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap max-w-[140px] truncate">
                      {col === 'tipo' ? (
                        <span className={`px-2 py-0.5 rounded-full font-medium ${row[col] === 'entrada' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                          {String(row[col])}
                        </span>
                      ) : col === 'ativo' ? (
                        <span className={`px-2 py-0.5 rounded-full font-medium ${row[col] ? 'bg-emerald-950 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                          {row[col] ? 'Sim' : 'Não'}
                        </span>
                      ) : col === 'user_id' ? (
                        <span className="text-gray-600 font-mono">{String(row[col]).substring(0, 8)}…</span>
                      ) : (
                        String(row[col] ?? '—')
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(row)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => deleteRow(String(row.id))} disabled={working === String(row.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-gray-500 text-xs">Página {page} de {totalPages} · {total} registros</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"><ChevronLeft size={15} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editRow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditRow(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold">Editar {TABLES.find(t => t.id === tabela)?.label}</h3>
                <p className="text-gray-500 text-xs font-mono">{String(editRow.id).substring(0, 16)}…</p>
              </div>
              <button onClick={() => setEditRow(null)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {cols.filter(c => c !== 'user_id').map((col) => (
                <div key={col}>
                  <label className="block text-xs text-gray-500 mb-1 capitalize">{col.replace(/_/g, ' ')}</label>
                  {col === 'tipo' ? (
                    <select value={String(editFields[col] ?? '')} onChange={(e) => setEditFields({ ...editFields, [col]: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500 transition-colors">
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  ) : col === 'ativo' ? (
                    <select value={String(editFields[col])} onChange={(e) => setEditFields({ ...editFields, [col]: e.target.value === 'true' })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500 transition-colors">
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  ) : col === 'categoria' && tabela === 'transacoes' ? (
                    <select value={String(editFields[col] ?? '')} onChange={(e) => setEditFields({ ...editFields, [col]: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500 transition-colors">
                      {CATS_TX.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input type={col.includes('valor') || col === 'saldo' || col.includes('mensal') || col === 'meta' ? 'number' : col.includes('data') ? 'date' : 'text'}
                      value={String(editFields[col] ?? '')}
                      onChange={(e) => setEditFields({ ...editFields, [col]: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500 transition-colors" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditRow(null)} className="flex-1 border border-gray-700 text-gray-300 text-sm py-2.5 rounded-xl hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={saveEdit} disabled={!!working} className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
