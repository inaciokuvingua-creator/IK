import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type AiMessage = { role: 'user' | 'assistant'; content: string; ts?: number };
export type AiContext = 'geral' | 'financeiro' | 'empresarial' | 'marketplace';

export type AiPrivacySettings = {
  enabled: boolean;
  allowFinancialData: boolean;
  allowBusinessData: boolean;
};

type AiCtx = {
  enabled: boolean;
  privacy: AiPrivacySettings;
  updatePrivacy: (p: Partial<AiPrivacySettings>) => void;
  sendMessage: (message: string, history: AiMessage[], context: AiContext, financialData?: Record<string, unknown>) => Promise<{ message: string; conversationId: string } | null>;
  loading: boolean;
  error: string | null;
};

const Ctx = createContext<AiCtx | null>(null);

const PRIVACY_KEY = 'ik_ai_privacy';

const defaultPrivacy: AiPrivacySettings = { enabled: true, allowFinancialData: false, allowBusinessData: false };

export function AIProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [privacy, setPrivacy] = useState<AiPrivacySettings>(defaultPrivacy);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRIVACY_KEY);
      if (stored) setPrivacy(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const updatePrivacy = useCallback((patch: Partial<AiPrivacySettings>) => {
    setPrivacy((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(PRIVACY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const sendMessage = useCallback(async (
    message: string,
    history: AiMessage[],
    context: AiContext,
    financialData?: Record<string, unknown>
  ): Promise<{ message: string; conversationId: string } | null> => {
    if (!user || !session) { setError('Você precisa estar logado.'); return null; }
    if (!privacy.enabled) { setError('IA desativada nas suas configurações de privacidade.'); return null; }

    setLoading(true);
    setError(null);

    const cleanHistory = history.map(({ role, content }) => ({ role, content }));
    const payload: Record<string, unknown> = { message, history: cleanHistory, context };

    if (privacy.allowFinancialData && financialData) {
      payload.financialData = financialData;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ik-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erro desconhecido'); return null; }
      return { message: data.message, conversationId: data.conversationId };
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, session, privacy]);

  return (
    <Ctx.Provider value={{ enabled: privacy.enabled, privacy, updatePrivacy, sendMessage, loading, error }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAI() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAI must be used within AIProvider');
  return ctx;
}
