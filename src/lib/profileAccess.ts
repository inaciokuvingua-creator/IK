import { supabase } from './supabase';

export type ProfileKind = 'public' | 'private';

const PUBLIC_TABLE = 'user_public_profiles';
const PRIVATE_TABLE = 'user_private_profiles';
const LEGACY_TABLE = 'user_profiles';

function isMissingTableError(error: unknown): boolean {
  if (!error) return false;
  const message = typeof error === 'object' && 'message' in error
    ? String((error as { message?: string }).message ?? '')
    : String(error);

  return /does not exist|relation .*user_public_profiles|relation .*user_private_profiles|relation .*user_profiles|not found/i.test(message);
}

async function fallbackLegacyProfile<T>(kind: ProfileKind, query: () => Promise<{ data: T | null; error: unknown }>) {
  const result = await query();
  if (!result.error || !isMissingTableError(result.error)) {
    return result;
  }

  const legacyQuery = kind === 'public'
    ? supabase.from(LEGACY_TABLE).select('*')
    : supabase.from(LEGACY_TABLE).select('*');

  return legacyQuery as unknown as Promise<{ data: T | null; error: unknown }>;
}

export async function selectProfileByUserId<T = any>(kind: ProfileKind, userId: string, select = '*') {
  const table = kind === 'public' ? PUBLIC_TABLE : PRIVATE_TABLE;

  const primary = await supabase
    .from(table)
    .select(select)
    .eq('user_id', userId)
    .maybeSingle();

  if (primary.data) {
    return primary as { data: T | null; error: null };
  }

  if (primary.error && isMissingTableError(primary.error)) {
    return supabase
      .from(LEGACY_TABLE)
      .select(select)
      .eq('user_id', userId)
      .maybeSingle() as Promise<{ data: T | null; error: unknown }>;
  }

  return primary as { data: T | null; error: unknown };
}

export async function updateProfileByUserId(kind: ProfileKind, userId: string, updates: Record<string, unknown>) {
  const table = kind === 'public' ? PUBLIC_TABLE : PRIVATE_TABLE;

  const primary = await supabase
    .from(table)
    .update(updates)
    .eq('user_id', userId);

  if (primary.error && isMissingTableError(primary.error)) {
    return supabase
      .from(LEGACY_TABLE)
      .update(updates)
      .eq('user_id', userId);
  }

  return primary;
}

export async function upsertPublicProfile(payload: Record<string, unknown>) {
  const primary = await supabase.from(PUBLIC_TABLE).upsert(payload);
  if (primary.error && isMissingTableError(primary.error)) {
    return supabase.from(LEGACY_TABLE).upsert(payload);
  }
  return primary;
}

export async function upsertPrivateProfile(payload: Record<string, unknown>) {
  const primary = await supabase.from(PRIVATE_TABLE).upsert(payload);
  if (primary.error && isMissingTableError(primary.error)) {
    return supabase.from(LEGACY_TABLE).upsert(payload);
  }
  return primary;
}

export async function selectPublicProfilesByIds<T = any>(userIds: string[], select = 'user_id,nome,avatar_url') {
  if (userIds.length === 0) return { data: [] as T[], error: null };

  const primary = await supabase
    .from(PUBLIC_TABLE)
    .select(select)
    .in('user_id', userIds);

  if (primary.data) {
    return primary as { data: T[]; error: null };
  }

  if (primary.error && isMissingTableError(primary.error)) {
    return supabase
      .from(LEGACY_TABLE)
      .select(select)
      .in('user_id', userIds) as Promise<{ data: T[]; error: unknown }>;
  }

  return primary as { data: T[]; error: unknown };
}

export async function updatePublicPreference(userId: string, code: string) {
  const primary = await supabase
    .from(PUBLIC_TABLE)
    .update({ idioma: code, preferred_language: code })
    .eq('user_id', userId);

  if (primary.error && isMissingTableError(primary.error)) {
    return supabase
      .from(LEGACY_TABLE)
      .update({ idioma: code, preferred_language: code })
      .eq('user_id', userId);
  }

  return primary;
}

export function isPublicProfileTableAvailable() {
  return true;
}

export function isPrivateProfileTableAvailable() {
  return true;
}

export function isSecurityProfileTableAvailable() {
  return false;
}

export const publicProfileTable = PUBLIC_TABLE;
export const privateProfileTable = PRIVATE_TABLE;
export const legacyProfileTable = LEGACY_TABLE;

export async function selectPublicProfilesLike<T = any>(query: string, select = 'user_id,nome,display_name,bio,avatar_url,city,country,verified', limit = 12) {
  const q = `%${query.trim()}%`;
  const primary = await supabase
    .from(PUBLIC_TABLE)
    .select(select)
    .or(`nome.ilike.${q},display_name.ilike.${q},bio.ilike.${q},country.ilike.${q},city.ilike.${q}`)
    .limit(limit);

  if (primary.data) {
    return primary as { data: T[]; error: null };
  }

  if (primary.error && isMissingTableError(primary.error)) {
    return supabase
      .from(LEGACY_TABLE)
      .select(select)
      .or(`nome.ilike.${q},display_name.ilike.${q},bio.ilike.${q},country.ilike.${q},city.ilike.${q}`)
      .limit(limit) as Promise<{ data: T[]; error: unknown }>;
  }

  return primary as { data: T[]; error: unknown };
}

export async function selectPublicProfileById<T = any>(userId: string, select = '*') {
  return selectProfileByUserId<T>('public', userId, select);
}

export async function selectPrivateProfileById<T = any>(userId: string, select = '*') {
  return selectProfileByUserId<T>('private', userId, select);
}

export async function updatePublicProfileByUserId(userId: string, updates: Record<string, unknown>) {
  return updateProfileByUserId('public', userId, updates);
}

export async function updatePrivateProfileByUserId(userId: string, updates: Record<string, unknown>) {
  return updateProfileByUserId('private', userId, updates);
}
