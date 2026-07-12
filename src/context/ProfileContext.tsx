import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { buildProfileCompletion, type AccountType } from '../lib/accountSecurity';
import { changeLang, type LangCode, SUPPORTED_LANGUAGES } from '../i18n';

export type SocialLinks = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  website?: string;
};
 
export type UserProfile = {
  user_id: string;
  nome: string;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
  email: string | null;
  bio: string | null;
  public_bio: string | null;
  avatar_url: string | null;
  role: 'user' | 'moderator' | 'admin_ops' | 'super_admin';
  account_type: AccountType;
  plan: 'free' | 'premium' | 'business' | 'enterprise';
  plan_expires_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_active: boolean;
  verified: boolean;
  verification_type: 'user' | 'creator' | 'store' | 'company' | null;
  country: string;
  province: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  birth_date: string | null;
  sex: string | null;
  phone: string | null;
  website: string | null;
  preferred_language: string | null;
  idioma: string | null;
  profile_visibility: 'publico' | 'privado' | 'misto';
  profile_completion: number;
  security_level: 'standard' | 'elevated' | 'strict';
  two_factor_enabled: boolean;
  sms_verified: boolean;
  email_verified: boolean;
  identity_verified: boolean;
  company_name: string | null;
  company_category: string | null;
  company_description: string | null;
  company_logo_url: string | null;
  company_website: string | null;
  company_socials: Record<string, string>;
  company_contacts: Record<string, string>;
  company_documents: Array<Record<string, unknown>>;
  associated_companies: Array<Record<string, unknown>>;
  stores_created: Array<Record<string, unknown>>;
  published_products: Array<Record<string, unknown>>;
  offered_services: Array<Record<string, unknown>>;
  contact_preferences: Record<string, boolean>;
  public_profile: Record<string, boolean>;
  private_profile: Record<string, boolean>;
  last_login_at: string | null;
  last_login_ip: string | null;
  last_login_location: string | null;
  suspicious_login_count: number;
  consent_version: string | null;
  consented_at: string | null;
  social_links: SocialLinks;
  created_at: string;
  updated_at: string;
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function normalizeProfile(data: Partial<UserProfile>, fallbackEmail?: string | null): UserProfile {
  const now = new Date().toISOString();
  return {
    user_id: data.user_id ?? '',
    nome: data.nome ?? fallbackEmail?.split('@')[0] ?? 'Utilizador',
    full_name: data.full_name ?? data.nome ?? fallbackEmail?.split('@')[0] ?? 'Utilizador',
    display_name: data.display_name ?? data.full_name ?? data.nome ?? fallbackEmail?.split('@')[0] ?? 'Utilizador',
    username: data.username ?? fallbackEmail?.split('@')[0] ?? null,
    email: data.email ?? fallbackEmail ?? null,
    bio: data.bio ?? null,
    public_bio: data.public_bio ?? data.bio ?? null,
    avatar_url: data.avatar_url ?? null,
    role: data.role ?? 'user',
    account_type: data.account_type ?? 'cliente',
    plan: data.plan ?? 'free',
    plan_expires_at: data.plan_expires_at ?? null,
    trial_started_at: data.trial_started_at ?? null,
    trial_ends_at: data.trial_ends_at ?? null,
    trial_active: data.trial_active ?? false,
    verified: data.verified ?? false,
    verification_type: data.verification_type ?? null,
    country: data.country ?? 'AO',
    province: data.province ?? null,
    city: data.city ?? null,
    address: data.address ?? null,
    postal_code: data.postal_code ?? null,
    birth_date: data.birth_date ?? null,
    sex: data.sex ?? null,
    phone: data.phone ?? null,
    website: data.website ?? null,
    preferred_language: data.preferred_language ?? 'pt',
    idioma: data.idioma ?? data.preferred_language ?? 'pt',
    profile_visibility: data.profile_visibility ?? 'misto',
    profile_completion: Number.isFinite(data.profile_completion) ? Number(data.profile_completion) : 0,
    security_level: data.security_level ?? 'standard',
    two_factor_enabled: data.two_factor_enabled ?? false,
    sms_verified: data.sms_verified ?? false,
    email_verified: data.email_verified ?? false,
    identity_verified: data.identity_verified ?? false,
    company_name: data.company_name ?? null,
    company_category: data.company_category ?? null,
    company_description: data.company_description ?? null,
    company_logo_url: data.company_logo_url ?? null,
    company_website: data.company_website ?? null,
    company_socials: data.company_socials ?? {},
    company_contacts: data.company_contacts ?? {},
    company_documents: data.company_documents ?? [],
    associated_companies: data.associated_companies ?? [],
    stores_created: data.stores_created ?? [],
    published_products: data.published_products ?? [],
    offered_services: data.offered_services ?? [],
    contact_preferences: data.contact_preferences ?? {},
    public_profile: data.public_profile ?? {},
    private_profile: data.private_profile ?? {},
    last_login_at: data.last_login_at ?? null,
    last_login_ip: data.last_login_ip ?? null,
    last_login_location: data.last_login_location ?? null,
    suspicious_login_count: Number.isFinite(data.suspicious_login_count) ? Number(data.suspicious_login_count) : 0,
    consent_version: data.consent_version ?? null,
    consented_at: data.consented_at ?? null,
    social_links: data.social_links ?? {},
    created_at: data.created_at ?? now,
    updated_at: data.updated_at ?? now,
  };
}

export function getTrialDaysLeft(profile: UserProfile | null): number {
  if (!profile?.trial_active || !profile.trial_ends_at) return 0;
  const ms = new Date(profile.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function isTrialExpired(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (!profile.trial_active || !profile.trial_ends_at) return false;
  return new Date(profile.trial_ends_at).getTime() < Date.now();
}

export function hasFullAccess(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.plan !== 'free') return true;
  // Free plan within trial period gets full access
  return !isTrialExpired(profile);
}

type ProfileCtx = {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  refetch: () => Promise<void>;
};

const Ctx = createContext<ProfileCtx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) { setProfile(null); return; }
    setLoading(true);
    try {
      const profileResult = await withTimeout(
        Promise.resolve(
          supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
        ),
        12000,
        'Tempo esgotado ao carregar perfil.',
      );

      if (profileResult.error) throw profileResult.error;

      if (profileResult.data) {
        setProfile(normalizeProfile(profileResult.data, user.email ?? null));
        // Apply saved language preference
        const langCode = profileResult.data.idioma ?? profileResult.data.preferred_language;
        if (langCode && SUPPORTED_LANGUAGES.some((l) => l.code === langCode)) {
          changeLang(langCode as LangCode);
        }
        return;
      }

      const now = new Date();
      const trialEnds = new Date(now);
      trialEnds.setMonth(trialEnds.getMonth() + 3);
      const nome = user.email?.split('@')[0] ?? 'Utilizador';
      const createdResult = await withTimeout(
        Promise.resolve(
          supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              nome,
              full_name: nome,
              display_name: nome,
              email: user.email ?? null,
              username: user.email?.split('@')[0] ?? `ik_${user.id.slice(0, 6)}`,
              trial_started_at: now.toISOString(),
              trial_ends_at: trialEnds.toISOString(),
              trial_active: true,
              plan_expires_at: trialEnds.toISOString(),
              social_links: {},
              company_socials: {},
              company_contacts: {},
              company_documents: [],
              associated_companies: [],
              stores_created: [],
              published_products: [],
              offered_services: [],
              profile_completion: 20,
            })
            .select()
            .single(),
        ),
        12000,
        'Tempo esgotado ao criar perfil inicial.',
      );

      if (createdResult.error) throw createdResult.error;

      if (createdResult.data) {
        setProfile(normalizeProfile(createdResult.data, user.email ?? null));
      } else {
        setProfile(normalizeProfile({ user_id: user.id }, user.email ?? null));
      }
    } catch (error) {
      console.error('profile fetch failed', error);
      // Keep the profile page usable even if DB read fails temporarily.
      setProfile(normalizeProfile({ user_id: user.id }, user.email ?? null));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = async (patch: Partial<UserProfile>) => {
  if (!user) return;

  const nextPatch = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  if (!('profile_completion' in nextPatch)) {
    nextPatch.profile_completion = buildProfileCompletion({
      ...(profile ?? {}),
      ...patch,
    });
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update(nextPatch)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar perfil:', error);
    throw error;
  }

   if (data) {
    setProfile(normalizeProfile(data, user.email ?? null));
  }
};

return (
  <Ctx.Provider
    value={{
      profile,
      loading,
      updateProfile,
      refetch: fetchProfile,
    }}
  >
    {children}
  </Ctx.Provider>
);
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
