import { lazy, Suspense, useEffect, useState } from 'react';
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

// Páginas carregadas de forma lazy para reduzir o bundle inicial
const Login        = lazy(() => import('./pages/Login'));
const HomePage     = lazy(() => import('./pages/Home'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Cofres       = lazy(() => import('./pages/Cofres'));
const Comunidades  = lazy(() => import('./pages/Comunidades'));
const Negocios     = lazy(() => import('./pages/Negocios'));
const Patrimonio   = lazy(() => import('./pages/Patrimonio'));
const Relatorios   = lazy(() => import('./pages/Relatorios'));
const Financeiro   = lazy(() => import('./pages/Financeiro'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Perfil       = lazy(() => import('./pages/Perfil'));
const UserProfile  = lazy(() => import('./pages/UserProfile'));
const StoreProfile = lazy(() => import('./pages/StoreProfile'));
const Empresas     = lazy(() => import('./pages/Empresas'));
const Marketplace  = lazy(() => import('./pages/Marketplace'));
const MinhaLoja    = lazy(() => import('./pages/MinhaLoja'));
const Planos       = lazy(() => import('./pages/Planos'));
const Chat         = lazy(() => import('./pages/Chat'));
const Search       = lazy(() => import('./pages/Search'));

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

function AppContent() {
  const { user, loading } = useAuth();
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
      setPage(pg as Page);
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

  const navigate = (p: string) => setPage(p as Page);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (showAuth) return <Suspense fallback={<PageLoader />}><Login /></Suspense>;
    return <Suspense fallback={<PageLoader />}><HomePage onGetStarted={() => setShowAuth(true)} /></Suspense>;
  }

  return (
    <>
      <SeasonalOverlay />
      <Layout currentPage={page} onNavigate={setPage}>
        <Suspense fallback={<PageLoader />}>
          {page === 'dashboard'   && <Dashboard onNavigate={navigate} />}
          {page === 'cofres'      && <Cofres />}
          {page === 'comunidades' && <Comunidades />}
          {page === 'financeiro'  && <Financeiro />}
          {page === 'negocios'    && <Negocios />}
          {page === 'patrimonio'  && <Patrimonio />}
          {page === 'relatorios'  && <Relatorios />}
          {page === 'configuracoes' && <Configuracoes />}
          {page === 'perfil'      && <Perfil />}
          {page === 'userProfile' && <UserProfile userId={userProfileId} />}
          {page === 'storeProfile' && <StoreProfile storeId={storeProfileId} />}
          {page === 'search' && <Search />}
          {page === 'empresas'    && <Empresas />}
          {page === 'marketplace' && <Marketplace onNavigate={navigate} initialProductId={marketplaceProductId ?? undefined} />}
          {page === 'minha-loja'  && <MinhaLoja onNavigate={navigate} />}
          {page === 'planos'      && <Planos />}
          {page === 'chat'        && <Chat initialUserId={chatTargetId ?? undefined} />}
        </Suspense>
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
