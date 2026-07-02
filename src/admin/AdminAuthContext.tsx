import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApi, setToken, clearToken, getStoredAdmin, setStoredAdmin, clearStoredAdmin, type AdminUser } from './api';

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
      const { token, admin: a } = await adminApi.login(username, password);
      setToken(token);
      setStoredAdmin(a);
      setAdmin(a);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  };

  const logout = () => {
    clearToken();
    clearStoredAdmin();
    setAdmin(null);
  };

  const isSuperAdmin = admin?.role === 'super_admin';

  return <Ctx.Provider value={{ admin, loading, isSuperAdmin, login, logout }}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
