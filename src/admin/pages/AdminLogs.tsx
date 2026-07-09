import { useCallback, useEffect, useState } from 'react';
import { ScrollText, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi, type AdminLog } from '../api';

const ACTION_COLORS: Record<string, string> = {
  login:           'bg-blue-950 text-blue-400',
  user_edit:       'bg-amber-950 text-amber-400',
  user_suspend:    'bg-red-950 text-red-400',
  user_unsuspend:  'bg-emerald-950 text-emerald-400',
  user_delete:     'bg-red-950 text-red-500',
  record_edit:     'bg-amber-950 text-amber-300',
  record_delete:   'bg-red-950 text-red-400',
  settings_change: 'bg-purple-950 text-purple-400',
  password_change: 'bg-orange-950 text-orange-400',
};

const ACTION_LABELS: Record<string, string> = {
  login:           'Login',
  user_edit:       'Editar utilizador',
  user_suspend:    'Suspender utilizador',
  user_unsuspend:  'Reativar utilizador',
  user_delete:     'Excluir utilizador',
  record_edit:     'Editar registro',
  record_delete:   'Excluir registro',
  settings_change: 'Alterar configurações',
  password_change: 'Alterar senha',
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.logs(p);
      setLogs(res.logs);
      setTotal(res.total);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScrollText size={22} className="text-red-400" /> Logs de Auditoria
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} registros de atividade administrativa</p>
        </div>
        <button onClick={() => load()} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {error && <div className="text-red-400 text-sm p-3 bg-red-950/40 border border-red-900 rounded-xl">{error}</div>}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <ScrollText size={28} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma atividade registada ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {logs.map((log) => (
              <div key={log.id}>
                <div
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-800/30 transition-colors cursor-pointer"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${ACTION_COLORS[log.acao]?.split(' ')[1] ?? 'bg-gray-500'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.acao] ?? 'bg-gray-800 text-gray-400'}`}>
                          {ACTION_LABELS[log.acao] ?? log.acao}
                        </span>
                        <span className="text-gray-400 text-xs">por <span className="text-white font-medium">{log.admin_nome}</span></span>
                        {log.entidade !== '-' && (
                          <span className="text-gray-600 text-xs">· {log.entidade}</span>
                        )}
                        {log.entidade_id && (
                          <span className="text-gray-700 text-xs font-mono">{log.entidade_id.substring(0, 8)}…</span>
                        )}
                      </div>
                      <time className="text-gray-600 text-xs shrink-0">
                        {new Date(log.created_at).toLocaleString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded === log.id && log.detalhes && (
                  <div className="px-11 pb-4">
                    <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50">
                      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Detalhes</p>
                      <pre className="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.detalhes, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
            <span className="text-gray-500 text-xs">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"><ChevronLeft size={15} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
