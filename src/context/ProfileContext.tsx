import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  bio: string | null;
  avatar_url: string | null;
  role: 'user' | 'moderator' | 'admin_ops' | 'super_admin';
  plan: 'free' | 'premium' | 'business' | 'enterprise';
  plan_expires_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_active: boolean;
  verified: boolean;
  verification_type: 'user' | 'creator' | 'store' | 'company' | null;
  country: string;
  phone: string | null;
  website: string | null;
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
      setProfile({ ...data, social_links: data.social_links ?? {} });
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
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEnds.toISOString(),
          trial_active: true,
          plan_expires_at: trialEnds.toISOString(),
          social_links: {},
        })
        .select()
        .single();
      if (created) setProfile({ ...created, social_links: created.social_links ?? {} });
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, [user?.id]);

  const updateProfile = async (patch: Partial<UserProfile>) => {
    if (!user) return;
    const { data } = await supabase
      .from('user_profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single();
    if (data) setProfile({ ...data, social_links: data.social_links ?? {} });
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
