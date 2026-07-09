import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  const fetchProfile = async () => {
    if (!user) { setProfile(null); return; }
    setLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setProfile({
        ...data,
        social_links: data.social_links ?? {},
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
      });
      // Apply saved language preference
      const langCode = data.idioma ?? data.preferred_language;
      if (langCode && SUPPORTED_LANGUAGES.some(l => l.code === langCode)) {
        changeLang(langCode as LangCode);
      }
    } else {
      const now = new Date();
      const trialEnds = new Date(now);
      trialEnds.setMonth(trialEnds.getMonth() + 3);
      const nome = user.email?.split('@')[0] ?? 'Utilizador';
      const { data: created } = await supabase
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
        .single();
      if (created) setProfile({
        ...created,
        social_links: created.social_links ?? {},
        company_socials: created.company_socials ?? {},
        company_contacts: created.company_contacts ?? {},
        company_documents: created.company_documents ?? [],
        associated_companies: created.associated_companies ?? [],
        stores_created: created.stores_created ?? [],
        published_products: created.published_products ?? [],
        offered_services: created.offered_services ?? [],
        contact_preferences: created.contact_preferences ?? {},
        public_profile: created.public_profile ?? {},
        private_profile: created.private_profile ?? {},
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, [user?.id]);

  const updateProfile = async (patch: Partial<UserProfile>) => {
    if (!user) return;
    const nextPatch = {
      ...patch,
      updated_at: new Date().toISOString(),
    };
    if (!('profile_completion' in nextPatch)) {
      nextPatch.profile_completion = buildProfileCompletion({ ...(profile ?? {}), ...patch });
    }
    const { data } = await supabase
      .from('user_profiles')
      .update(nextPatch)
      .eq('user_id', user.id)
      .select()
      .single();
    if (data) setProfile({
      ...data,
      social_links: data.social_links ?? {},
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
    });
  };

  return (
    <Ctx.Provider value={{ profile, loading, updateProfile, refetch: fetchProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
