import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default async function handler(req: any, res: any) {
  try {
    const thresholdPct = Number(process.env.THRESHOLD_PCT || 5);
    const { data: latest } = await supabase.from('exchange_rates').select('*');
    if (!latest) return res.status(200).json({ ok: true, created: 0 });

    let created = 0;
    for (const cur of latest) {
      const { data: history } = await supabase.from('exchange_rates_history').select('*').eq('currency', cur.currency).order('fetched_at', { ascending: false }).range(1,1);
      const previous = (history && history[0]) ? history[0] : null;
      if (!previous) continue;
      const oldRate = Number(previous.rate || 0);
      const newRate = Number(cur.rate || 0);
      if (oldRate <= 0) continue;
      const pct = Math.abs((newRate - oldRate) / oldRate) * 100;
      if (pct >= thresholdPct) {
        const title = `Variação cambial: ${cur.currency} ${pct.toFixed(2)}%`;
        const body = `Taxa anterior: ${oldRate} → atual: ${newRate}`;
        await supabase.from('alerts').insert([{ tipo: 'rate_change', titulo: title, corpo: body }]);
        created += 1;
      }
    }

    return res.status(200).json({ ok: true, created });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || String(e) });
  }
}
