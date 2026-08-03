import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { changeLang, type LangCode } from '../i18n';
import { addSecurityAlert, analyzeDocumentUpload, buildRecoveryScore, generate2FASecret, get2FACode, verify2FACode } from '../lib/authIntelligence';
import {
  buildProfileCompletion,
  getDeviceMetadata,
  hashSecurityAnswer,
  normalizeUsername,
  type AccountType,
  type DocumentType,
} from '../lib/accountSecurity';
 
export type SecurityQuestionInput = {
  question: string;
  answer: string;
};

export type AdvancedSignUpData = {
  email: string;
  password: string;
  accountType: AccountType;
  fullName: string;
  username: string;
  phone?: string;
  birthDate?: string;
  sex?: string;
  country: string;
  province?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  preferredLanguage?: LangCode;
  bio?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  issuerCountry?: string;
  issuedAt?: string;
  expiresAt?: string;
  documentUrl?: string;
  companyName?: string;
  companyCategory?: string;
  companyWebsite?: string;
  companyDescription?: string;
  consent: boolean;
  securityQuestions: SecurityQuestionInput[];
};

export type RecoveryInput = {
  identifier?: string;
  fullName?: string;
  birthDate?: string;
  country?: string;
  city?: string;
  phone?: string;
  email?: string;
  documentNumber?: string;
};

export type RecoveryCandidate = {
  user_id: string;
  username: string | null;
  masked_email: string | null;
  masked_phone: string | null;
  score: number;
  allow_reset: boolean;
  suspicious: boolean;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  signIn: (email: string, password: string, otpCode?: string) => Promise<{ error: string | null }>;
  signUp: (payload: AdvancedSignUpData | string, password?: string) => Promise<{ error: string | null }>;
  requestPasswordReset: (identifier: string) => Promise<{ error: string | null }>;
  completePasswordReset: (password: string) => Promise<{ error: string | null }>;
  recoverAccount: (input: RecoveryInput) => Promise<{ error: string | null; candidates: RecoveryCandidate[] }>;
  signOut: () => Promise<void>;
  enable2FA: () => Promise<{ secret: string | null; error: string | null }>;
  verify2FA: (code: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const SUPABASE_CONFIG_ERROR =
  'Servidor de autenticação não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para entrar na sua conta.';

function mapAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed')
  ) {
    return 'Não foi possível ligar ao servidor. Verifique a internet e tente novamente.';
  }

  return message || 'Ocorreu um erro inesperado. Tente novamente.';
}

function hasPasswordRecoveryContext() {
  if (typeof window === 'undefined') return false;
  return window.location.hash.includes('type=recovery') || new URLSearchParams(window.location.search).get('reset') === '1';
}

function cleanupRecoveryUrl() {
  if (typeof window === 'undefined') return;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete('reset');
  nextUrl.hash = '';
  window.history.replaceState({}, '', nextUrl.toString());
}

async function restoreLang(userId: string) {
  const { data } = await supabase.from('user_profiles').select('idioma').eq('user_id', userId).maybeSingle();
  if (data?.idioma) changeLang(data.idioma as LangCode);
}

async function resolveLoginIdentifier(identifier: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  if (normalizedIdentifier.includes('@')) return normalizedIdentifier;
  const { data, error } = await supabase.rpc('resolve_login_identifier', { input_identifier: identifier.trim() });
  if (error) {
    const rpcMessage = String(error.message ?? '').toLowerCase();
    if (
      rpcMessage.includes('resolve_login_identifier') ||
      rpcMessage.includes('function') && rpcMessage.includes('does not exist')
    ) {
      throw new Error('Não foi possível validar o nome de utilizador. Entre com o e-mail da conta.');
    }
    throw error;
  }
  const match = Array.isArray(data) ? data[0] : data;
  return match?.email ? String(match.email).toLowerCase() : normalizedIdentifier;
}

async function dispatchUserNotification(userId: string, titulo: string, corpo: string, accessToken?: string, tipo?: string, url?: string) {
  if (!userId) return;
  const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return;

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken ?? ''}`,
        'Content-Type': 'application/json',
        Apikey: anonKey,
      },
      body: JSON.stringify({ titulo, corpo, tipo, url, userId }),
    });
  } catch (error) {
    console.warn('[AuthNotifications] failed:', error);
  }
}

async function auditSuccessfulLogin(userId: string) {
  const device = await getDeviceMetadata();
  const { data: existingDevice } = await supabase
    .from('user_devices')
    .select('id')
    .eq('user_id', userId)
    .eq('device_id', device.deviceId)
    .maybeSingle();
  const { count } = await supabase
    .from('user_devices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('revoked_at', null);
  const suspicious = !existingDevice && (count ?? 0) > 0;

  await supabase.from('user_devices').upsert({
    user_id: userId,
    device_id: device.deviceId,
    device_name: device.deviceName,
    platform: device.platform,
    browser: device.browser,
    last_seen_at: new Date().toISOString(),
    last_location: device.locationLabel,
    trusted: true,
    revoked_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,device_id' });

  await supabase.from('user_login_history').insert({
    user_id: userId,
    auth_method: 'password',
    device_name: device.deviceName,
    device_id: device.deviceId,
    user_agent: device.userAgent,
    location_label: device.locationLabel,
    timezone: device.timezone,
    success: true,
    suspicious,
  });

  const updates: Record<string, unknown> = {
    last_login_at: new Date().toISOString(),
    last_login_location: device.locationLabel,
  };
  if (suspicious) {
    const { data: profile } = await supabase.from('user_profiles').select('suspicious_login_count').eq('user_id', userId).maybeSingle();
    updates.suspicious_login_count = (profile?.suspicious_login_count ?? 0) + 1;
  }
  await supabase.from('user_profiles').update(updates).eq('user_id', userId);
  return suspicious;
}

async function persistSecurityArtifacts(userId: string, payload: AdvancedSignUpData) {
  if (payload.documentNumber && payload.documentType && payload.issuerCountry) {
    const fallbackDocument = new File(['documento'], 'documento.txt', { type: 'text/plain' });
    const analysis = await analyzeDocumentUpload(fallbackDocument, {
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
      issuerCountry: payload.issuerCountry,
      holderName: payload.fullName,
    });

    await supabase.from('user_identity_documents').upsert({
      user_id: userId,
      document_type: analysis.detectedType === 'other' ? (payload.documentType || 'bi') : analysis.detectedType,
      document_number: analysis.documentNumber || payload.documentNumber,
      issuer_country: analysis.issuerCountry || payload.issuerCountry,
      issued_at: analysis.issuedAt || payload.issuedAt || null,
      expires_at: analysis.expiresAt || payload.expiresAt || null,
      document_url: payload.documentUrl || null,
      verification_status: 'analise_local',
      metadata: {
        analysis_summary: analysis.summary,
        confidence: analysis.confidence,
        recommendations: analysis.recommendations,
      },
      updated_at: new Date().toISOString(),
    });
  }

  if (payload.securityQuestions.length > 0) {
    await supabase.from('user_security_questions').delete().eq('user_id', userId);
    const prepared = await Promise.all(
      payload.securityQuestions
        .filter((item) => item.question.trim() && item.answer.trim())
        .map(async (item) => ({
          user_id: userId,
          question: item.question.trim(),
          answer_hash: await hashSecurityAnswer(item.question, item.answer),
        }))
    );
    if (prepared.length > 0) {
      await supabase.from('user_security_questions').insert(prepared);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(hasPasswordRecoveryContext());
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setIsPasswordRecovery(hasPasswordRecoveryContext());
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) restoreLang(session.user.id);
    }).catch((error) => {
      if (!active) return;
      console.error('[IK] Falha ao restaurar sessão', error);
      setSession(null);
      setUser(null);
    }).finally(() => {
      if (active) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
      if (event === 'USER_UPDATED') {
        setIsPasswordRecovery(false);
        cleanupRecoveryUrl();
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) restoreLang(session.user.id);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, otpCode?: string) => {
    if (!isSupabaseConfigured) {
      const localEmail = email.trim().toLowerCase();
      if (password.length >= 8 && localEmail.includes('@')) {
        if (twoFactorEnabled && otpCode) {
          const ok = await verify2FACode(twoFactorSecret || '', otpCode);
          if (!ok) {
            addSecurityAlert({ type: 'suspicious_login', severity: 'warning', title: 'Código 2FA inválido', message: 'Tentativa de acesso com código 2FA inválido.' });
            return { error: 'Código 2FA inválido.' };
          }
        }
        const localUser = {
          id: `local-${localEmail.replace(/[^a-z0-9]/gi, '-')}`,
          email: localEmail,
          created_at: new Date().toISOString(),
        } as User;
        setUser(localUser);
        setSession({ access_token: 'local-fallback-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: localUser } as Session);
        return { error: null };
      }
      return { error: SUPABASE_CONFIG_ERROR };
    }
    try {
      const resolvedEmail = await resolveLoginIdentifier(email);
      const { data, error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
      if (!error && data.user) {
        if (twoFactorEnabled && otpCode) {
          const ok = await verify2FACode(twoFactorSecret || '', otpCode);
          if (!ok) {
            addSecurityAlert({ type: 'suspicious_login', severity: 'warning', title: 'Código 2FA inválido', message: 'Tentativa de acesso com código 2FA inválido.' });
            return { error: 'Código 2FA inválido.' };
          }
        }
        const suspicious = await auditSuccessfulLogin(data.user.id);
        await dispatchUserNotification(
          data.user.id,
          suspicious ? 'Acesso suspeito detectado' : 'Sessão iniciada',
          suspicious
            ? 'Foi identificado um novo acesso incomum. Revise a sua conta se não reconhece esta atividade.'
            : 'A sua sessão foi iniciada com sucesso neste dispositivo.',
          data.session?.access_token,
          'meta',
          '/?page=configuracoes'
        );
      }
      return { error: error?.message ?? null };
    } catch (error) {
      return { error: mapAuthError(error) };
    }
  };

  const signUp = async (payload: AdvancedSignUpData | string, password?: string) => {
    if (!isSupabaseConfigured) {
      if (typeof payload === 'string') {
        return { error: SUPABASE_CONFIG_ERROR };
      }

      const localUser = {
        id: `local-${payload.email.replace(/[^a-z0-9]/gi, '-')}`,
        email: payload.email,
        created_at: new Date().toISOString(),
      } as User;
      setUser(localUser);
      setSession({ access_token: 'local-fallback-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: localUser } as Session);
      await persistSecurityArtifacts(localUser.id, payload);
      await dispatchUserNotification(localUser.id, 'Conta criada', 'A sua conta foi criada com sucesso e as definições de segurança foram preparadas.', 'local-fallback-token', 'meta', '/?page=perfil');
      return { error: null };
    }
    if (typeof payload === 'string') {
      const { error } = await supabase.auth.signUp({ email: payload, password: password || '' });
      return { error: error?.message ?? null };
    }

    try {
      const username = normalizeUsername(payload.username);
      const { data: usernameTaken } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', username)
        .maybeSingle();
      if (usernameTaken) return { error: 'Este nome de utilizador já está em uso.' };

      const now = new Date();
      const trialEnds = new Date(now);
      trialEnds.setMonth(trialEnds.getMonth() + 3);
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            full_name: payload.fullName,
            account_type: payload.accountType,
            username,
            preferred_language: payload.preferredLanguage ?? 'pt',
          },
        },
      });
      if (error) return { error: error.message };
      if (!data.user) return { error: 'Não foi possível criar a conta.' };

      const profilePayload = {
        user_id: data.user.id,
        nome: payload.fullName,
        full_name: payload.fullName,
        display_name: payload.fullName,
        username,
        email: payload.email.toLowerCase(),
        account_type: payload.accountType,
        phone: payload.phone || null,
        birth_date: payload.birthDate || null,
        sex: payload.sex || null,
        country: payload.country,
        province: payload.province || null,
        city: payload.city || null,
        address: payload.address || null,
        postal_code: payload.postalCode || null,
        bio: payload.bio || null,
        public_bio: payload.bio || null,
        preferred_language: payload.preferredLanguage ?? 'pt',
        idioma: payload.preferredLanguage ?? 'pt',
        company_name: payload.companyName || null,
        company_category: payload.companyCategory || null,
        company_website: payload.companyWebsite || null,
        company_description: payload.companyDescription || null,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
        trial_active: true,
        plan_expires_at: trialEnds.toISOString(),
        consent_version: payload.consent ? '2026-07' : null,
        consented_at: payload.consent ? now.toISOString() : null,
      };

      await supabase.from('user_profiles').upsert({
        ...profilePayload,
        profile_completion: buildProfileCompletion({
          ...profilePayload,
          document_number: payload.documentNumber,
        }),
      });
      await persistSecurityArtifacts(data.user.id, payload);
      await dispatchUserNotification(data.user.id, 'Conta criada', 'A sua conta foi criada com sucesso e está pronta para uso.', undefined, 'meta', '/?page=perfil');
      return { error: null };
    } catch (error) {
      return { error: mapAuthError(error) };
    }
  };

  const requestPasswordReset = async (identifier: string) => {
    if (!isSupabaseConfigured) return { error: SUPABASE_CONFIG_ERROR };
    try {
      const email = await resolveLoginIdentifier(identifier);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${window.location.pathname}?reset=1`,
      });
      return { error: error?.message ?? null };
    } catch (error) {
      return { error: mapAuthError(error) };
    }
  };

  const recoverAccount = async (input: RecoveryInput) => {
    if (!isSupabaseConfigured) {
      const localProfile = {
        full_name: 'Utilizador autenticado',
        email: input.email ?? 'user@local.ik',
        phone: input.phone ?? '',
        country: input.country ?? 'AO',
        city: input.city ?? '',
        document_number: input.documentNumber ?? '',
      };
      const score = buildRecoveryScore(input, localProfile);
      const candidates = score >= 50 ? [{ user_id: 'local-recovery', username: 'utilizador', masked_email: 'u***@local.ik', masked_phone: '****1234', score, allow_reset: true, suspicious: score < 75 }] as RecoveryCandidate[] : [];
      if (candidates.length > 0) {
        addSecurityAlert({ type: 'recovery_review', severity: 'warning', title: 'Recuperação avançada ativada', message: 'Foi iniciada uma recuperação assistida por documentos e dados pessoais.' });
        await dispatchUserNotification('local-recovery', 'Recuperação iniciada', 'Foi iniciada uma tentativa de recuperação da conta com verificação avançada.', undefined, 'meta', '/?page=configuracoes');
      }
      return { error: null, candidates };
    }
    try {
      const { data, error } = await supabase.rpc('recover_account_identity', {
        input_identifier: input.identifier ?? null,
        input_full_name: input.fullName ?? null,
        input_birth_date: input.birthDate ?? null,
        input_country: input.country ?? null,
        input_city: input.city ?? null,
        input_phone: input.phone ?? null,
        input_email: input.email ?? null,
        input_document_number: input.documentNumber ?? null,
      });
      if (error) return { error: error.message, candidates: [] };
      if ((data ?? []).length > 0) {
        await dispatchUserNotification(
          (data as RecoveryCandidate[])[0]?.user_id,
          'Recuperação iniciada',
          'Foi iniciada uma tentativa de recuperação da conta com verificação avançada.',
          undefined,
          'meta',
          '/?page=configuracoes'
        );
      }
      return { error: null, candidates: (data ?? []) as RecoveryCandidate[] };
    } catch (error) {
      return { error: mapAuthError(error), candidates: [] };
    }
  };

  const completePasswordReset = async (password: string) => {
    if (!isSupabaseConfigured) return { error: SUPABASE_CONFIG_ERROR };
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) {
        cleanupRecoveryUrl();
        setIsPasswordRecovery(false);
      }
      return { error: error?.message ?? null };
    } catch (error) {
      return { error: mapAuthError(error) };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao terminar sessão:', error);
    }
    setUser(null);
    setSession(null);
  };

  const enable2FA = async () => {
    const secret = generate2FASecret(user?.email ?? 'ik-finance');
    setTwoFactorSecret(secret);
    setTwoFactorEnabled(true);
    return { secret, error: null };
  };

  const verify2FA = async (code: string) => {
    if (!twoFactorSecret) return false;
    const ok = await verify2FACode(twoFactorSecret, code);
    if (!ok) {
      addSecurityAlert({ type: 'suspicious_login', severity: 'warning', title: 'Tentativa de acesso suspeita', message: 'Foi detectado um código 2FA inválido.' });
    }
    return ok;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isPasswordRecovery, twoFactorEnabled, twoFactorSecret, signIn, signUp, requestPasswordReset, completePasswordReset, recoverAccount, signOut, enable2FA, verify2FA }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
