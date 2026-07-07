import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProfileProvider } from './context/ProfileContext';
import { AIProvider } from './context/AIContext';
import { AnimationProvider } from './context/AnimationContext';
import Layout from './components/Layout';
import AIAssistant from './components/AIAssistant';
import SeasonalOverlay from './components/SeasonalOverlay';
import Login from './pages/Login';
import HomePage from './pages/Home';
import Dashboard from './pages/Dashboard';
import Cofres from './pages/Cofres';
import Comunidades from './pages/Comunidades';
import Negocios from './pages/Negocios';
import Patrimonio from './pages/Patrimonio';
import Relatorios from './pages/Relatorios';
import Financeiro from './pages/Financeiro';
import Configuracoes from './pages/Configuracoes';
import Perfil from './pages/Perfil';
import UserProfile from './pages/UserProfile';
import StoreProfile from './pages/StoreProfile';
import Empresas from './pages/Empresas';
import Marketplace from './pages/Marketplace';
import MinhaLoja from './pages/MinhaLoja';
import Planos from './pages/Planos';
import Chat from './pages/Chat';
import Search from './pages/Search';
import InstallPrompt from './components/InstallPrompt';
import PWAManager from './components/PWAManager';
import FloatingCalculator from './components/FloatingCalculator';
import IKViewer from './components/IKViewer';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (showAuth) return <Login />;
    return <HomePage onGetStarted={() => setShowAuth(true)} />;
  }

  const navigate = (p: string) => setPage(p as Page);

  useEffect(() => {
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
  }, []);

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
      const page = e?.detail?.page;
      if (!page) return;
      setPage(page as Page);
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

  return (
    <>
      <SeasonalOverlay />
      <Layout currentPage={page} onNavigate={setPage}>
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
