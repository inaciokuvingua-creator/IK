import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { adminApi, type MarketplaceModerationItem, type MarketplaceReportItem } from '../api';

export default function AdminMarketplace() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'escalated' | 'all'>('pending');
  const [queue, setQueue] = useState<MarketplaceModerationItem[]>([]);
  const [reports, setReports] = useState<MarketplaceReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.marketplaceModeration(status, 1);
      setQueue(data.queue);
      setReports(data.reports);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const updateQueue = async (id: string, nextStatus: 'approved' | 'rejected' | 'escalated') => {
    await adminApi.marketplaceModerationUpdate(id, { status: nextStatus });
    await load();
  };

  const updateReport = async (id: string, nextStatus: 'reviewing' | 'resolved' | 'dismissed') => {
    await adminApi.marketplaceReportUpdate(id, { status: nextStatus });
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace Moderation</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fila de revisão, denúncias e sinais de abuso do marketplace.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-400 border border-gray-700 px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['pending','approved','rejected','escalated','all'] as const).map((item) => (
          <button key={item} onClick={() => setStatus(item)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === item ? 'bg-red-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'}`}>
            {item}
          </button>
        ))}
      </div>

      {error && <div className="text-red-400 text-sm p-3 bg-red-950/40 border border-red-900 rounded-xl">{error}</div>}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2"><ShieldAlert size={16} className="text-amber-400" /><h2 className="text-white font-semibold">Fila de moderação</h2></div>
          {loading ? <p className="text-gray-500 text-sm">A carregar...</p> : queue.length === 0 ? <p className="text-gray-500 text-sm">Sem itens na fila.</p> : queue.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{item.summary || item.entity_type}</p>
                  <p className="text-gray-500 text-xs mt-1">{item.entity_type} · prioridade {item.priority} · origem {item.source}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">{item.status}</span>
              </div>
              {item.metadata && <pre className="text-xs text-gray-400 bg-gray-900 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(item.metadata, null, 2)}</pre>}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => updateQueue(item.id, 'approved')} className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-xl"><CheckCircle size={12} /> Aprovar</button>
                <button onClick={() => updateQueue(item.id, 'rejected')} className="inline-flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-xl"><XCircle size={12} /> Rejeitar</button>
                <button onClick={() => updateQueue(item.id, 'escalated')} className="inline-flex items-center gap-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-3 py-1.5 rounded-xl"><AlertTriangle size={12} /> Escalar</button>
              </div>
            </div>
          ))}
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-red-400" /><h2 className="text-white font-semibold">Denúncias</h2></div>
          {loading ? <p className="text-gray-500 text-sm">A carregar...</p> : reports.length === 0 ? <p className="text-gray-500 text-sm">Sem denúncias.</p> : reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{report.reason}</p>
                  <p className="text-gray-500 text-xs mt-1">{report.entity_type} · {new Date(report.created_at).toLocaleString('pt-AO')}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">{report.status}</span>
              </div>
              {report.details && <p className="text-gray-400 text-sm">{report.details}</p>}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => updateReport(report.id, 'reviewing')} className="inline-flex items-center gap-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-3 py-1.5 rounded-xl">Em análise</button>
                <button onClick={() => updateReport(report.id, 'resolved')} className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-xl">Resolver</button>
                <button onClick={() => updateReport(report.id, 'dismissed')} className="inline-flex items-center gap-1.5 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 px-3 py-1.5 rounded-xl">Descartar</button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
