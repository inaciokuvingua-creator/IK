import { useState, useRef, useEffect } from 'react';
import {
  TrendingUp, LayoutDashboard, Vault, Briefcase, Building2 as BuildingIcon,
  BarChart3, Wallet, LogOut, Menu, X, ChevronDown, RefreshCw,
  Bell, Settings, User, ShoppingBag, Store, CreditCard, MessageCircle,
  Users, Search, LineChart, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCurrency, CURRENCIES, type CurrencyCode } from '../context/CurrencyContext';
import { useNotifications } from '../context/NotificationContext';
import { useProfile, getTrialDaysLeft, isTrialExpired } from '../context/ProfileContext';
import LanguageSwitcher from './LanguageSwitcher';
import type { Page } from '../App';

type Props = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onBack?: () => void;
  onForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  children: React.ReactNode;
};

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  cofres: 'Cofres',
  negocios: 'Negócios',
  patrimonio: 'Património',
  relatorios: 'Relatórios',
  financeiro: 'Financeiro',
  configuracoes: 'Configurações',
  perfil: 'Perfil',
  empresas: 'Empresas',
  marketplace: 'Marketplace',
  'minha-loja': 'Minha Loja',
  planos: 'Planos',
  chat: 'Mensagens',
  comunidades: 'Comunidades',
  search: 'Pesquisa',
  userProfile: 'Perfil',
  storeProfile: 'Loja',
  trade: 'Trade',
  post: 'Publicação',
};

export default function Layout({
  currentPage,
  onNavigate,
  onBack,
  onForward,
  canGoBack = false,
  canGoForward = false,
  children,
}: Props) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { currency, setCurrencyCode, ratesLoading, lastUpdated } = useCurrency();
  const { unreadCount, notifications, markAllRead } = useNotifications();
  const { profile } = useProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const NAV_GROUPS = [
    {
      label: t('nav.financas'),
      items: [
        { id: 'dashboard' as Page,  label: t('nav.dashboard'),   icon: LayoutDashboard },
        { id: 'cofres' as Page,     label: t('nav.cofres'),       icon: Vault },
        { id: 'financeiro' as Page, label: t('nav.financeiro'),   icon: Wallet },
        { id: 'negocios' as Page,   label: t('nav.negocios'),     icon: Briefcase },
        { id: 'patrimonio' as Page, label: t('nav.patrimonio'),   icon: BuildingIcon },
        { id: 'relatorios' as Page, label: t('nav.relatorios'),   icon: BarChart3 },
        { id: 'trade'      as Page, label: 'Trade',               icon: LineChart },
      ],
    },
    {
      label: t('nav.ecossistema'),
      items: [
        { id: 'marketplace' as Page, label: t('nav.marketplace'),  icon: ShoppingBag },
        { id: 'minha-loja' as Page,  label: t('nav.minhaLoja'),    icon: Store },
        { id: 'search' as Page,      label: t('nav.search'),       icon: Search },
        { id: 'comunidades' as Page, label: t('nav.comunidades'),  icon: Users },
        { id: 'empresas' as Page,    label: t('nav.empresas'),      icon: BuildingIcon },
        { id: 'chat' as Page,        label: t('nav.mensagens'),     icon: MessageCircle },
      ],
    },
  ];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setCurrencyOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNavigate = (page: Page) => { onNavigate(page); setMobileOpen(false); };

  const handleNotifOpen = () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen && unreadCount > 0) markAllRead();
  };

  const PLAN_COLORS: Record<string, string> = {
    free: 'text-gray-500', premium: 'text-amber-400',
    business: 'text-blue-400', enterprise: 'text-purple-400',
  };
  const daysLeft = getTrialDaysLeft(profile);
  const trialExpired = isTrialExpired(profile);
  const inTrial = profile?.plan === 'free' && profile?.trial_active && !trialExpired;

  const pageTitle = PAGE_TITLES[currentPage] ?? 'IK Finance';

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-40 w-60 sm:w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
          <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="text-white font-bold tracking-tight">IK FINANCE</span>
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden text-gray-500 hover:text-gray-300">
            <X size={18} />
          </button>
        </div>

        {/* Currency selector */}
        <div className="px-3 pt-3" ref={currencyRef}>
          <p className="text-xs text-gray-600 font-medium px-2 mb-1.5 uppercase tracking-wider">{t('nav.moeda')}</p>
          <div className="relative">
            <button
              onClick={() => setCurrencyOpen(!currencyOpen)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors"
            >
              <span className="text-base leading-none">{currency.flag}</span>
              <div className="flex-1 text-left min-w-0">
                <p className="text-white text-sm font-semibold">{currency.symbol} · {currency.code}</p>
                <p className="text-gray-500 text-xs truncate">{currency.name}</p>
              </div>
              {ratesLoading
                ? <RefreshCw size={13} className="text-gray-500 animate-spin shrink-0" />
                : <ChevronDown size={13} className={`text-gray-500 shrink-0 transition-transform ${currencyOpen ? 'rotate-180' : ''}`} />
              }
            </button>

            {currencyOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl z-50 max-h-72 overflow-y-auto">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => { setCurrencyCode(c.code as CurrencyCode); setCurrencyOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-700 transition-colors ${currency.code === c.code ? 'bg-emerald-500/10' : ''}`}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${currency.code === c.code ? 'text-emerald-400' : 'text-white'}`}>{c.symbol} · {c.code}</p>
                      <p className="text-gray-500 text-xs truncate">{c.name}</p>
                    </div>
                    {currency.code === c.code && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                  </button>
                ))}
                {lastUpdated && (
                  <div className="px-3 py-2 border-t border-gray-700 flex items-center gap-1.5">
                    <RefreshCw size={10} className="text-gray-600" />
                    <p className="text-gray-600 text-xs">{t('nav.taxa')}: {lastUpdated.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 p-3 space-y-4 mt-2 overflow-y-auto overscroll-contain">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider px-2 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleNavigate(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover-lift ${currentPage === id ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                  >
                    <Icon size={17} />
                    <span className="truncate">{label}</span>
                    {id === 'chat' && unreadCount > 0 && (
                      <span className="ml-auto bg-emerald-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: Language + Account + Settings */}
        <div className="p-3 border-t border-gray-800 space-y-0.5 shrink-0">
          <div className="px-1 pb-1">
            <LanguageSwitcher variant="sidebar" />
          </div>
          <button onClick={() => handleNavigate('planos')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${currentPage === 'planos' ? 'bg-emerald-500/10 text-emerald-400' : trialExpired ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <CreditCard size={17} />
            <span className="truncate">{t('nav.planos')}</span>
            {inTrial && daysLeft <= 14 && (
              <span className="ml-auto text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-600/30 px-1.5 py-0.5 rounded-lg shrink-0">{daysLeft}d</span>
            )}
            {trialExpired && !inTrial && (
              <span className="ml-auto text-xs font-bold bg-red-500/20 text-red-400 border border-red-600/30 px-1.5 py-0.5 rounded-lg shrink-0">!</span>
            )}
            {!inTrial && !trialExpired && profile && (
              <span className={`ml-auto text-xs font-bold capitalize shrink-0 ${PLAN_COLORS[profile.plan]}`}>{profile.plan}</span>
            )}
          </button>
          <button onClick={() => handleNavigate('perfil')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${currentPage === 'perfil' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <User size={17} />
            <span className="truncate">{t('nav.perfil')}</span>
            {profile?.verified && <span className="ml-auto text-blue-400 text-xs shrink-0">✓</span>}
          </button>
          <button onClick={() => handleNavigate('configuracoes')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${currentPage === 'configuracoes' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <Settings size={17} />
            <span className="truncate">{t('nav.configuracoes')}</span>
          </button>

          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mt-1">
            <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-xs text-gray-300 font-semibold">{(profile?.nome ?? user?.email ?? 'U')[0].toUpperCase()}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 truncate">{profile?.nome || user?.email}</p>
              {profile && <p className={`text-[10px] capitalize font-medium ${PLAN_COLORS[profile.plan]}`}>{profile.plan}</p>}
            </div>
            <button onClick={signOut} className="text-gray-500 hover:text-red-400 transition-colors shrink-0" title={t('nav.sair')}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Cabeçalho unificado — todos os dispositivos */}
        <header className="sticky top-0 z-20 flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-gray-900/95 backdrop-blur border-b border-gray-800">
          {/* Botão menu (mobile) */}
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800 shrink-0">
            <Menu size={20} />
          </button>

          {/* Voltar / Avançar */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onBack}
              disabled={!canGoBack}
              title="Voltar"
              className="p-2 text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-gray-800"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={onForward}
              disabled={!canGoForward}
              title="Avançar"
              className="p-2 text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-gray-800"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Título da página atual */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-white font-semibold text-sm sm:text-base truncate">{pageTitle}</h1>
          </div>

          {/* Logo compacto (mobile) */}
          <div className="lg:hidden flex items-center gap-1.5 shrink-0">
            <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUp size={13} className="text-white" />
            </div>
          </div>

          <LanguageSwitcher variant="compact" />

          {/* Sino de notificações */}
          <div className="relative" ref={notifRef}>
            <button onClick={handleNotifOpen} className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800 shrink-0">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">{t('nav.notificacoes')}</p>
                  <button onClick={() => handleNavigate('configuracoes')} className="text-xs text-emerald-400 hover:text-emerald-300">{t('nav.configurar')}</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-6">{t('nav.semNotificacoes')}</p>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <div key={n.id} className={`flex gap-2.5 px-4 py-3 border-b border-gray-800/50 last:border-0 ${!n.lida ? 'bg-emerald-950/10' : ''}`}>
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!n.lida ? 'bg-emerald-400' : 'bg-gray-700'}`} />
                        <div>
                          <p className="text-white text-xs font-medium">{n.titulo}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{n.corpo}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Currency badge compacto */}
          <button onClick={() => setMobileOpen(true)} className="hidden sm:flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 shrink-0">
            <span className="text-sm leading-none">{currency.flag}</span>
            <span className="text-xs font-semibold text-white">{currency.code}</span>
          </button>
        </header>

        {/* Conteúdo — preenche o espaço disponível em todos os dispositivos */}
        <main className="flex-1 p-3 sm:p-5 lg:p-7 w-full max-w-7xl mx-auto overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
