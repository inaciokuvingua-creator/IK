import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search, RefreshCw, UserX, UserCheck, Trash2, Pencil,
  X, Check, AlertTriangle, ChevronLeft, ChevronRight, Eye,
  ShieldAlert, Calendar, Activity, Wallet, BarChart3,
} from 'lucide-react';
import { adminApi, type AdminUserRow, type UserDetail } from '../api';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [working, setWorking] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.users(s, p);
      setUsers(res.users);
      setTotal(res.total);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setPage(1); load(1, v); }, 400);
  };

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const act = async (action: () => Promise<unknown>, label: string, userId: string) => {
    setWorking(userId);
    try {
      await action();
      showToast(true, label);
      load();
    } catch (e) { showToast(false, (e as Error).message); }
    setWorking(null);
  };

  const openDetail = async (id: string) => {
    try {
      const d = await adminApi.getUser(id);
      setDetail(d);
    } catch (e) { showToast(false, (e as Error).message); }
  };

  const saveEdit = async () => {
    if (!editId) return;
    await act(() => adminApi.editUser(editId, editEmail), 'E-mail atualizado', editId);
    setEditId(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const fmt = (n: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilizadores</h1>
          <p className="text-gray-500 text-sm">{total} conta{total !== 1 ? 's' : ''} registadas</p>
        </div>
        <button onClick={() => load()} className="self-start sm:self-auto flex items-center gap-2 text-sm text-gray-400 border border-gray-700 px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Pesquisar por e-mail..."
          className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl py-2.5 pl-10 pr-4 text-sm placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {toast.ok ? <Check size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {error && <div className="text-red-400 text-sm p-3 bg-red-950/40 border border-red-900 rounded-xl">{error}</div>}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['E-mail', 'Registado', 'Último acesso', 'Transações', 'Saldo', 'Negócios', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-500 py-10">Nenhum utilizador encontrado</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <div className="flex items-center gap-2">
                        <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1 text-xs w-40 focus:outline-none focus:border-red-500" />
                        <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
                        <button onClick={() => setEditId(null)} className="text-gray-500 hover:text-gray-300"><X size={14} /></button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-white font-medium truncate max-w-[180px]">{u.email}</p>
                        <p className="text-gray-600 text-xs font-mono">{u.id.substring(0, 8)}…</p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString('pt-AO')}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('pt-AO') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-center">{u.transacoes}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{fmt(u.saldo_cofres)}</td>
                  <td className="px-4 py-3 text-gray-300 text-center">{u.negocios}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.banned ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'}`}>
                      {u.banned ? 'Suspenso' : 'Ativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDetail(u.id)} title="Ver detalhes"
                        className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => { setEditId(u.id); setEditEmail(u.email); }} title="Editar"
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => act(u.banned ? () => adminApi.unsuspendUser(u.id) : () => adminApi.suspendUser(u.id), u.banned ? 'Utilizador reativado' : 'Utilizador suspenso', u.id)}
                        disabled={working === u.id}
                        title={u.banned ? 'Reativar' : 'Suspender'}
                        className={`p-1.5 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 ${u.banned ? 'text-gray-500 hover:text-emerald-400' : 'text-gray-500 hover:text-amber-400'}`}>
                        {u.banned ? <UserCheck size={13} /> : <UserX size={13} />}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Excluir permanentemente ${u.email}?`)) act(() => adminApi.deleteUser(u.id), 'Utilizador excluído', u.id); }}
                        disabled={working === u.id}
                        title="Excluir"
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-gray-500 text-xs">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div>
                <p className="text-white font-semibold">{detail.user.email}</p>
                <p className="text-gray-500 text-xs font-mono">{detail.user.id}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* User meta */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Calendar, label: 'Registado', value: new Date(detail.user.created_at).toLocaleDateString('pt-AO') },
                  { icon: Activity, label: 'Último acesso', value: detail.user.last_sign_in_at ? new Date(detail.user.last_sign_in_at).toLocaleDateString('pt-AO') : '—' },
                  { icon: ShieldAlert, label: 'Status', value: detail.user.banned_until ? 'Suspenso' : 'Ativo' },
                  { icon: BarChart3, label: 'Transações', value: String(detail.transacoes.length) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 bg-gray-800/50 rounded-xl p-3">
                    <Icon size={14} className="text-gray-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-500 text-xs">{label}</p>
                      <p className="text-white text-sm font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cofres */}
              {detail.cofres.length > 0 && (
                <Section title={`Cofres (${detail.cofres.length})`}>
                  {detail.cofres.map((c: Record<string, unknown>) => (
                    <div key={String(c.id)} className="flex justify-between text-sm py-1.5 border-b border-gray-800 last:border-0">
                      <span className="text-gray-300">{String(c.nome)}</span>
                      <span className="text-white font-medium">{Number(c.saldo).toLocaleString('pt-AO')} Kz</span>
                    </div>
                  ))}
                </Section>
              )}

              {/* Recent transactions */}
              {detail.transacoes.length > 0 && (
                <Section title={`Transações recentes`}>
                  {(detail.transacoes as Record<string, unknown>[]).slice(0, 5).map((t) => (
                    <div key={String(t.id)} className="flex justify-between text-sm py-1.5 border-b border-gray-800 last:border-0">
                      <div>
                        <span className="text-gray-300 capitalize">{String(t.categoria)}</span>
                        <span className="text-gray-600 text-xs ml-2">{String(t.data_transacao)}</span>
                      </div>
                      <span className={`font-medium ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.tipo === 'entrada' ? '+' : '-'}{Number(t.valor).toLocaleString('pt-AO')} Kz
                      </span>
                    </div>
                  ))}
                </Section>
              )}

              {/* Negocios */}
              {detail.negocios.length > 0 && (
                <Section title={`Negócios (${detail.negocios.length})`}>
                  {detail.negocios.map((n: Record<string, unknown>) => (
                    <div key={String(n.id)} className="flex justify-between text-sm py-1.5 border-b border-gray-800 last:border-0">
                      <span className="text-gray-300">{String(n.nome)}</span>
                      <span className="text-white font-medium">{(Number(n.receita_mensal) - Number(n.despesa_mensal)).toLocaleString('pt-AO')} Kz/mês</span>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">{title}</p>
      <div className="bg-gray-800/40 rounded-xl px-4 py-1">{children}</div>
    </div>
  );
}
