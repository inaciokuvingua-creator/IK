import { supabase } from './supabase';

export type Money = { amount: number; currency: string };

export async function getLatestRate(currency: string, base = 'KZ'): Promise<number | null> {
  if (!currency || currency === base) return 1;
  const { data, error } = await supabase.from('exchange_rates').select('rate').eq('currency', currency).order('fetched_at', { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  return Number((data as any).rate) || null;
}

export async function convert(amount: number, from: string, to = 'KZ'): Promise<number> {
  if (from === to) return amount;
  const rateFrom = await getLatestRate(from, to);
  const rateTo = await getLatestRate(to, to);
  if (!rateFrom || !rateTo) {
    // Fallback: if missing rates, assume 1:1
    return amount;
  }
  // rate is expressed as 1 from == rate units of base (to)
  // so to convert amount in `from` to `to` (base) multiply by rateFrom
  return amount * rateFrom;
}

export function sumMoney(items: Money[], targetCurrency = 'KZ') {
  // Note: this helper expects amounts already converted to targetCurrency
  return items.reduce((s, it) => s + it.amount, 0);
}

export async function computeQuoteTotal(quote: any, quantity = 1, targetCurrency = 'KZ') {
  // quote: object with preco_unitario, moeda, frete (object with type/value/moeda?), seguro, iva_percent, taxas_alfandega (array), outras_despesas (array)
  const unit = Number(quote.preco_unitario || 0);
  const moeda = quote.moeda || 'KZ';

  const priceTotal = await convert(unit * quantity, moeda, targetCurrency);

  // frete can be { type: 'fixed'|'variable'|'free', value: number, currency }
  let freteTotal = 0;
  if (quote.frete) {
    try {
      if (quote.frete.type === 'free') freteTotal = 0;
      else {
        const val = Number(quote.frete.value || 0);
        const cur = quote.frete.currency || moeda;
        freteTotal = await convert(val, cur, targetCurrency);
      }
    } catch {}
  }

  const seguro = await convert(Number(quote.seguro || 0), quote.seguro_moeda || moeda, targetCurrency);

  // outras_despesas: array of {label, amount, currency}
  let outrasTotal = 0;
  if (Array.isArray(quote.outras_despesas)) {
    for (const d of quote.outras_despesas) {
      const a = Number(d.amount || 0);
      const c = d.currency || moeda;
      outrasTotal += await convert(a, c, targetCurrency);
    }
  }

  // taxas alfandega: array
  let taxasTotal = 0;
  if (Array.isArray(quote.taxas_alfandega)) {
    for (const t of quote.taxas_alfandega) {
      const a = Number(t.amount || 0);
      const c = t.currency || moeda;
      taxasTotal += await convert(a, c, targetCurrency);
    }
  }

  const subtotal = priceTotal + freteTotal + seguro + outrasTotal + taxasTotal;

  const ivaPct = Number(quote.iva_percent || 0);
  const iva = (ivaPct > 0) ? (subtotal * (ivaPct / 100)) : 0;

  const total = subtotal + iva;

  return {
    priceTotal,
    freteTotal,
    seguro,
    outrasTotal,
    taxasTotal,
    iva,
    subtotal,
    total,
    currency: targetCurrency,
  };
}

export async function computeItemQuotesTotals(itemId: string, quantity = 1, targetCurrency = 'KZ') {
  // fetch quotes from DB and compute totals for each
  const { data, error } = await supabase.from('goal_item_quotes').select('*').eq('item_id', itemId);
  if (error) throw error;
  const quotes = data || [];
  const results = [] as any[];
  for (const q of quotes) {
    const totals = await computeQuoteTotal(q, quantity, targetCurrency);
    results.push({ quote: q, totals });
  }
  // sort by totals.total ascending
  results.sort((a, b) => (a.totals.total || 0) - (b.totals.total || 0));
  return results;
}

export async function batchConvertAmounts(items: { amount: number; currency: string }[], target = 'KZ') {
  // naive approach: fetch unique currencies rates then convert
  const uniques = Array.from(new Set(items.map((i) => i.currency))).filter((c) => c && c !== target);
  const rates: Record<string, number> = {};
  for (const cur of uniques) {
    const r = await getLatestRate(cur, target);
    rates[cur] = r || 1;
  }
  return items.map((it) => ({ original: it, converted: (it.currency === target ? it.amount : (it.amount * (rates[it.currency] || 1))), currency: target }));
}

export async function computeSimulationForCofre(cofreId: string, targetCurrency = 'KZ') {
  // Fetch cofre balance and goal items, then compute best quotes and simulate purchases
  const { data: cofres } = await supabase.from('cofres').select('id,saldo').eq('id', cofreId).maybeSingle();
  const balance = cofres ? Number((cofres as any).saldo || 0) : 0;

  const { data: items } = await supabase.from('goal_items').select('*').eq('cofre_id', cofreId);
  const goalItems = items || [];

  const enriched: any[] = [];
  for (const it of goalItems) {
    // compute best totals for this item
    const quotesRes = await computeItemQuotesTotals(it.id, it.quantidade || 1, targetCurrency);
    let best: any = null;
    if (quotesRes && quotesRes.length > 0) best = quotesRes[0];
    else {
      // fallback: use item preco_unitario
      const total = await convert(Number(it.preco_unitario || 0) * (it.quantidade || 1), it.moeda || 'KZ', targetCurrency);
      best = { quote: null, totals: { total, priceTotal: total } };
    }
    enriched.push({ item: it, bestTotal: Number(best.totals.total || 0), bestQuote: best.quote ?? null, quantity: it.quantidade || 1 });
  }

  // sort by cheapest total first
  enriched.sort((a, b) => a.bestTotal - b.bestTotal);

  // simulate purchases
  let remaining = balance;
  const purchases: any[] = [];
  for (const e of enriched) {
    if (e.bestTotal <= remaining) {
      purchases.push({ item: e.item, cost: e.bestTotal, fornecedor: e.bestQuote ? e.bestQuote.fornecedor : null });
      remaining -= e.bestTotal;
    }
  }

  const totalNeeded = enriched.reduce((s, x) => s + Number(x.bestTotal || 0), 0);

  return {
    cofreId,
    balance,
    items: enriched,
    purchases,
    remaining,
    totalNeeded,
    canBuyAll: purchases.length === enriched.length,
    currency: targetCurrency,
  };
}

// create alert record when simulation determines shortfall
export async function createSimulationAlertIfNeeded(simResult: any) {
  try {
    if (!simResult) return null;
    if (!simResult.canBuyAll) {
      const payload = {
        cofre_id: simResult.cofreId,
        tipo: 'insufficient_funds',
        titulo: 'Saldo insuficiente para todos os itens',
        corpo: `Saldo: ${simResult.balance} — Necessário: ${simResult.totalNeeded}`,
      };
      await supabase.from('alerts').insert([payload]);
      return true;
    }
    return false;
  } catch (e) {
    console.error('createSimulationAlertIfNeeded', e);
    return null;
  }
}
