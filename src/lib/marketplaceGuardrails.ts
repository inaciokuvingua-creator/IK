import { supabase } from './supabase';

type RateLimitConfig = {
  action: string;
  limit: number;
  windowMs: number;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

function windowKey(now: number, windowMs: number) {
  return String(Math.floor(now / windowMs));
}

export async function checkMarketplaceRateLimit(config: RateLimitConfig) {
  const now = Date.now();
  const key = `${config.action}:${config.userId ?? 'anon'}:${windowKey(now, config.windowMs)}`;
  const raw = window.localStorage.getItem(key);
  const current = raw ? JSON.parse(raw) as { attempts: number; resetAt: number } : null;
  if (current && current.attempts >= config.limit && current.resetAt > now) {
    return { allowed: false, remainingMs: current.resetAt - now };
  }
  const next = {
    attempts: (current?.attempts ?? 0) + 1,
    resetAt: current?.resetAt ?? (now + config.windowMs),
  };
  window.localStorage.setItem(key, JSON.stringify(next));

  if (config.userId) {
    await supabase.from('marketplace_rate_limits').upsert({
      user_id: config.userId,
      action: config.action,
      window_key: windowKey(now, config.windowMs),
      attempts: next.attempts,
      last_attempt_at: new Date(now).toISOString(),
      blocked_until: next.attempts >= config.limit ? new Date(next.resetAt).toISOString() : null,
      metadata: config.metadata ?? {},
    }, { onConflict: 'user_id,action,window_key' });
  }

  return { allowed: true, remainingMs: 0 };
}

export async function queueMarketplaceModeration(input: {
  entityType: 'product' | 'store' | 'review' | 'message' | 'proof' | 'upload';
  entityId: string;
  ownerId?: string | null;
  summary: string;
  priority?: 'low' | 'normal' | 'high';
  source?: string;
  metadata?: Record<string, unknown>;
}) {
  await supabase.from('marketplace_moderation_queue').insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    owner_id: input.ownerId ?? null,
    summary: input.summary,
    priority: input.priority ?? 'normal',
    source: input.source ?? 'system',
    metadata: input.metadata ?? {},
  });
}

export async function createMarketplaceReport(input: {
  entityType: 'product' | 'store' | 'review' | 'message' | 'order';
  entityId: string;
  reason: string;
  details?: string;
}) {
  await supabase.from('marketplace_reports').insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    reason: input.reason,
    details: input.details ?? null,
  });
}