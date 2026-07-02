import { useState } from 'react';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext';
import AdminLogin from './pages/AdminLogin';
import AdminLayout, { type AdminPage } from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminFinanceiro from './pages/AdminFinanceiro';
import AdminSettings from './pages/AdminSettings';
import AdminLogs from './pages/AdminLogs';
import AdminAI from './pages/AdminAI';
import AdminEquipe from './pages/AdminEquipe';
import AdminEmpresaInterna from './pages/AdminEmpresaInterna';

function AdminContent() {
  const { admin, loading } = useAdminAuth();
  const [page, setPage] = useState<AdminPage>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!admin) return <AdminLogin />;

  return (
    <AdminLayout page={page} onNavigate={setPage}>
      {page === 'dashboard'  && <AdminDashboard />}
      {page === 'users'      && <AdminUsers />}
      {page === 'financeiro' && <AdminFinanceiro />}
      {page === 'equipe'     && <AdminEquipe />}
      {page === 'empresa'    && <AdminEmpresaInterna />}
      {page === 'ai'         && <AdminAI />}
      {page === 'settings'   && <AdminSettings />}
      {page === 'logs'       && <AdminLogs />}
    </AdminLayout>
  );
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminContent />
    </AdminAuthProvider>
  );
}
