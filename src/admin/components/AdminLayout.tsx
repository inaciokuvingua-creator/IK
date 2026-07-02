import { ReactNode, useState } from 'react';
import {
  Shield, LayoutDashboard, Users, BarChart3, Settings,
  ScrollText, LogOut, Menu, X, TrendingUp, ChevronRight,
  Sparkles, UsersRound, Building2, Crown,
} from 'lucide-react';
import { useAdminAuth } from '../AdminAuthContext';

export type AdminPage =
  | 'dashboard' | 'users' | 'financeiro' | 'settings'
  | 'logs' | 'ai' | 'equipe' | 'empresa';

type Props = { page: AdminPage; onNavigate: (p: AdminPage) => void; children: ReactNode };

const nav: { id: AdminPage; label: string; icon: React.ElementType; superOnly?: boolean }[] = [
  { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'users',      label: 'Utilizadores',       icon: Users },
  { id: 'financeiro', label: 'Financeiro',         icon: BarChart3 },
  { id: 'equipe',     label: 'Minha Equipe',       icon: UsersRound, superOnly: true },
  { id: 'empresa',    label: 'IK Finance Corp.',   icon: Building2 },
  { id: 'ai',         label: 'IK Finance AI',      icon: Sparkles },
  { id: 'settings',   label: 'Configurações',      icon: Settings },
  { id: 'logs',       label: 'Logs / Auditoria',   icon: ScrollText },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  moderator: 'Moderador',
  financeiro: 'Eq. Financeira',
  marketplace: 'Eq. Marketplace',
  suporte: 'Suporte',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'text-red-400 bg-red-950/50 border-red-900/30',
  admin: 'text-amber-400 bg-amber-950/50 border-amber-900/30',
  moderator: 'text-purple-400 bg-purple-950/50 border-purple-900/30',
  financeiro: 'text-emerald-400 bg-emerald-950/50 border-emerald-900/30',
  marketplace: 'text-blue-400 bg-blue-950/50 border-blue-900/30',
  suporte: 'text-gray-400 bg-gray-800 border-gray-700',
};

export default function AdminLayout({ page, onNavigate, children }: Props) {
  const { admin, isSuperAdmin, logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = admin?.role ?? 'admin';
  const roleLabel = ROLE_LABELS[role] ?? role;
  const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS.suporte;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
          <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center shrink-0">
            <Shield size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight">IK FINANCE</p>
            <p className="text-red-400 text-xs font-medium">Painel Administrativo</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-300">
            <X size={18} />
          </button>
        </div>

        {/* Admin identity badge */}
        <div className="mx-3 mt-3 px-4 py-3 bg-gray-800/60 border border-gray-700/50 rounded-2xl">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shrink-0">
              {role === 'super_admin' ? (
                <Crown size={14} className="text-white" />
              ) : (
                <span className="text-white font-bold text-xs">{admin?.nome?.[0] ?? 'A'}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate leading-tight">{admin?.nome}</p>
              <p className="text-gray-500 text-xs truncate">{admin?.email}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${roleColor}`}>
            {role === 'super_admin' && <Crown size={9} />}
            {roleLabel}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 mt-2 overflow-y-auto">
          {nav.filter(n => !n.superOnly || isSuperAdmin).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onNavigate(id); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${page === id ? 'bg-red-600/15 text-red-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              <Icon size={17} />
              {label}
              {page === id && <ChevronRight size={13} className="ml-auto opacity-60" />}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-800 space-y-1">
          <a href="/" target="_blank" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-800 text-xs transition-colors">
            <TrendingUp size={14} /> Ver plataforma
          </a>
          <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-gray-800 text-xs font-medium transition-colors">
            <LogOut size={14} /> Sair do painel
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3.5 bg-gray-900 border-b border-gray-800">
          <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield size={13} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">Admin Panel</span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${roleColor}`}>{roleLabel}</span>
        </header>

        <main className="flex-1 p-5 lg:p-7 max-w-7xl w-full mx-auto overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
