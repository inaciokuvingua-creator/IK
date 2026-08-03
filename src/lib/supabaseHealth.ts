import { isSupabaseConfigured } from './supabase';

export type SupabaseHealthMode = 'configured' | 'preview-safe' | 'degraded';

export type SupabaseHealthStatus = {
  mode: SupabaseHealthMode;
  configured: boolean;
  ok: boolean;
  issues: string[];
  summary: string;
};

export function getSupabaseHealthStatus(): SupabaseHealthStatus {
  const issues: string[] = [];

  if (!isSupabaseConfigured) {
    issues.push('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão definidos.');
    return {
      mode: 'preview-safe',
      configured: false,
      ok: true,
      issues,
      summary: 'Modo seguro ativo: o app continua funcional, mas algumas funcionalidades dependem de dados locais até o Supabase real ser ligado.',
    };
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    issues.push('O ambiente local ainda precisa de um projeto Supabase ligado para ativar autenticação e dados reais.');
  }

  return {
    mode: 'configured',
    configured: true,
    ok: true,
    issues,
    summary: 'Supabase configurado e pronto para autenticação, storage e edge functions.',
  };
}
