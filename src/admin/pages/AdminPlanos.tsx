import { useCallback, useEffect, useState } from 'react';
import {
  CreditCard, RefreshCw, Check, AlertCircle, X, ChevronLeft,
  ChevronRight, Clock, CheckCircle2, XCircle, Phone, Mail,
  User, Crown, Building2, Rocket, Star, ChevronDown, Pencil,
} from 'lucide-react';
import { adminApi, type PlanRequest } from '../api';

const PLAN_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  premium:    { label: 'Premium',    icon: Crown,     color: 'text-amber-400',  bg: 'bg-amber-950/40',  border: 'border-amber-800/50' },
  business:   { label: 'Business',   icon: Building2, color: 'text-blue-400',   bg: 'bg-blue-950/40',   border: 'border-blue-800/50' },
  enterprise: { label: 'Enterprise', icon: Rocket,    color: 'text-purple-400', bg: 'bg-purple-950/40', border: 'border-purple-800/50' },
  free:       { label: 'Gratuito',   icon: Star,      color: 'text-gray-400',   bg: 'bg-gray-800',      border: 'border-gray-700' },
};

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  pending:   { label: 'Pendente',  icon: Clock,        color: 'text-amber-400',  bg: 'bg-amber-950/40',  border: 'border-amber-800/50' },
  approved:  { label: 'Aprovado',  icon: CheckCircle2, color: 'text-emerald-400',bg: 'bg-emerald-950/40',border: 'border-emerald-800/50' },
  rejected:  { label: 'Rejeitado', icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-950/40',    border: 'border-red-800/50' },
  cancelled: { label: 'Cancelado', icon: X,            color: 'text-gray-400',   bg: 'bg-gray-800',      border: 'border-gray-700' },
};

const ALL_PLANS = ['premium', 'business', 'enterprise'];

export default function AdminPlanos() {
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Action modal
  const [actionModal, setActionModal] = useState<{ req: PlanRequest; action: 'approve' | 'reject' | 'change' } | null>(null);
  const [nota, setNota] = useState('');
  const [changePlan, setChangePlan] = useState('');
  const [working, setWorking] = useState(false);

  const showToast = useCallback((ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 4000); }, []);

  const load = useCallback(async (p = page, s = statusFilter) => {
    setLoading(true);
    try {
      const res = await adminApi.planRequests(s, p);
      setRequests(res.requests);
      setTotal(res.total);
    } catch (e) { showToast(false, (e as Error).message); }
    setLoading(false);
  }, [page, statusFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  const openAction = (req: PlanRequest, action: 'approve' | 'reject' | 'change') => {
    setNota('');
    setChangePlan(req.plan);
    setActionModal({ req, action });
  };

  const executeAction = async () => {
    if (!actionModal) return;
    setWorking(true);
    try {
      const { action, req } = actionModal;
      const body: { status?: string; admin_nota?: string; plan?: string } = {};
      if (action === 'approve') body.status = 'approved';
      if (action === 'reject')  { body.status = 'rejected'; body.admin_nota = nota || undefined; }
      if (action === 'change')  { body.plan = changePlan; body.status = 'approved'; body.admin_nota = nota || undefined; }
      await adminApi.planRequestUpdate(req.id, body);
      showToast(true,
        action === 'approve' ? `Plano ${PLAN_META[req.plan]?.label} aprovado para ${req.user_email}!` :
        action === 'reject'  ? `Solicitação rejeitada.` :
        `Plano alterado para ${PLAN_META[changePlan]?.label} e aprovado.`
      );
      setActionModal(null);
      load();
    } catch (e) { showToast(false, (e as Error).message); }
    setWorking(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / 30));

  const pendingCount = statusFilter === 'pending' ? total : undefined;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard size={22} className="text-red-400" /> Planos & Assinaturas
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gestão manual de solicitações de assinatura
          </p>
        </div>
        <button onClick={() => load()} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {toast && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit flex-wrap">
        {[
          { id: 'pending',   label: 'Pendentes' },
          { id: 'approved',  label: 'Aprovados' },
          { id: 'rejected',  label: 'Rejeitados' },
          { id: '',          label: 'Todos' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => { setStatusFilter(id); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === id ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
            {id === 'pending' && pendingCount && pendingCount > 0 ? (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center leading-none">{pendingCount > 9 ? '9+' : pendingCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-14">
            <CreditCard size={28} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma solicitação {statusFilter === 'pending' ? 'pendente' : ''}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {requests.map(r => {
              const pm = PLAN_META[r.plan] ?? PLAN_META.free;
              const sm = STATUS_META[r.status] ?? STATUS_META.pending;
              const PlanIcon = pm.icon;
              const StatusIcon = sm.icon;
              return (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* User info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                        <User size={15} className="text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{r.user_nome ?? r.user_email}</p>
                        <p className="text-gray-500 text-xs truncate">{r.user_email}</p>
                        {r.whatsapp && (
                          <a href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="text-green-400 text-xs flex items-center gap-1 mt-0.5 hover:text-green-300 transition-colors">
                            <Phone size={9} /> {r.whatsapp}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Plan + status badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${pm.color} ${pm.bg} ${pm.border}`}>
                        <PlanIcon size={10} /> {pm.label}
                      </span>
                      <span className="text-gray-600 text-xs">{r.billing === 'anual' ? 'Anual' : 'Mensal'}</span>
                      <span className="text-white font-bold text-xs">{r.preco > 0 ? `${r.preco.toLocaleString('pt-AO')} Kz` : 'Sob consulta'}</span>
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${sm.color} ${sm.bg} ${sm.border}`}>
                        <StatusIcon size={10} /> {sm.label}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="text-right shrink-0">
                      <p className="text-gray-600 text-xs">{new Date(r.created_at).toLocaleDateString('pt-AO')}</p>
                      <p className="text-gray-700 text-xs">{new Date(r.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  {/* Message */}
                  {r.mensagem && (
                    <div className="mt-2 ml-13 pl-13">
                      <p className="text-gray-400 text-xs bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 inline-block max-w-full">
                        <span className="text-gray-600 font-semibold">Mensagem: </span>{r.mensagem}
                      </p>
                    </div>
                  )}

                  {/* Admin note */}
                  {r.admin_nota && (
                    <div className="mt-1.5 ml-13 pl-13">
                      <p className="text-gray-500 text-xs italic">
                        <span className="text-gray-600 font-semibold not-italic">Nota admin: </span>{r.admin_nota}
                        {r.admin_nome && <span className="text-gray-700"> — {r.admin_nome}</span>}
                      </p>
                    </div>
                  )}

                  {/* Action buttons — only for pending */}
                  {r.status === 'pending' && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <a href={`https://wa.me/${r.whatsapp?.replace(/\D/g, '') || ''}`} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${r.whatsapp ? 'border-green-800/50 text-green-400 hover:bg-green-950/30' : 'border-gray-700 text-gray-600 cursor-not-allowed opacity-40 pointer-events-none'}`}>
                        <Phone size={11} /> WhatsApp
                      </a>
                      <a href={`mailto:${r.user_email}?subject=Sua solicitação de plano IK Finance`}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-800/50 text-blue-400 hover:bg-blue-950/30 transition-colors">
                        <Mail size={11} /> E-mail
                      </a>
                      <div className="flex-1" />
                      <button onClick={() => openAction(r, 'change')}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
                        <Pencil size={11} /> Mudar plano
                      </button>
                      <button onClick={() => openAction(r, 'reject')}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-800/50 text-red-400 hover:bg-red-950/30 transition-colors">
                        <X size={11} /> Rejeitar
                      </button>
                      <button onClick={() => openAction(r, 'approve')}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
                        <Check size={11} /> Aprovar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
            <span className="text-gray-500 text-xs">Página {page} de {totalPages} · {total} solicitações</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"><ChevronLeft size={15} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Action Modal ─────────────────────────────────────────────────────── */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">
                {actionModal.action === 'approve' ? 'Aprovar Solicitação' :
                 actionModal.action === 'reject'  ? 'Rejeitar Solicitação' :
                 'Alterar e Aprovar Plano'}
              </h3>
              <button onClick={() => setActionModal(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>

            {/* Request summary */}
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <User size={14} className="text-gray-500" />
                <div>
                  <p className="text-white font-medium text-sm">{actionModal.req.user_nome ?? actionModal.req.user_email}</p>
                  <p className="text-gray-500 text-xs">{actionModal.req.user_email}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(() => { const pm = PLAN_META[actionModal.req.plan] ?? PLAN_META.free; const PlanIcon = pm.icon; return (
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${pm.color} ${pm.bg} ${pm.border}`}>
                    <PlanIcon size={9} /> {pm.label}
                  </span>
                ); })()}
                <span className="text-gray-500 text-xs">{actionModal.req.billing === 'anual' ? 'Anual' : 'Mensal'}</span>
                <span className="text-white font-bold text-xs">{actionModal.req.preco > 0 ? `${actionModal.req.preco.toLocaleString('pt-AO')} Kz` : 'Sob consulta'}</span>
              </div>
            </div>

            {/* Change plan selector */}
            {actionModal.action === 'change' && (
              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1.5 block">Plano a Aprovar</label>
                <div className="relative">
                  <select value={changePlan} onChange={e => setChangePlan(e.target.value)}
                    className="w-full appearance-none bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors pr-9">
                    {ALL_PLANS.map(p => <option key={p} value={p}>{PLAN_META[p]?.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Approval confirmation */}
            {actionModal.action === 'approve' && (
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3.5 mb-4 flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-emerald-300 text-xs">
                  Ao aprovar, o plano <strong>{PLAN_META[actionModal.req.plan]?.label}</strong> será ativado imediatamente na conta do utilizador e uma assinatura registada no sistema.
                </p>
              </div>
            )}

            {/* Note field */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">
                Nota {actionModal.action === 'reject' ? '(motivo da rejeição)' : '(opcional)'}
              </label>
              <textarea
                value={nota}
                onChange={e => setNota(e.target.value)}
                rows={2}
                placeholder={actionModal.action === 'reject' ? 'Ex: Pagamento não confirmado...' : 'Ex: Pagamento confirmado via transferência...'}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors placeholder-gray-600 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setActionModal(null)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
              <button onClick={executeAction} disabled={working}
                className={`flex-1 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  actionModal.action === 'reject' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}>
                {working
                  ? <><RefreshCw size={13} className="animate-spin" /> Processando...</>
                  : actionModal.action === 'reject' ? <><XCircle size={13} /> Rejeitar</>
                  : <><CheckCircle2 size={13} /> {actionModal.action === 'change' ? 'Alterar & Aprovar' : 'Confirmar Aprovação'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
