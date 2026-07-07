import { supabase } from './supabase';

export type RateRow = { id?: number; base_currency: string; currency: string; rate: number; fetched_at?: string };

export async function listRates() {
  const { data, error } = await supabase.from('exchange_rates').select('*').order('currency', { ascending: true });
  if (error) throw error;
  return data as RateRow[];
}

export async function upsertRate(currency: string, rate: number, base = 'KZ') {
  try {
    const payload = { base_currency: base, currency, rate, fetched_at: new Date().toISOString() };
    const { data, error } = await supabase.from('exchange_rates').upsert([payload], { onConflict: 'currency' }).select().maybeSingle();
    if (error) throw error;
    return data as RateRow;
  } catch (err) {
    // Fallback: delete existing and insert
    await supabase.from('exchange_rates').delete().eq('currency', currency).maybeSingle();
    const { data, error } = await supabase.from('exchange_rates').insert([{ base_currency: base, currency, rate, fetched_at: new Date().toISOString() }]).select().maybeSingle();
    if (error) throw error;
    return data as RateRow;
  }
}

export async function deleteRateByCurrency(currency: string) {
  const { error } = await supabase.from('exchange_rates').delete().eq('currency', currency);
  if (error) throw error;
  return true;
}

export async function fetchAndStoreExternal(base = 'KZ') {
  // Uses exchangerate.host free API
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to fetch rates');
  const json = await resp.json();
  const rates = json.rates || {};
  const items = Object.keys(rates).map((c) => ({ base_currency: base, currency: c, rate: Number(rates[c]), fetched_at: new Date().toISOString() }));
  // Try upsert with onConflict; fallback to delete/insert handled in upsertRate
  try {
    const { error } = await supabase.from('exchange_rates').upsert(items, { onConflict: 'currency' });
    if (error) throw error;
    return true;
  } catch (e) {
    // fallback: delete currencies then insert
    for (const it of items) {
      await supabase.from('exchange_rates').delete().eq('currency', it.currency);
    }
    const { error } = await supabase.from('exchange_rates').insert(items);
    if (error) throw error;
    return true;
  }
}

export async function getRate(currency: string, base = 'KZ') {
  if (!currency || currency === base) return 1;
  const { data } = await supabase.from('exchange_rates').select('rate').eq('currency', currency).order('fetched_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  return Number((data as any).rate) || null;
}
