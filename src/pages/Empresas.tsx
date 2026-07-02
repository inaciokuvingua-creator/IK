import { useEffect, useState } from 'react';
import {
  Building2, Plus, Users, FolderOpen, Mail, Check,
  ChevronRight, Briefcase, Globe, X, AlertCircle, Pencil,
  UserPlus, Shield, CheckCircle, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Company = {
  id: string; owner_id: string; nome: string; nif: string | null;
  setor: string; descricao: string | null; logo_url: string | null;
  website: string | null; plan: string; verified: boolean; ativo: boolean; created_at: string;
};
type Department = { id: string; company_id: string; nome: string; descricao: string | null; created_at: string; };
type Member = { id: string; user_id: string; role: string; department: string | null; cargo: string | null; status: string; created_at: string; };

const SETORES = ['tecnologia','finanças','saúde','educação','comércio','serviços','agropecuária','indústria','media','construção','outros'];

const empty = () => ({ nome:'', nif:'', setor:'outros', descricao:'', website:'' });

export default function Empresas() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptNome, setDeptNome] = useState('');
  const [tab, setTab] = useState<'info'|'equipe'|'departamentos'>('info');

  const showToast = (ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 3500); };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    setCompanies(data ?? []);
    if (data && data.length > 0 && !selected) setSelected(data[0]);
    setLoading(false);
  };

  const loadCompanyData = async (cid: string) => {
    const [d, m] = await Promise.all([
      supabase.from('departments').select('*').eq('company_id', cid).order('created_at'),
      supabase.from('company_members').select('*').eq('company_id', cid),
    ]);
    setDepartments(d.data ?? []);
    setMembers(m.data ?? []);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selected) loadCompanyData(selected.id); }, [selected?.id]);

  const openCreate = () => { setEditing(null); setForm(empty()); setShowModal(true); };
  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({ nome: c.nome, nif: c.nif ?? '', setor: c.setor, descricao: c.descricao ?? '', website: c.website ?? '' });
    setShowModal(true);
  };

  const save = async () => {
    setError(null); setSaving(true);
    const payload = { nome: form.nome, nif: form.nif || null, setor: form.setor, descricao: form.descricao || null, website: form.website || null };
    const { error: err } = editing
      ? await supabase.from('companies').update(payload).eq('id', editing.id)
      : await supabase.from('companies').insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false); setShowModal(false);
    showToast(true, editing ? 'Empresa atualizada' : 'Empresa criada com sucesso!');
    await load();
  };

  const deleteCompany = async (id: string) => {
    if (!confirm('Excluir esta empresa permanentemente?')) return;
    await supabase.from('companies').delete().eq('id', id);
    if (selected?.id === id) setSelected(null);
    await load();
    showToast(true, 'Empresa excluída');
  };

  const invite = async () => {
    if (!selected || !inviteEmail) return;
    setInviting(true);
    const { error: err } = await supabase.from('company_invites').insert({ company_id: selected.id, email: inviteEmail, role: inviteRole });
    if (err) showToast(false, err.message);
    else { showToast(true, `Convite enviado para ${inviteEmail}`); setInviteEmail(''); }
    setInviting(false);
  };

  const addDept = async () => {
    if (!selected || !deptNome.trim()) return;
    await supabase.from('departments').insert({ company_id: selected.id, nome: deptNome.trim() });
    setDeptNome(''); setShowDeptModal(false);
    await loadCompanyData(selected.id);
    showToast(true, 'Departamento criado');
  };

  const ROLE_LABELS: Record<string,string> = { owner:'Proprietário', admin:'Admin', manager:'Gestor', employee:'Funcionário' };
  const STATUS_COLORS: Record<string,string> = { active:'text-emerald-400 bg-emerald-950', invited:'text-amber-400 bg-amber-950', suspended:'text-red-400 bg-red-950' };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Empresas</h1>
          <p className="text-gray-400 text-sm mt-0.5">Gerencie empresas, equipas e departamentos</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={16} /> Nova Empresa
        </button>
      </div>

      {toast && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-900 rounded-2xl border border-gray-800" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
          <Building2 size={36} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhuma empresa ainda</p>
          <p className="text-gray-600 text-sm mt-1 mb-5">Crie sua primeira empresa para gerir equipes e projetos</p>
          <button onClick={openCreate} className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <Plus size={15} /> Criar Empresa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Companies list */}
          <div className="space-y-2">
            {companies.map(c => (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${selected?.id === c.id ? 'bg-emerald-500/10 border-emerald-700' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-emerald-400 font-bold text-lg shrink-0">
                      {c.nome[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-semibold text-sm truncate">{c.nome}</p>
                        {c.verified && <CheckCircle size={13} className="text-blue-400 shrink-0" />}
                      </div>
                      <p className="text-gray-500 text-xs capitalize">{c.setor}</p>
                    </div>
                  </div>
                  <ChevronRight size={15} className={`shrink-0 mt-1 ${selected?.id === c.id ? 'text-emerald-400' : 'text-gray-600'}`} />
                </div>
              </button>
            ))}
          </div>

          {/* Company detail */}
          {selected && (
            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-emerald-400 font-bold text-lg">
                    {selected.nome[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-bold">{selected.nome}</p>
                    <p className="text-gray-500 text-xs capitalize">{selected.setor}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selected.owner_id === user?.id && <>
                    <button onClick={() => openEdit(selected)} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => deleteCompany(selected.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-xl transition-colors"><Trash2 size={15} /></button>
                  </>}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-800">
                {(['info','equipe','departamentos'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${tab === t ? 'text-emerald-400 border-emerald-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                    {t === 'info' ? 'Informações' : t === 'equipe' ? `Equipe (${members.length})` : `Departamentos (${departments.length})`}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {tab === 'info' && (
                  <div className="space-y-4">
                    {selected.descricao && <p className="text-gray-400 text-sm leading-relaxed">{selected.descricao}</p>}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'NIF / CNPJ', value: selected.nif ?? '—', icon: Shield },
                        { label: 'Plano', value: selected.plan, icon: Briefcase },
                        { label: 'Website', value: selected.website ?? '—', icon: Globe },
                        { label: 'Status', value: selected.ativo ? 'Ativa' : 'Inativa', icon: CheckCircle },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-gray-800/50 rounded-xl p-3.5">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={13} className="text-gray-500" />
                            <p className="text-gray-500 text-xs">{label}</p>
                          </div>
                          <p className="text-white text-sm font-medium capitalize">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'equipe' && selected.owner_id === user?.id && (
                  <div className="space-y-4">
                    {/* Invite */}
                    <div className="flex gap-2">
                      <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                      <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                        className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                        {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'owner').map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <button onClick={invite} disabled={inviting || !inviteEmail}
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0">
                        <UserPlus size={15} /> {inviting ? '...' : 'Convidar'}
                      </button>
                    </div>
                    {members.length === 0 ? (
                      <p className="text-gray-600 text-sm text-center py-6">Nenhum membro ainda. Convide sua equipe acima.</p>
                    ) : (
                      <div className="space-y-2">
                        {members.map(m => (
                          <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                              <Users size={14} className="text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium">{m.cargo ?? ROLE_LABELS[m.role]}</p>
                              <p className="text-gray-500 text-xs">{m.department ?? '—'}</p>
                            </div>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status]}`}>{m.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'departamentos' && (
                  <div className="space-y-3">
                    {selected.owner_id === user?.id && (
                      <button onClick={() => setShowDeptModal(true)} className="flex items-center gap-2 text-sm text-gray-400 border border-gray-700 hover:border-emerald-700 hover:text-emerald-400 px-3 py-2 rounded-xl transition-colors">
                        <Plus size={14} /> Novo Departamento
                      </button>
                    )}
                    {departments.length === 0 ? (
                      <p className="text-gray-600 text-sm text-center py-6">Nenhum departamento criado ainda</p>
                    ) : (
                      <div className="space-y-2">
                        {departments.map(d => (
                          <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                            <FolderOpen size={15} className="text-emerald-400 shrink-0" />
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{d.nome}</p>
                              {d.descricao && <p className="text-gray-500 text-xs">{d.descricao}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Company Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{editing ? 'Editar Empresa' : 'Nova Empresa'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Nome da empresa *</label>
                <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">NIF / CNPJ</label>
                  <input value={form.nif} onChange={e => setForm({...form, nif: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Setor</label>
                  <select value={form.setor} onChange={e => setForm({...form, setor: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                    {SETORES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} rows={2}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Website</label>
                <input value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              {error && <p className="text-red-400 text-sm flex items-center gap-1.5"><AlertCircle size={14} />{error}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={save} disabled={saving || !form.nome}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeptModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-4">Novo Departamento</h3>
            <input value={deptNome} onChange={e => setDeptNome(e.target.value)} placeholder="Nome do departamento"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowDeptModal(false)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={addDept} disabled={!deptNome.trim()}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
