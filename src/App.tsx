import { useState } from 'react';
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
import Negocios from './pages/Negocios';
import Patrimonio from './pages/Patrimonio';
import Relatorios from './pages/Relatorios';
import Financeiro from './pages/Financeiro';
import Configuracoes from './pages/Configuracoes';
import Perfil from './pages/Perfil';
import Empresas from './pages/Empresas';
import Marketplace from './pages/Marketplace';
import MinhaLoja from './pages/MinhaLoja';
import Planos from './pages/Planos';
import Chat from './pages/Chat';
import InstallPrompt from './components/InstallPrompt';
import PWAManager from './components/PWAManager';

export type Page =
  | 'dashboard' | 'cofres' | 'negocios' | 'patrimonio'
  | 'relatorios' | 'financeiro' | 'configuracoes'
  | 'perfil' | 'empresas' | 'marketplace' | 'minha-loja'
  | 'planos' | 'chat';

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
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

  return (
    <>
      <SeasonalOverlay />
      <Layout currentPage={page} onNavigate={setPage}>
        {page === 'dashboard'   && <Dashboard onNavigate={navigate} />}
        {page === 'cofres'      && <Cofres />}
        {page === 'financeiro'  && <Financeiro />}
        {page === 'negocios'    && <Negocios />}
        {page === 'patrimonio'  && <Patrimonio />}
        {page === 'relatorios'  && <Relatorios />}
        {page === 'configuracoes' && <Configuracoes />}
        {page === 'perfil'      && <Perfil />}
        {page === 'empresas'    && <Empresas />}
        {page === 'marketplace' && <Marketplace />}
        {page === 'minha-loja'  && <MinhaLoja />}
        {page === 'planos'      && <Planos />}
        {page === 'chat'        && <Chat />}
      </Layout>
      <AIAssistant currentPage={page} />
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
