import { supabase } from './supabase';

export async function createAlert(payload: { user_id?: string | null; cofre_id?: string | null; tipo: string; titulo: string; corpo?: string }) {
  const { data, error } = await supabase.from('alerts').insert([payload]).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function listAlerts(cofreId?: string | null) {
  const q = supabase.from('alerts').select('*').order('created_at', { ascending: false });
  if (cofreId) q.eq('cofre_id', cofreId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function markAlertRead(id: string) {
  const { data, error } = await supabase.from('alerts').update({ lida: true }).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function markAllRead(cofreId?: string | null) {
  const q = supabase.from('alerts').update({ lida: true });
  if (cofreId) q.eq('cofre_id', cofreId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function checkRateVariationsAndCreateAlerts(thresholdPct = 5) {
  // Compare latest rate vs previous history entry for each currency
  const { data: latest } = await supabase.from('exchange_rates').select('*');
  if (!latest) return [];
  const alertsCreated: any[] = [];
  for (const cur of latest) {
    try {
      const { data: prev } = await supabase.from('exchange_rates_history').select('*').eq('currency', cur.currency).order('fetched_at', { ascending: false }).limit(1).range(1,1); // get previous row
      const previous = (prev && prev[0]) ? prev[0] : null;
      if (!previous) continue;
      const oldRate = Number(previous.rate || 0);
      const newRate = Number(cur.rate || 0);
      if (oldRate <= 0) continue;
      const pct = Math.abs((newRate - oldRate) / oldRate) * 100;
      if (pct >= thresholdPct) {
        const title = `Variação cambial: ${cur.currency} ${pct.toFixed(2)}%`;
        const body = `Taxa anterior: ${oldRate} → atual: ${newRate}`;
        const { data } = await supabase.from('alerts').insert([{ tipo: 'rate_change', titulo: title, corpo: body }]).select().maybeSingle();
        alertsCreated.push(data);
      }
    } catch (e) {
      console.error('checkRateVariationsAndCreateAlerts error', e);
    }
  }
  return alertsCreated;
}
