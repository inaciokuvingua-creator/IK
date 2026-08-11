import { supabase } from './supabase';

export type Money = { amount: number; currency: string };

export type CofreSimulationItem = {
  item: any;
  bestTotal: number;
  bestQuote: any;
  quantity: number;
};

export type CofreSimulation = {
  cofreId: string;
  cofreName: string | null;
  balance: number;
  goalTotal: number;
  goalProgress: number;
  totalNeeded: number;
  canBuyAll: boolean;
  currency: string;
  items: CofreSimulationItem[];
  purchases: Array<{ item: any; cost: number; fornecedor: string | null }>;
  remaining: number;
  reserve: number;
  safeBudget: number;
  inflows30Days: number;
  outflows30Days: number;
  net30Days: number;
  projectedMonthlyNet: number;
  estimatedDaysToGoal: number | null;
  runwayDays: number | null;
  riskLevel: 'low' | 'medium' | 'high';
  healthScore: number;
  recommendations: string[];
  summary: string;
  message: string;
  saldo_atual: number;
  meta_total: number;
};

function asDate(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

function getTxValue(tx: any) {
  const amount = Number(tx?.valor ?? 0);
  return tx?.tipo === 'saida' ? -Math.abs(amount) : Math.abs(amount);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

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

export async function computeSimulationForCofre(cofreId: string, targetCurrency = 'KZ'): Promise<CofreSimulation> {
  // Fetch cofre balance, goal items and recent transactions, then simulate with reserve-aware budgeting.
  const { data: cofreRow } = await supabase.from('cofres').select('id,nome,saldo,meta').eq('id', cofreId).maybeSingle();
  const balance = cofreRow ? Number((cofreRow as any).saldo || 0) : 0;
  const meta = cofreRow ? Number((cofreRow as any).meta || 0) : 0;

  const { data: txRows } = await supabase
    .from('transacoes')
    .select('id,tipo,valor,data_transacao,created_at,descricao,categoria')
    .eq('cofre_id', cofreId)
    .order('data_transacao', { ascending: false });

  const transactions = (txRows ?? []) as any[];
  const now = new Date();
  const tx30Days = transactions.filter((tx) => daysBetween(asDate(tx.data_transacao ?? tx.created_at), now) <= 30);
  const inflows30Days = round(tx30Days.filter((tx) => tx.tipo === 'entrada').reduce((sum, tx) => sum + Number(tx.valor ?? 0), 0));
  const outflows30Days = round(tx30Days.filter((tx) => tx.tipo === 'saida').reduce((sum, tx) => sum + Number(tx.valor ?? 0), 0));
  const net30Days = round(inflows30Days - outflows30Days);
  const projectedMonthlyNet = round(net30Days);

  const reserveFromHistory = outflows30Days > 0 ? outflows30Days * 0.35 : Math.max(balance * 0.1, 0);
  const reserveFromGoal = meta > 0 ? Math.max(meta * 0.1, 0) : 0;
  const reserve = round(Math.max(reserveFromHistory, reserveFromGoal));
  const safeBudget = round(Math.max(0, balance - reserve));

  const { data: items } = await supabase.from('goal_items').select('*').eq('cofre_id', cofreId);
  const goalItems = items || [];

  const enriched: CofreSimulationItem[] = [];
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
  let remaining = safeBudget;
  const purchases: any[] = [];
  for (const e of enriched) {
    if (e.bestTotal <= remaining) {
      purchases.push({ item: e.item, cost: e.bestTotal, fornecedor: e.bestQuote ? e.bestQuote.fornecedor : null });
      remaining -= e.bestTotal;
    }
  }

  const totalNeeded = enriched.reduce((s, x) => s + Number(x.bestTotal || 0), 0);
  const goalTotal = meta > 0 ? meta : totalNeeded;
  const goalProgress = goalTotal > 0 ? round(Math.min(100, (balance / goalTotal) * 100)) : 0;
  const estimatedDaysToGoal = meta > balance && projectedMonthlyNet > 0
    ? Math.ceil(((meta - balance) / projectedMonthlyNet) * 30)
    : meta > 0 && balance >= meta
      ? 0
      : null;
  const runwayDays = projectedMonthlyNet < 0
    ? Math.floor(balance / Math.abs(projectedMonthlyNet / 30 || 1))
    : null;

  const recommendations: string[] = [];
  if (meta > 0) {
    const gap = round(Math.max(0, meta - balance));
    if (gap > 0) {
      recommendations.push(`Faltam ${gap.toLocaleString('pt-AO')} para atingir a meta deste cofre.`);
      if (estimatedDaysToGoal !== null && estimatedDaysToGoal > 0) {
        recommendations.push(`Ao ritmo atual, a meta fica a aproximadamente ${estimatedDaysToGoal} dias.`);
      }
    } else {
      recommendations.push('A meta deste cofre já foi atingida. Considere proteger um fundo de reserva antes de novas compras.');
    }
  }
  if (projectedMonthlyNet < 0) {
    recommendations.push('O fluxo recente está negativo. Reduza saídas ou adie compras menos urgentes.');
  } else if (projectedMonthlyNet > 0) {
    recommendations.push('O fluxo recente está positivo. Há espaço para reforçar a meta sem comprometer o cofre.');
  }
  if (safeBudget < totalNeeded) {
    recommendations.push('O orçamento seguro não cobre todos os itens. A simulação priorizou os mais baratos primeiro.');
  }
  if (goalItems.length === 0) {
    recommendations.push('Adicione itens da meta para obter uma simulação de compras mais precisa.');
  }

  const canBuyAll = purchases.length === enriched.length && totalNeeded <= safeBudget;
  const riskLevel: CofreSimulation['riskLevel'] = projectedMonthlyNet < 0 && balance < meta
    ? 'high'
    : projectedMonthlyNet < 0 || safeBudget < totalNeeded
      ? 'medium'
      : 'low';
  const healthScore = Math.max(0, Math.min(100,
    45
    + (projectedMonthlyNet > 0 ? 18 : projectedMonthlyNet < 0 ? -18 : 0)
    + (meta > 0 && balance >= meta ? 15 : meta > 0 ? -8 : 4)
    + (canBuyAll ? 12 : -8)
    + (transactions.length > 0 ? 8 : -6)
  ));

  const summary = recommendations[0]
    ?? (canBuyAll
      ? 'A simulação inteligente indica que o cofre suporta todos os itens priorizados com reserva protegida.'
      : 'A simulação inteligente priorizou o orçamento seguro para evitar comprometer o cofre.');

  return {
    cofreId,
    cofreName: (cofreRow as any)?.nome ?? null,
    balance,
    goalTotal,
    goalProgress,
    totalNeeded,
    canBuyAll,
    currency: targetCurrency,
    items: enriched,
    purchases,
    remaining,
    reserve,
    safeBudget,
    inflows30Days,
    outflows30Days,
    net30Days,
    projectedMonthlyNet,
    estimatedDaysToGoal,
    runwayDays,
    riskLevel,
    healthScore,
    recommendations,
    summary,
    message: summary,
    saldo_atual: balance,
    meta_total: goalTotal,
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
