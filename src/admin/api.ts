// Admin API client — all requests go through the admin-api edge function
const BASE = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/admin-api`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const TOKEN_KEY = 'ik_admin_token';

export type AdminUser = { id: string; username: string; nome: string; email: string; role?: string };

function getToken() { return localStorage.getItem(TOKEN_KEY) ?? ''; }
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }
export function getStoredAdmin(): AdminUser | null {
  try { return JSON.parse(localStorage.getItem('ik_admin_user') ?? 'null'); } catch { return null; }
}
export function setStoredAdmin(a: AdminUser) { localStorage.setItem('ik_admin_user', JSON.stringify(a)); }
export function clearStoredAdmin() { localStorage.removeItem('ik_admin_user'); }

async function req<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON}`,
      Apikey: ANON,
      'X-Admin-Token': getToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido');
  return data as T;
}

export const adminApi = {
  login: (username: string, password: string) =>
    req<{ token: string; admin: AdminUser }>('POST', '/login', { username, password }),

  stats: () => req<AdminStats>('GET', '/stats'),

  users: (search = '', page = 1) =>
    req<{ users: AdminUserRow[]; total: number }>('GET', `/users?search=${encodeURIComponent(search)}&page=${page}`),
  getUser: (id: string) => req<UserDetail>('GET', `/users/${id}`),
  editUser: (id: string, email: string) => req<{ ok: boolean }>('PUT', `/users/${id}`, { email }),
  suspendUser: (id: string) => req<{ ok: boolean }>('POST', `/users/${id}/suspend`),
  unsuspendUser: (id: string) => req<{ ok: boolean }>('POST', `/users/${id}/unsuspend`),
  deleteUser: (id: string) => req<{ ok: boolean }>('DELETE', `/users/${id}`),

  records: (params: RecordParams) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, String(v)); });
    return req<{ data: Record<string, unknown>[]; total: number }>('GET', `/records?${q}`);
  },
  editRecord: (tabela: string, id: string, body: object) => req<{ ok: boolean }>('PUT', `/records/${tabela}/${id}`, body),
  deleteRecord: (tabela: string, id: string) => req<{ ok: boolean }>('DELETE', `/records/${tabela}/${id}`),

  settings: () => req<SystemSetting[]>('GET', '/settings'),
  saveSettings: (updates: Array<{ chave: string; valor: string }>) => req<{ ok: boolean }>('PUT', '/settings', updates),

  logs: (page = 1) => req<{ logs: AdminLog[]; total: number }>('GET', `/logs?page=${page}`),
  marketplaceModeration: (status = 'pending', page = 1) => req<{ queue: MarketplaceModerationItem[]; reports: MarketplaceReportItem[]; totalQueue: number; totalReports: number }>('GET', `/marketplace/moderation?status=${status}&page=${page}`),
  marketplaceModerationUpdate: (id: string, body: { status: string; note?: string }) => req<{ ok: boolean }>('POST', `/marketplace/moderation/${id}`, body),
  marketplaceReportUpdate: (id: string, body: { status: string }) => req<{ ok: boolean }>('POST', `/marketplace/reports/${id}`, body),
  changePassword: (current_password: string, new_password: string) =>
    req<{ ok: boolean }>('POST', '/change-password', { current_password, new_password }),

  // ── Team ─────────────────────────────────────────────────────────────────────
  team: () => req<AdminTeamMember[]>('GET', '/team'),
  teamInvite: (body: { email: string; nome: string; role: string; department?: string }) =>
    req<AdminTeamInvite>('POST', '/team/invite', body),
  teamInvites: () => req<AdminTeamInvite[]>('GET', '/team/invites'),
  teamEdit: (id: string, body: { role?: string; department?: string; ativo?: boolean }) =>
    req<AdminTeamMember>('PUT', `/team/${id}`, body),
  teamRemove: (id: string) => req<{ ok: boolean }>('DELETE', `/team/${id}`),

  // ── Roles ────────────────────────────────────────────────────────────────────
  roles: () => req<AdminRole[]>('GET', '/roles'),
  roleEdit: (id: string, body: { nome: string; descricao: string; permissions: Record<string, boolean>; cor: string }) =>
    req<AdminRole>('PUT', `/roles/${id}`, body),

  // ── IK Corporate ─────────────────────────────────────────────────────────────
  company: () => req<IKCompanyData>('GET', '/company'),
  companyEdit: (body: Partial<IKCompany>) => req<IKCompany>('PUT', '/company', body),
  companyAddDept: (body: { nome: string; descricao?: string; cor?: string }) =>
    req<IKDepartment>('POST', '/company/departments', body),
  companyAddProject: (body: Partial<IKProject>) =>
    req<IKProject>('POST', '/company/projects', body),
  companyEditProject: (id: string, body: Partial<IKProject>) =>
    req<IKProject>('PUT', `/company/projects/${id}`, body),
  companyAddDocument: (body: Partial<IKDocument>) =>
    req<IKDocument>('POST', '/company/documents', body),
  companyChat: (tipo = 'geral') => req<IKChatMessage[]>('GET', `/company/chat?tipo=${tipo}`),
  companySendChat: (mensagem: string, tipo = 'geral') =>
    req<IKChatMessage>('POST', '/company/chat', { mensagem, tipo }),
  companyActivity: (page = 1) => req<{ logs: AdminActivityLog[]; total: number }>('GET', `/company/activity?page=${page}`),

  // ── Plan requests ─────────────────────────────────────────────────────────
  planRequests: (status = '', page = 1) =>
    req<{ requests: PlanRequest[]; total: number }>('GET', `/plans/requests?status=${status}&page=${page}`),
  planRequestUpdate: (id: string, body: { status?: string; admin_nota?: string; plan?: string }) =>
    req<PlanRequest>('PUT', `/plans/requests/${id}`, body),
};

// ── Types ────────────────────────────────────────────────────────────────────

export type AdminStats = {
  users: { total: number; newToday: number; newWeek: number; newMonth: number; activeMonth: number };
  financeiro: { totalReceitas: number; totalDespesas: number; saldo: number };
  transacoes: { total: number; hoje: number };
  dailyNew: Array<{ date: string; count: number }>;
};

export type AdminUserRow = {
  id: string; email: string; created_at: string; last_sign_in_at?: string;
  banned: boolean; transacoes: number; saldo_cofres: number; negocios: number;
};

export type UserDetail = {
  user: { id: string; email: string; created_at: string; last_sign_in_at?: string; banned_until?: string };
  transacoes: Record<string, unknown>[];
  cofres: Record<string, unknown>[];
  negocios: Record<string, unknown>[];
  patrimonio: Record<string, unknown>[];
};

export type RecordParams = {
  tabela: string; user_id?: string; categoria?: string;
  data_inicio?: string; data_fim?: string; page?: number;
};

export type SystemSetting = { id: string; chave: string; valor: string; descricao?: string; updated_at: string };

export type AdminLog = {
  id: string; admin_nome: string; acao: string; entidade: string;
  entidade_id?: string; detalhes?: Record<string, unknown>; created_at: string;
};

export type AdminTeamMember = {
  id: string; username: string; nome: string; email: string;
  role: string; department: string | null; ativo: boolean;
  last_login: string | null; invite_status: string | null; created_at: string;
};

export type AdminTeamInvite = {
  id: string; email: string; nome: string; role: string;
  department: string | null; status: string; token: string;
  expires_at: string; created_at: string;
};

export type AdminRole = {
  id: string; nome: string; slug: string; descricao: string | null;
  permissions: Record<string, boolean>; cor: string; created_at: string;
};

export type IKCompany = {
  id: string; nome: string; descricao: string | null; email: string | null;
  phone: string | null; website: string | null; address: string | null;
  founded_at: string | null; logo_url: string | null; meta: Record<string, unknown>;
};

export type IKDepartment = {
  id: string; nome: string; descricao: string | null; cor: string;
  manager_id: string | null; manager?: { nome: string } | null; created_at: string;
};

export type IKProject = {
  id: string; nome: string; descricao: string | null;
  status: string; prioridade: string; progresso: number;
  department_id: string | null; responsavel_id: string | null;
  department?: { nome: string } | null; responsavel?: { nome: string } | null;
  data_inicio: string | null; data_fim: string | null;
  created_at: string; updated_at: string;
};

export type IKDocument = {
  id: string; titulo: string; conteudo: string; tipo: string;
  department_id: string | null; visibilidade: string; tags: string[];
  autor_id: string | null; autor?: { nome: string } | null;
  department?: { nome: string } | null; created_at: string; updated_at: string;
};

export type IKChatMessage = {
  id: string; admin_id: string; admin_nome: string;
  mensagem: string; tipo: string; created_at: string;
};

export type IKCompanyData = {
  company: IKCompany | null;
  departments: IKDepartment[];
  projects: IKProject[];
  documents: IKDocument[];
};

export type AdminActivityLog = {
  id: string; admin_id: string | null; admin_nome: string; admin_role: string | null;
  acao: string; modulo: string; entidade: string;
  entidade_id: string | null; detalhes: Record<string, unknown> | null; created_at: string;
};

export type PlanRequest = {
  id: string; user_id: string; user_email: string; user_nome: string | null;
  plan: string; billing: string; preco: number; moeda: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  mensagem: string | null; admin_nota: string | null;
  admin_id: string | null; admin_nome: string | null;
  whatsapp: string | null; reviewed_at: string | null; created_at: string;
};

export type MarketplaceModerationItem = {
  id: string;
  entity_type: string;
  entity_id: string;
  owner_id: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  priority: 'low' | 'normal' | 'high';
  source: string;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  reviewed_at: string | null;
};

export type MarketplaceReportItem = {
  id: string;
  reporter_id: string | null;
  entity_type: string;
  entity_id: string;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
};
