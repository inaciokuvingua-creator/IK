import { useCallback, useEffect, useState } from 'react';
import {
  UsersRound, Plus, RefreshCw, Crown, Shield, Eye, EyeOff,
  Mail, Trash2, UserCheck, UserX, ChevronDown, Check, X,
  AlertCircle, Send, Clock, Building2,
} from 'lucide-react';
import { adminApi, type AdminTeamMember, type AdminTeamInvite, type AdminRole } from '../api';
import { useAdminAuth } from '../AdminAuthContext';

const ROLE_SLUGS = ['super_admin', 'admin', 'moderator', 'financeiro', 'marketplace', 'suporte'] as const;

const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  super_admin:  { label: 'Super Admin',        color: 'text-red-400',     bg: 'bg-red-950/40',     border: 'border-red-800/50' },
  admin:        { label: 'Administrador',      color: 'text-amber-400',   bg: 'bg-amber-950/40',   border: 'border-amber-800/50' },
  moderator:    { label: 'Moderador',          color: 'text-purple-400',  bg: 'bg-purple-950/40',  border: 'border-purple-800/50' },
  financeiro:   { label: 'Eq. Financeira',     color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/50' },
  marketplace:  { label: 'Eq. Marketplace',    color: 'text-blue-400',    bg: 'bg-blue-950/40',    border: 'border-blue-800/50' },
  suporte:      { label: 'Suporte',            color: 'text-gray-400',    bg: 'bg-gray-800/60',    border: 'border-gray-700' },
};

const PERM_LABELS: Record<string, string> = {
  all: 'Acesso Total', users: 'Utilizadores', settings: 'Configurações',
  logs: 'Logs', financeiro: 'Financeiro', reports: 'Relatórios',
  marketplace: 'Marketplace', stores: 'Lojas', products: 'Produtos',
};

export default function AdminEquipe() {
  const { admin, isSuperAdmin } = useAdminAuth();
  const [team, setTeam] = useState<AdminTeamMember[]>([]);
  const [invites, setInvites] = useState<AdminTeamInvite[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'members' | 'invites' | 'roles'>('members');
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', nome: '', role: 'suporte', department: '' });
  const [inviting, setInviting] = useState(false);

  // Edit role modal
  const [editRole, setEditRole] = useState<AdminRole | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({ nome: '', descricao: '', cor: '', permissions: {} as Record<string, boolean> });
  const [savingRole, setSavingRole] = useState(false);

  const showToast = useCallback((ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 3000); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, inv, r] = await Promise.all([adminApi.team(), adminApi.teamInvites(), adminApi.roles()]);
      setTeam(t);
      setInvites(inv);
      setRoles(r);
    } catch (e) { showToast(false, (e as Error).message); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const sendInvite = async () => {
    if (!inviteForm.email || !inviteForm.nome) { showToast(false, 'Preencha e-mail e nome'); return; }
    setInviting(true);
    try {
      await adminApi.teamInvite(inviteForm);
      showToast(true, `Convite enviado para ${inviteForm.email}`);
      setShowInvite(false);
      setInviteForm({ email: '', nome: '', role: 'suporte', department: '' });
      load();
    } catch (e) { showToast(false, (e as Error).message); }
    setInviting(false);
  };

  const toggleMember = async (m: AdminTeamMember) => {
    try {
      await adminApi.teamEdit(m.id, { ativo: !m.ativo });
      showToast(true, m.ativo ? 'Membro desativado' : 'Membro reativado');
      load();
    } catch (e) { showToast(false, (e as Error).message); }
  };

  const changeRole = async (m: AdminTeamMember, role: string) => {
    if (m.id === admin?.id) { showToast(false, 'Não pode alterar o seu próprio cargo'); return; }
    try {
      await adminApi.teamEdit(m.id, { role });
      showToast(true, 'Cargo actualizado');
      load();
    } catch (e) { showToast(false, (e as Error).message); }
  };

  const removeMember = async (m: AdminTeamMember) => {
    if (!confirm(`Remover ${m.nome} da equipe?`)) return;
    try {
      await adminApi.teamRemove(m.id);
      showToast(true, 'Membro removido');
      load();
    } catch (e) { showToast(false, (e as Error).message); }
  };

  const openEditRole = (r: AdminRole) => {
    setEditRole(r);
    setEditRoleForm({ nome: r.nome, descricao: r.descricao ?? '', cor: r.cor, permissions: { ...r.permissions } });
  };

  const saveRole = async () => {
    if (!editRole) return;
    setSavingRole(true);
    try {
      await adminApi.roleEdit(editRole.id, editRoleForm);
      showToast(true, 'Cargo salvo');
      setEditRole(null);
      load();
    } catch (e) { showToast(false, (e as Error).message); }
    setSavingRole(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UsersRound size={22} className="text-red-400" /> Minha Equipe
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{team.length} membro{team.length !== 1 ? 's' : ''} · Gestão de cargos e permissões</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
            <RefreshCw size={15} />
          </button>
          {isSuperAdmin && (
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              <Plus size={15} /> Convidar Membro
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {[
          { id: 'members', label: `Membros (${team.length})` },
          { id: 'invites', label: `Convites (${invites.filter(i => i.status === 'pending').length})` },
          { id: 'roles',   label: 'Cargos & Permissões' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Members tab ──────────────────────────────────────────────────────── */}
      {tab === 'members' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-12">
              <UsersRound size={28} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhum membro de equipe ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {team.map(m => {
                const rm = ROLE_META[m.role] ?? ROLE_META.suporte;
                const isMe = m.id === admin?.id;
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-800 to-red-950 flex items-center justify-center shrink-0">
                      {m.role === 'super_admin' ? <Crown size={16} className="text-red-300" /> : <span className="text-white font-bold text-sm">{m.nome[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold text-sm">{m.nome} {isMe && <span className="text-gray-500 text-xs">(você)</span>}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${rm.color} ${rm.bg} ${rm.border}`}>{rm.label}</span>
                        {!m.ativo && <span className="text-xs bg-red-950/40 text-red-400 border border-red-800/50 px-2 py-0.5 rounded-full">Inativo</span>}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">{m.email} {m.department && `· ${m.department}`}</p>
                      <p className="text-gray-700 text-xs">Último login: {m.last_login ? new Date(m.last_login).toLocaleDateString('pt-AO') : 'Nunca'}</p>
                    </div>
                    {isSuperAdmin && !isMe && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Role selector */}
                        <div className="relative">
                          <select value={m.role} onChange={e => changeRole(m, e.target.value)}
                            className="appearance-none bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 pr-6 focus:outline-none focus:border-red-600 cursor-pointer">
                            {ROLE_SLUGS.filter(r => r !== 'super_admin').map(r => (
                              <option key={r} value={r}>{ROLE_META[r].label}</option>
                            ))}
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                        <button onClick={() => toggleMember(m)} title={m.ativo ? 'Desativar' : 'Reativar'}
                          className={`p-1.5 rounded-lg transition-colors ${m.ativo ? 'text-gray-500 hover:text-red-400 hover:bg-red-950/30' : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-950/30'}`}>
                          {m.ativo ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button onClick={() => removeMember(m)} title="Remover"
                          className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Invites tab ──────────────────────────────────────────────────────── */}
      {tab === 'invites' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {invites.length === 0 ? (
            <div className="text-center py-12">
              <Mail size={28} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhum convite enviado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {invites.map(inv => {
                const rm = ROLE_META[inv.role] ?? ROLE_META.suporte;
                const expired = new Date(inv.expires_at) < new Date();
                const statusColor = {
                  pending: 'text-amber-400 bg-amber-950/40 border-amber-800/50',
                  accepted: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
                  rejected: 'text-red-400 bg-red-950/40 border-red-800/50',
                  expired: 'text-gray-500 bg-gray-800 border-gray-700',
                }[expired ? 'expired' : inv.status] ?? '';
                return (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                      <Send size={15} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold text-sm">{inv.nome}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${rm.color} ${rm.bg} ${rm.border}`}>{rm.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor}`}>
                          {expired ? 'Expirado' : inv.status === 'pending' ? 'Pendente' : inv.status === 'accepted' ? 'Aceito' : 'Rejeitado'}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">{inv.email}</p>
                      <p className="text-gray-700 text-xs flex items-center gap-1"><Clock size={9} /> Expira: {new Date(inv.expires_at).toLocaleDateString('pt-AO')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Roles tab ────────────────────────────────────────────────────────── */}
      {tab === 'roles' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(r => {
            const rm = ROLE_META[r.slug] ?? ROLE_META.suporte;
            const memberCount = team.filter(m => m.role === r.slug).length;
            return (
              <div key={r.id} className={`border rounded-2xl p-5 ${rm.bg} ${rm.border}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: r.cor + '30', border: `1px solid ${r.cor}40` }}>
                      {r.slug === 'super_admin' ? <Crown size={14} style={{ color: r.cor }} /> : <Shield size={14} style={{ color: r.cor }} />}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{r.nome}</p>
                      <p className="text-gray-500 text-xs">{memberCount} membro{memberCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {isSuperAdmin && r.slug !== 'super_admin' && (
                    <button onClick={() => openEditRole(r)} className="text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-600 px-2 py-1 rounded-lg transition-colors">
                      Editar
                    </button>
                  )}
                </div>
                <p className="text-gray-400 text-xs mb-3">{r.descricao}</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(r.permissions ?? {}).filter(([, v]) => v).map(([k]) => (
                    <span key={k} className="text-xs bg-black/20 text-gray-300 px-2 py-0.5 rounded-lg border border-white/10">
                      {PERM_LABELS[k] ?? k}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Invite modal ─────────────────────────────────────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Convidar Membro</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                <input value={inviteForm.nome} onChange={e => setInviteForm({ ...inviteForm, nome: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">E-mail</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cargo</label>
                <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors">
                  {ROLE_SLUGS.filter(r => r !== 'super_admin').map(r => (
                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Departamento (opcional)</label>
                <input value={inviteForm.department} onChange={e => setInviteForm({ ...inviteForm, department: e.target.value })}
                  placeholder="Ex: Financeiro, Suporte..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowInvite(false)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={sendInvite} disabled={inviting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {inviting ? <><RefreshCw size={13} className="animate-spin" /> Enviando...</> : <><Send size={13} /> Enviar Convite</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit role modal ───────────────────────────────────────────────────── */}
      {editRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Editar Cargo — {editRole.nome}</h3>
              <button onClick={() => setEditRole(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                <input value={editRoleForm.nome} onChange={e => setEditRoleForm({ ...editRoleForm, nome: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
                <input value={editRoleForm.descricao} onChange={e => setEditRoleForm({ ...editRoleForm, descricao: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-semibold">Permissões</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PERM_LABELS).filter(([k]) => k !== 'all').map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <div
                        onClick={() => setEditRoleForm(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } }))}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${editRoleForm.permissions[key] ? 'bg-red-600 border-red-600' : 'border-gray-600 bg-gray-800'}`}>
                        {editRoleForm.permissions[key] && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-gray-300 text-xs group-hover:text-white transition-colors">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditRole(null)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={saveRole} disabled={savingRole}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {savingRole ? 'Salvando...' : 'Salvar Cargo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
