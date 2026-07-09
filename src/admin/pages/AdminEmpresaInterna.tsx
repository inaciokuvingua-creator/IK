import { useCallback, useEffect, useState, useRef } from 'react';
import {
  Building2, Plus, RefreshCw, Check, AlertCircle, X,
  FolderOpen, FileText, MessageSquare, Send, Users,
  BarChart3, Calendar, ChevronRight, Pencil, Circle,
} from 'lucide-react';
import { adminApi, type IKCompanyData, type IKProject, type IKDocument, type IKChatMessage } from '../api';
import { useAdminAuth } from '../AdminAuthContext';

const STATUS_META: Record<string, { label: string; color: string }> = {
  planejamento: { label: 'Planeamento',  color: 'text-blue-400 bg-blue-950/40 border-blue-800/50' },
  em_andamento: { label: 'Em Andamento', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' },
  concluido:    { label: 'Concluído',    color: 'text-gray-400 bg-gray-800 border-gray-700' },
  pausado:      { label: 'Pausado',      color: 'text-amber-400 bg-amber-950/40 border-amber-800/50' },
  cancelado:    { label: 'Cancelado',    color: 'text-red-400 bg-red-950/40 border-red-800/50' },
};

const PRIORIDADE_META: Record<string, { label: string; color: string }> = {
  baixa:   { label: 'Baixa',   color: 'text-gray-400' },
  media:   { label: 'Média',   color: 'text-blue-400' },
  alta:    { label: 'Alta',    color: 'text-amber-400' },
  critica: { label: 'Crítica', color: 'text-red-400' },
};

const CHAT_CHANNELS = [
  { tipo: 'geral',        label: '# geral' },
  { tipo: 'financeiro',   label: '# financeiro' },
  { tipo: 'dev',          label: '# desenvolvimento' },
  { tipo: 'marketing',    label: '# marketing' },
  { tipo: 'suporte',      label: '# suporte' },
  { tipo: 'seguranca',    label: '# segurança' },
  { tipo: 'marketplace',  label: '# marketplace' },
  { tipo: 'rh',           label: '# rh' },
];

const DOC_TIPO_LABELS: Record<string, string> = {
  documento: 'Documento', politica: 'Política', procedimento: 'Procedimento',
  relatorio: 'Relatório', manual: 'Manual', outro: 'Outro',
};

export default function AdminEmpresaInterna() {
  const { admin } = useAdminAuth();
  const [data, setData] = useState<IKCompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'projects' | 'documents' | 'chat'>('overview');
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Projects
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectForm, setProjectForm] = useState({ nome: '', descricao: '', status: 'em_andamento', prioridade: 'media', data_inicio: '', data_fim: '' });
  const [savingProject, setSavingProject] = useState(false);
  const [editProject, setEditProject] = useState<IKProject | null>(null);

  // Documents
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [docForm, setDocForm] = useState({ titulo: '', conteudo: '', tipo: 'documento', visibilidade: 'todos' });
  const [savingDoc, setSavingDoc] = useState(false);

  // Chat
  const [chatChannel, setChatChannel] = useState('geral');
  const [chatMessages, setChatMessages] = useState<IKChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 3000); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await adminApi.company();
      setData(d);
    } catch (e) { showToast(false, (e as Error).message); }
    setLoading(false);
  }, [showToast]);

  const loadChat = useCallback(async (tipo: string) => {
    try {
      const msgs = await adminApi.companyChat(tipo);
      setChatMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { showToast(false, (e as Error).message); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'chat') loadChat(chatChannel); }, [tab, chatChannel, loadChat]);

  const addProject = async () => {
    if (!projectForm.nome) { showToast(false, 'Nome é obrigatório'); return; }
    setSavingProject(true);
    try {
      await adminApi.companyAddProject(projectForm);
      showToast(true, 'Projeto criado!');
      setShowNewProject(false);
      setProjectForm({ nome: '', descricao: '', status: 'em_andamento', prioridade: 'media', data_inicio: '', data_fim: '' });
      load();
    } catch (e) { showToast(false, (e as Error).message); }
    setSavingProject(false);
  };

  const updateProjectProgress = async (proj: IKProject, progresso: number) => {
    try {
      await adminApi.companyEditProject(proj.id, { progresso });
      setData(prev => prev ? { ...prev, projects: prev.projects.map(p => p.id === proj.id ? { ...p, progresso } : p) } : prev);
    } catch (e) { showToast(false, (e as Error).message); }
  };

  const addDocument = async () => {
    if (!docForm.titulo) { showToast(false, 'Título é obrigatório'); return; }
    setSavingDoc(true);
    try {
      await adminApi.companyAddDocument(docForm);
      showToast(true, 'Documento criado!');
      setShowNewDoc(false);
      setDocForm({ titulo: '', conteudo: '', tipo: 'documento', visibilidade: 'todos' });
      load();
    } catch (e) { showToast(false, (e as Error).message); }
    setSavingDoc(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    setSendingChat(true);
    try {
      const msg = await adminApi.companySendChat(chatInput, chatChannel);
      setChatMessages(prev => [...prev, msg]);
      setChatInput('');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { showToast(false, (e as Error).message); }
    setSendingChat(false);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-800 rounded-xl w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-900 border border-gray-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const c = data?.company;
  const departments = data?.departments ?? [];
  const projects = data?.projects ?? [];
  const documents = data?.documents ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shrink-0">
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">IK Finance Corporate</h1>
            <p className="text-gray-500 text-sm">{c?.descricao ?? 'Gestão interna da empresa'}</p>
          </div>
        </div>
        <button onClick={load} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {toast && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit flex-wrap">
        {[
          { id: 'overview',   label: 'Visão Geral',     icon: Building2 },
          { id: 'projects',   label: `Projetos (${projects.length})`, icon: FolderOpen },
          { id: 'documents',  label: `Documentos (${documents.length})`, icon: FileText },
          { id: 'chat',       label: 'Chat Interno',    icon: MessageSquare },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id as typeof tab)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Overview ───────────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Company info */}
          {c && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold">{c.nome}</p>
                  <p className="text-gray-500 text-xs">{c.email} · {c.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'Departamentos', value: departments.length, icon: Users, color: 'text-blue-400' },
                  { label: 'Projetos', value: projects.length, icon: FolderOpen, color: 'text-emerald-400' },
                  { label: 'Documentos', value: documents.length, icon: FileText, color: 'text-amber-400' },
                  { label: 'Projetos Ativos', value: projects.filter(p => p.status === 'em_andamento').length, icon: BarChart3, color: 'text-red-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-center">
                    <Icon size={16} className={`${color} mx-auto mb-1`} />
                    <p className="text-white font-bold text-xl">{value}</p>
                    <p className="text-gray-500 text-xs">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Departments grid */}
          <div>
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Users size={16} className="text-red-400" /> Departamentos
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {departments.map(dept => (
                <div key={dept.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="w-8 h-8 rounded-lg mb-2 flex items-center justify-center" style={{ backgroundColor: dept.cor + '30', border: `1px solid ${dept.cor}50` }}>
                    <Circle size={10} style={{ color: dept.cor, fill: dept.cor }} />
                  </div>
                  <p className="text-white font-semibold text-sm">{dept.nome}</p>
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{dept.descricao}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent projects */}
          {projects.length > 0 && (
            <div>
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FolderOpen size={16} className="text-red-400" /> Projetos Recentes
              </h2>
              <div className="space-y-2">
                {projects.slice(0, 5).map(p => {
                  const sm = STATUS_META[p.status] ?? STATUS_META.em_andamento;
                  return (
                    <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-medium text-sm">{p.nome}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sm.color}`}>{sm.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${p.progresso}%` }} />
                          </div>
                          <span className="text-gray-500 text-xs shrink-0">{p.progresso}%</span>
                        </div>
                      </div>
                      <button onClick={() => { setEditProject(p); setTab('projects'); }} className="text-gray-600 hover:text-white transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Projects ───────────────────────────────────────────────────────────── */}
      {tab === 'projects' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-400 text-sm">{projects.length} projeto{projects.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              <Plus size={15} /> Novo Projeto
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
              <FolderOpen size={28} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhum projeto criado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map(p => {
                const sm = STATUS_META[p.status] ?? STATUS_META.em_andamento;
                const pm = PRIORIDADE_META[p.prioridade] ?? PRIORIDADE_META.media;
                return (
                  <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-white font-semibold">{p.nome}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sm.color}`}>{sm.label}</span>
                          <span className={`text-xs font-semibold ${pm.color}`}>{pm.label}</span>
                        </div>
                        {p.descricao && <p className="text-gray-400 text-sm">{p.descricao}</p>}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          {p.department && <span className="flex items-center gap-1"><Users size={10} />{p.department.nome}</span>}
                          {p.data_inicio && <span className="flex items-center gap-1"><Calendar size={10} />{p.data_inicio}</span>}
                          {p.data_fim && <span>→ {p.data_fim}</span>}
                        </div>
                      </div>
                      <button onClick={() => setEditProject(editProject?.id === p.id ? null : p)} className="text-gray-600 hover:text-white transition-colors">
                        <Pencil size={14} />
                      </button>
                    </div>
                    {/* Progress */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${p.progresso}%` }} />
                      </div>
                      <span className="text-gray-400 text-xs w-8 text-right">{p.progresso}%</span>
                    </div>
                    {/* Progress editor */}
                    {editProject?.id === p.id && (
                      <div className="mt-3 pt-3 border-t border-gray-800">
                        <label className="text-xs text-gray-500 mb-1 block">Progresso (%)</label>
                        <input type="range" min={0} max={100} value={p.progresso}
                          onChange={e => updateProjectProgress(p, parseInt(e.target.value))}
                          className="w-full accent-red-500" />
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Status</label>
                            <select value={p.status} onChange={e => adminApi.companyEditProject(p.id, { status: e.target.value }).then(load)}
                              className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none">
                              {Object.keys(STATUS_META).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Prioridade</label>
                            <select value={p.prioridade} onChange={e => adminApi.companyEditProject(p.id, { prioridade: e.target.value }).then(load)}
                              className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none">
                              {Object.keys(PRIORIDADE_META).map(s => <option key={s} value={s}>{PRIORIDADE_META[s].label}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Documents ──────────────────────────────────────────────────────────── */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-400 text-sm">{documents.length} documento{documents.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowNewDoc(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              <Plus size={15} /> Novo Documento
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
              <FileText size={28} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhum documento criado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map(doc => (
                <div key={doc.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{doc.titulo}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{DOC_TIPO_LABELS[doc.tipo]}</span>
                        {doc.department && <span className="text-xs text-gray-600">{doc.department.nome}</span>}
                      </div>
                    </div>
                  </div>
                  {doc.conteudo && <p className="text-gray-500 text-xs line-clamp-2">{doc.conteudo}</p>}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800/60">
                    <span className="text-gray-600 text-xs">{doc.autor?.nome ?? 'Anónimo'}</span>
                    <span className="text-gray-700 text-xs">{new Date(doc.created_at).toLocaleDateString('pt-AO')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Internal Chat ───────────────────────────────────────────────────────── */}
      {tab === 'chat' && (
        <div className="flex gap-4 h-[500px]">
          {/* Channel list */}
          <div className="w-44 shrink-0 bg-gray-900 border border-gray-800 rounded-2xl p-3 flex flex-col gap-0.5 overflow-y-auto">
            <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-2 mb-2">Canais</p>
            {CHAT_CHANNELS.map(ch => (
              <button key={ch.tipo} onClick={() => setChatChannel(ch.tipo)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${chatChannel === ch.tipo ? 'bg-red-600/20 text-red-400' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}>
                {ch.label}
              </button>
            ))}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
              <MessageSquare size={15} className="text-red-400" />
              <p className="text-white font-semibold text-sm">{CHAT_CHANNELS.find(c => c.tipo === chatChannel)?.label}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={24} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.admin_id === admin?.id;
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center shrink-0 text-white font-bold text-xs">
                        {msg.admin_nome[0]}
                      </div>
                      <div className={`max-w-xs ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isMe && <span className="text-gray-500 text-xs mb-0.5">{msg.admin_nome}</span>}
                        <div className={`px-3.5 py-2 rounded-2xl text-sm ${isMe ? 'bg-red-600 text-white rounded-tr-sm' : 'bg-gray-800 text-gray-200 rounded-tl-sm'}`}>
                          {msg.mensagem}
                        </div>
                        <span className="text-gray-700 text-[10px] mt-0.5">
                          {new Date(msg.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-800 flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder={`Mensagem em ${CHAT_CHANNELS.find(c => c.tipo === chatChannel)?.label}...`}
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors placeholder-gray-600"
              />
              <button onClick={sendChat} disabled={sendingChat || !chatInput.trim()}
                className="p-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl transition-colors">
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Project Modal ─────────────────────────────────────────────────── */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Novo Projeto</h3>
              <button onClick={() => setShowNewProject(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome *</label>
                <input value={projectForm.nome} onChange={e => setProjectForm({ ...projectForm, nome: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
                <textarea value={projectForm.descricao} onChange={e => setProjectForm({ ...projectForm, descricao: e.target.value })} rows={2}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Status</label>
                  <select value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 transition-colors">
                    {Object.keys(STATUS_META).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Prioridade</label>
                  <select value={projectForm.prioridade} onChange={e => setProjectForm({ ...projectForm, prioridade: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 transition-colors">
                    {Object.keys(PRIORIDADE_META).map(s => <option key={s} value={s}>{PRIORIDADE_META[s].label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Início</label>
                  <input type="date" value={projectForm.data_inicio} onChange={e => setProjectForm({ ...projectForm, data_inicio: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Prazo</label>
                  <input type="date" value={projectForm.data_fim} onChange={e => setProjectForm({ ...projectForm, data_fim: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 transition-colors" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNewProject(false)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={addProject} disabled={savingProject}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {savingProject ? 'Criando...' : 'Criar Projeto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Document Modal ────────────────────────────────────────────────── */}
      {showNewDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Novo Documento</h3>
              <button onClick={() => setShowNewDoc(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Título *</label>
                <input value={docForm.titulo} onChange={e => setDocForm({ ...docForm, titulo: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Conteúdo</label>
                <textarea value={docForm.conteudo} onChange={e => setDocForm({ ...docForm, conteudo: e.target.value })} rows={4}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select value={docForm.tipo} onChange={e => setDocForm({ ...docForm, tipo: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 transition-colors">
                    {Object.entries(DOC_TIPO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Visibilidade</label>
                  <select value={docForm.visibilidade} onChange={e => setDocForm({ ...docForm, visibilidade: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 transition-colors">
                    <option value="todos">Todos</option>
                    <option value="admin">Admins</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="dev">Desenvolvimento</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNewDoc(false)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={addDocument} disabled={savingDoc}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {savingDoc ? 'Criando...' : 'Criar Documento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
