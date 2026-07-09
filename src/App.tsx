import { Component, lazy, Suspense, useEffect, useState, type ComponentType, type ErrorInfo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProfileProvider } from './context/ProfileContext';
import { AIProvider } from './context/AIContext';
import { AnimationProvider } from './context/AnimationContext';
import Layout from './components/Layout';
import AIAssistant from './components/AIAssistant';
import SeasonalOverlay from './components/SeasonalOverlay';
import InstallPrompt from './components/InstallPrompt';
import PWAManager from './components/PWAManager';
import FloatingCalculator from './components/FloatingCalculator';
import IKViewer from './components/IKViewer';

function lazyWithRetry<T extends { default: ComponentType<any> }>(
  importer: () => Promise<T>,
  cacheKey: string,
) {
  return lazy(async () => {
    try {
      const mod = await importer();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`lazy-retry:${cacheKey}`);
      }
      return mod;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isChunkLoadError = /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);

      if (typeof window !== 'undefined' && isChunkLoadError) {
        const retryKey = `lazy-retry:${cacheKey}`;
        if (!sessionStorage.getItem(retryKey)) {
          sessionStorage.setItem(retryKey, '1');
          window.location.reload();
          return new Promise<T>(() => undefined);
        }
      }

      throw error;
    }
  });
}

class PageErrorBoundary extends Component<
  { children: React.ReactNode; onGoDashboard: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageErrorBoundary] page render failed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto mt-10 bg-gray-900 border border-red-900/60 rounded-2xl p-6 text-center">
          <h2 className="text-white text-lg font-semibold">Nao foi possivel abrir esta pagina</h2>
          <p className="text-gray-400 text-sm mt-2">
            Ocorreu um erro ao carregar esta area. Atualize a pagina ou volte ao dashboard.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              Atualizar
            </button>
            <button
              onClick={this.props.onGoDashboard}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors border border-gray-700"
            >
              Ir para dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Páginas carregadas de forma lazy para reduzir o bundle inicial
const Login         = lazyWithRetry(() => import('./pages/Login'), 'login');
const HomePage      = lazyWithRetry(() => import('./pages/Home'), 'home');
const Dashboard     = lazyWithRetry(() => import('./pages/Dashboard'), 'dashboard');
const Cofres        = lazyWithRetry(() => import('./pages/Cofres'), 'cofres');
const Comunidades   = lazyWithRetry(() => import('./pages/Comunidades'), 'comunidades');
const Negocios      = lazyWithRetry(() => import('./pages/Negocios'), 'negocios');
const Patrimonio    = lazyWithRetry(() => import('./pages/Patrimonio'), 'patrimonio');
const Relatorios    = lazyWithRetry(() => import('./pages/Relatorios'), 'relatorios');
const Financeiro    = lazyWithRetry(() => import('./pages/Financeiro'), 'financeiro');
const Configuracoes = lazyWithRetry(() => import('./pages/Configuracoes'), 'configuracoes');
const Perfil        = lazyWithRetry(() => import('./pages/Perfil'), 'perfil');
const UserProfile   = lazyWithRetry(() => import('./pages/UserProfile'), 'user-profile');
const StoreProfile  = lazyWithRetry(() => import('./pages/StoreProfile'), 'store-profile');
const Empresas      = lazyWithRetry(() => import('./pages/Empresas'), 'empresas');
const Marketplace   = lazyWithRetry(() => import('./pages/Marketplace'), 'marketplace');
const MinhaLoja     = lazyWithRetry(() => import('./pages/MinhaLoja'), 'minha-loja');
const Planos        = lazyWithRetry(() => import('./pages/Planos'), 'planos');
const Chat          = lazyWithRetry(() => import('./pages/Chat'), 'chat');
const Search        = lazyWithRetry(() => import('./pages/Search'), 'search');

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export type Page =
  | 'dashboard' | 'cofres' | 'negocios' | 'patrimonio'
  | 'relatorios' | 'financeiro' | 'configuracoes'
  | 'perfil' | 'empresas' | 'marketplace' | 'minha-loja'
  | 'planos' | 'chat' | 'comunidades' | 'search' | 'userProfile' | 'storeProfile';

const VALID_PAGES: Page[] = [
  'dashboard', 'cofres', 'negocios', 'patrimonio', 'relatorios', 'financeiro',
  'configuracoes', 'perfil', 'empresas', 'marketplace', 'minha-loja', 'planos',
  'chat', 'comunidades', 'search', 'userProfile', 'storeProfile',
];

function isPage(value: string): value is Page {
  return VALID_PAGES.includes(value as Page);
}

function AppContent() {
  const { user, loading, isPasswordRecovery } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [storeProfileId, setStoreProfileId] = useState<string | null>(null);
  const [marketplaceProductId, setMarketplaceProductId] = useState<string | null>(null);
  const [chatTargetId, setChatTargetId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // All hooks must be declared before any conditional return (Rules of Hooks)
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const requestedPage = params.get('page');
    const marketplaceView = params.get('view');
    const productId = params.get('product');
    const storeId = params.get('store');
    if (requestedPage === 'marketplace') {
      setPage('marketplace');
      if (marketplaceView === 'product' && productId) setMarketplaceProductId(productId);
      if (marketplaceView === 'store' && storeId) {
        setStoreProfileId(storeId);
        setPage('storeProfile');
      }
      return;
    }
    if (requestedPage === 'chat') {
      setPage('chat');
    }
  }, [user]);

  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail?.id;
      if (!id) return;
      setUserProfileId(id);
      setPage('userProfile');
    };
    window.addEventListener('openUserProfile', handler as EventListener);
    return () => window.removeEventListener('openUserProfile', handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail?.id;
      if (!id) return;
      setStoreProfileId(id);
      setPage('storeProfile');
    };
    window.addEventListener('openStoreProfile', handler as EventListener);
    return () => window.removeEventListener('openStoreProfile', handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail?.id;
      if (!id) return;
      setMarketplaceProductId(id);
      setPage('marketplace');
    };
    window.addEventListener('openMarketplaceProduct', handler as EventListener);
    return () => window.removeEventListener('openMarketplaceProduct', handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const pg = e?.detail?.page;
      if (!pg) return;
      setPage(isPage(pg) ? pg : 'dashboard');
    };
    window.addEventListener('navigatePage', handler as EventListener);
    return () => window.removeEventListener('navigatePage', handler as EventListener);
  }, []);

  useEffect(() => {
    const h2 = () => setPage('chat');
    window.addEventListener('openChat', h2 as EventListener);
    return () => window.removeEventListener('openChat', h2 as EventListener);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail?.id;
      if (!id) return;
      setChatTargetId(id);
      setPage('chat');
    };
    window.addEventListener('openChatWith', handler as EventListener);
    return () => window.removeEventListener('openChatWith', handler as EventListener);
  }, []);

  const navigate = (p: string) => setPage(isPage(p) ? p : 'dashboard');

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />;
      case 'cofres': return <Cofres />;
      case 'comunidades': return <Comunidades />;
      case 'financeiro': return <Financeiro />;
      case 'negocios': return <Negocios />;
      case 'patrimonio': return <Patrimonio />;
      case 'relatorios': return <Relatorios />;
      case 'configuracoes': return <Configuracoes />;
      case 'perfil': return <Perfil />;
      case 'userProfile': return <UserProfile userId={userProfileId} />;
      case 'storeProfile': return <StoreProfile storeId={storeProfileId} />;
      case 'search': return <Search />;
      case 'empresas': return <Empresas />;
      case 'marketplace': return <Marketplace onNavigate={navigate} initialProductId={marketplaceProductId ?? undefined} />;
      case 'minha-loja': return <MinhaLoja onNavigate={navigate} />;
      case 'planos': return <Planos />;
      case 'chat': return <Chat initialUserId={chatTargetId ?? undefined} />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPasswordRecovery) {
    return <Suspense fallback={<PageLoader />}><Login forceReset /></Suspense>;
  }

  if (!user) {
    if (showAuth) return <Suspense fallback={<PageLoader />}><Login /></Suspense>;
    return <Suspense fallback={<PageLoader />}><HomePage onGetStarted={() => setShowAuth(true)} /></Suspense>;
  }

  return (
    <>
      <SeasonalOverlay />
      <Layout currentPage={page} onNavigate={setPage}>
        <PageErrorBoundary key={page} onGoDashboard={() => setPage('dashboard')}>
          <Suspense fallback={<PageLoader />}>
            {renderPage()}
          </Suspense>
        </PageErrorBoundary>
      </Layout>
      <AIAssistant currentPage={page} />
      <FloatingCalculator />
      <IKViewer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <NotificationProvider>
          <ProfileProvider>
            <AnimationProvider>
              <AIProvider>
                <PWAManager />
                <AppContent />
                <InstallPrompt />
              </AIProvider>
            </AnimationProvider>
          </ProfileProvider>
        </NotificationProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
