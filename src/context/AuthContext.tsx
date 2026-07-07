import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { changeLang, type LangCode } from '../i18n';
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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (payload: AdvancedSignUpData | string, password?: string) => Promise<{ error: string | null }>;
  requestPasswordReset: (identifier: string) => Promise<{ error: string | null }>;
  recoverAccount: (input: RecoveryInput) => Promise<{ error: string | null; candidates: RecoveryCandidate[] }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

async function restoreLang(userId: string) {
  const { data } = await supabase.from('user_profiles').select('idioma').eq('id', userId).maybeSingle();
  if (data?.idioma) changeLang(data.idioma as LangCode);
}

async function resolveLoginIdentifier(identifier: string) {
  if (identifier.includes('@')) return identifier.trim().toLowerCase();
  const { data, error } = await supabase.rpc('resolve_login_identifier', { input_identifier: identifier.trim() });
  if (error) throw error;
  const match = Array.isArray(data) ? data[0] : data;
  return match?.email ? String(match.email).toLowerCase() : identifier.trim().toLowerCase();
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
}

async function persistSecurityArtifacts(userId: string, payload: AdvancedSignUpData) {
  if (payload.documentNumber && payload.documentType && payload.issuerCountry) {
    await supabase.from('user_identity_documents').upsert({
      user_id: userId,
      document_type: payload.documentType,
      document_number: payload.documentNumber,
      issuer_country: payload.issuerCountry,
      issued_at: payload.issuedAt || null,
      expires_at: payload.expiresAt || null,
      document_url: payload.documentUrl || null,
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) restoreLang(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) restoreLang(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const resolvedEmail = await resolveLoginIdentifier(email);
      const { data, error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
      if (!error && data.user) await auditSuccessfulLogin(data.user.id);
      return { error: error?.message ?? null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  };

  const signUp = async (payload: AdvancedSignUpData | string, password?: string) => {
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
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  };

  const requestPasswordReset = async (identifier: string) => {
    try {
      const email = await resolveLoginIdentifier(identifier);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      return { error: error?.message ?? null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  };

  const recoverAccount = async (input: RecoveryInput) => {
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
      return { error: null, candidates: (data ?? []) as RecoveryCandidate[] };
    } catch (error) {
      return { error: (error as Error).message, candidates: [] };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, requestPasswordReset, recoverAccount, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
