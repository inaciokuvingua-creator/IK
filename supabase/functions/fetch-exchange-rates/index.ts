// Simple Supabase Edge Function (TypeScript for local editing)
// Deploy to Supabase Functions runtime as needed. This script fetches external rates and upserts into exchange_rates table.

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default async function handler(req: any, res: any) {
  try {
    const base = 'KZ';
    const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`;
    const r = await fetch(url);
    if (!r.ok) return res.status(500).send('Failed to fetch');
    const json = await r.json();
    const rates = json.rates || {};
    const items = Object.keys(rates).map((c) => ({ base_currency: base, currency: c, rate: Number(rates[c]), fetched_at: new Date().toISOString() }));
    // Insert history records
    const { error: historyErr } = await supabase.from('exchange_rates_history').insert(items);
    if (historyErr) console.warn('Failed to insert exchange_rates_history', historyErr.message || historyErr);
    // Upsert latest
    const { error } = await supabase.from('exchange_rates').upsert(items, { onConflict: 'currency' });
    if (error) return res.status(500).send(error.message);
    return res.status(200).json({ ok: true, count: items.length });
  } catch (err: any) {
    console.error(err);
    return res.status(500).send(err.message || String(err));
  }
}
