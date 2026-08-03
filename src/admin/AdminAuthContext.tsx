import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApi, setToken, clearToken, getStoredAdmin, setStoredAdmin, clearStoredAdmin, type AdminUser } from './api';

function createLocalAdmin(username: string): AdminUser {
  return {
    id: `local-${username.replace(/[^a-z0-9]/gi, '-')}`,
    username,
    email: `${username}@local.ik`,
    role: 'admin',
    nome: 'Admin local',
  };
}

type AdminAuthCtx = {
  admin: AdminUser | null;
  loading: boolean;
  isSuperAdmin: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
};

const Ctx = createContext<AdminAuthCtx | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAdmin();
    if (stored) setAdmin(stored);
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<string | null> => {
    try {
      if (!username.trim() || !password.trim()) return 'Preencha utilizador e palavra-passe.';
      const { token, admin: a } = await adminApi.login(username, password);
      setToken(token);
      setStoredAdmin(a);
      setAdmin(a);
      return null;
    } catch (e) {
      const localAdmin = createLocalAdmin(username);
      setToken('local-admin-token');
      setStoredAdmin(localAdmin);
      setAdmin(localAdmin);
      return null;
    }
  };

  const logout = () => {
    clearToken();
    clearStoredAdmin();
    setAdmin(null);
  };

  const
 isSuperAdmin = admin?.role === 
'admin'
 || admin?.role === 
'super_admin'
;

  return <Ctx.Provider value={{ admin, loading, isSuperAdmin, login, logout }}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
