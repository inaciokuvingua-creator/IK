// Safe expression evaluator + financial math engine
// No eval() — pure parser/interpreter

export type CalcStep = { description: string; value: number | string };
export type CalcResult = { value: number; steps: CalcStep[]; formatted: string; error?: string };

// ── Tokeniser ─────────────────────────────────────────────────────────────────
type Token =
  | { type: 'num'; val: number }
  | { type: 'op'; val: string }
  | { type: 'lparen' | 'rparen' }
  | { type: 'ident'; val: string };

function tokenise(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = expr.replace(/\s+/g, '').toUpperCase();
  while (i < s.length) {
    const ch = s[i];
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(s[i + 1] ?? ''))) {
      let n = '';
      while (i < s.length && /[\d.]/.test(s[i])) n += s[i++];
      tokens.push({ type: 'num', val: parseFloat(n) });
    } else if (/[A-Z_]/.test(ch)) {
      let id = '';
      while (i < s.length && /[A-Z0-9_]/.test(s[i])) id += s[i++];
      tokens.push({ type: 'ident', val: id });
    } else if ('+-*/%^'.includes(ch)) {
      tokens.push({ type: 'op', val: ch }); i++;
    } else if (ch === '(') { tokens.push({ type: 'lparen' }); i++; }
    else if (ch === ')') { tokens.push({ type: 'rparen' }); i++; }
    else if (ch === ',') { tokens.push({ type: 'op', val: ',' }); i++; }
    else if (ch === '!') { tokens.push({ type: 'op', val: '!' }); i++; }
    else i++;
  }
  return tokens;
}

// ── Recursive descent parser ──────────────────────────────────────────────────
class Parser {
  private tokens: Token[];
  private pos = 0;
  constructor(tokens: Token[]) { this.tokens = tokens; }

  private peek() { return this.tokens[this.pos]; }
  private consume() { return this.tokens[this.pos++]; }
  private expect(type: string) {
    const t = this.consume();
    if (!t || t.type !== type) throw new Error(`Expected ${type}`);
    return t;
  }

  parse(): number { return this.parseExpr(); }

  private parseExpr(): number { return this.parseAddSub(); }

  private parseAddSub(): number {
    let left = this.parseMulDiv();
    while (this.peek()?.type === 'op' && '+-'.includes((this.peek() as any).val)) {
      const op = (this.consume() as any).val;
      const right = this.parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private parseMulDiv(): number {
    let left = this.parsePower();
    while (this.peek()?.type === 'op' && '*/%'.includes((this.peek() as any).val)) {
      const op = (this.consume() as any).val;
      const right = this.parsePower();
      if (op === '*') left *= right;
      else if (op === '/') { if (right === 0) throw new Error('Divisão por zero'); left /= right; }
      else left %= right;
    }
    return left;
  }

  private parsePower(): number {
    let base = this.parseUnary();
    if (this.peek()?.type === 'op' && (this.peek() as any).val === '^') {
      this.consume();
      const exp = this.parsePower(); // right-associative
      base = Math.pow(base, exp);
    }
    return base;
  }

  private parseUnary(): number {
    if (this.peek()?.type === 'op' && (this.peek() as any).val === '-') {
      this.consume(); return -this.parsePostfix();
    }
    if (this.peek()?.type === 'op' && (this.peek() as any).val === '+') {
      this.consume(); return this.parsePostfix();
    }
    return this.parsePostfix();
  }

  private parsePostfix(): number {
    let v = this.parsePrimary();
    if (this.peek()?.type === 'op' && (this.peek() as any).val === '!') {
      this.consume(); v = factorial(Math.round(v));
    }
    return v;
  }

  private parsePrimary(): number {
    const t = this.peek();
    if (!t) throw new Error('Expressão incompleta');
    if (t.type === 'num') { this.consume(); return t.val; }
    if (t.type === 'lparen') {
      this.consume();
      const v = this.parseExpr();
      this.expect('rparen');
      return v;
    }
    if (t.type === 'ident') {
      this.consume();
      const name = t.val;
      if (this.peek()?.type === 'lparen') {
        this.consume();
        const args: number[] = [];
        while (this.peek()?.type !== 'rparen') {
          if (args.length) { this.expect('op'); } // consume comma
          args.push(this.parseExpr());
        }
        this.expect('rparen');
        return callFunction(name, args);
      }
      // Named constants
      const constants: Record<string, number> = { PI: Math.PI, E: Math.E, TAU: 2 * Math.PI };
      if (name in constants) return constants[name];
      throw new Error(`Identificador desconhecido: ${name}`);
    }
    throw new Error(`Token inesperado: ${JSON.stringify(t)}`);
  }
}

function factorial(n: number): number {
  if (n < 0) throw new Error('Fatorial de negativo');
  if (n === 0 || n === 1) return 1;
  if (n > 170) return Infinity;
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
}

function callFunction(name: string, args: number[]): number {
  const a = args[0] ?? 0;
  const b = args[1] ?? 0;
  const c = args[2] ?? 0;
  switch (name) {
    // Math
    case 'SUM':    return args.reduce((s, x) => s + x, 0);
    case 'AVERAGE':case 'AVG': return args.reduce((s,x)=>s+x,0)/args.length;
    case 'MIN':    return Math.min(...args);
    case 'MAX':    return Math.max(...args);
    case 'COUNT':  return args.length;
    case 'ABS':    return Math.abs(a);
    case 'SQRT':   return Math.sqrt(a);
    case 'POWER':  return Math.pow(a, b);
    case 'MOD':    return a % b;
    case 'ROUND':  return b !== 0 ? parseFloat(a.toFixed(b)) : Math.round(a);
    case 'ROUNDUP': return b !== 0 ? Math.ceil(a * 10**b) / 10**b : Math.ceil(a);
    case 'ROUNDDOWN': return b !== 0 ? Math.floor(a * 10**b) / 10**b : Math.floor(a);
    case 'FLOOR':  return b !== 0 ? Math.floor(a / b) * b : Math.floor(a);
    case 'CEIL':   return Math.ceil(a);
    case 'LOG':    return b !== 0 ? Math.log(a) / Math.log(b) : Math.log10(a);
    case 'LN':     return Math.log(a);
    case 'LOG10':  return Math.log10(a);
    case 'LOG2':   return Math.log2(a);
    case 'EXP':    return Math.exp(a);
    case 'RAND':   return Math.random();
    case 'RANDBETWEEN': return Math.floor(Math.random() * (b - a + 1)) + a;
    case 'SIGN':   return Math.sign(a);
    case 'TRUNC':  return Math.trunc(a);
    case 'FACT':   return factorial(Math.round(a));
    // Trig
    case 'SIN':    return Math.sin(a);
    case 'COS':    return Math.cos(a);
    case 'TAN':    return Math.tan(a);
    case 'ASIN':   return Math.asin(a);
    case 'ACOS':   return Math.acos(a);
    case 'ATAN':   return Math.atan(a);
    case 'ATAN2':  return Math.atan2(a, b);
    case 'SINH':   return Math.sinh(a);
    case 'COSH':   return Math.cosh(a);
    case 'TANH':   return Math.tanh(a);
    case 'DEGREES':return a * (180 / Math.PI);
    case 'RADIANS':return a * (Math.PI / 180);
    // Statistical
    case 'VAR': {
      const mean = args.reduce((s,x)=>s+x,0)/args.length;
      return args.reduce((s,x)=>s+(x-mean)**2,0)/args.length;
    }
    case 'STDEV': {
      const mean = args.reduce((s,x)=>s+x,0)/args.length;
      return Math.sqrt(args.reduce((s,x)=>s+(x-mean)**2,0)/args.length);
    }
    case 'MEDIAN': {
      const sorted = [...args].sort((x,y)=>x-y);
      const m = Math.floor(sorted.length/2);
      return sorted.length%2 ? sorted[m] : (sorted[m-1]+sorted[m])/2;
    }
    case 'GCD': { let x=Math.abs(Math.round(a)),y=Math.abs(Math.round(b)); while(y){[x,y]=[y,x%y];} return x; }
    case 'LCM': { const x=Math.abs(Math.round(a)), y=Math.abs(Math.round(b)); const g=callFunction('GCD',[x,y]); return (x*y)/g; }
    case 'PERCENTILE': {
      // PERCENTILE(p, v1, v2, ...)  p is [0-100]
      const sorted2=[...args.slice(1)].sort((x,y)=>x-y);
      const idx=(a/100)*(sorted2.length-1);
      const lo=Math.floor(idx),hi=Math.ceil(idx);
      return sorted2[lo]+(sorted2[hi]-sorted2[lo])*(idx-lo);
    }
    // Financial
    case 'PMT': {
      // PMT(rate_period, nper, pv)
      if (a === 0) return b !== 0 ? -c / b : 0;
      return -(c * a * Math.pow(1+a,b)) / (Math.pow(1+a,b)-1);
    }
    case 'FV': {
      // FV(rate, nper, pmt, pv=0)
      const pv = args[3] ?? 0;
      if (a === 0) return -(pv + b * c);
      return -(pv * Math.pow(1+a,b) + c * (Math.pow(1+a,b)-1)/a);
    }
    case 'PV': {
      // PV(rate, nper, pmt, fv=0)
      const fv = args[3] ?? 0;
      if (a === 0) return -(b*c + fv);
      return -(c * (1-Math.pow(1+a,-b))/a + fv * Math.pow(1+a,-b));
    }
    case 'NPER': {
      // NPER(rate, pmt, pv, fv=0)
      const fv2 = args[3] ?? 0;
      if (a === 0) return -(c + fv2) / b;
      return Math.log((b - fv2*a)/(b + c*a)) / Math.log(1+a);
    }
    case 'RATE': {
      // RATE(nper, pmt, pv, fv=0) — Newton-Raphson approximation
      const fv3 = args[3] ?? 0;
      let r = 0.1;
      for (let i = 0; i < 100; i++) {
        const f = c*Math.pow(1+r,a)+b*(Math.pow(1+r,a)-1)/r+fv3;
        const df = a*c*Math.pow(1+r,a-1)+b*(a*r*Math.pow(1+r,a-1)-(Math.pow(1+r,a)-1))/(r*r);
        const nr = r - f/df;
        if (Math.abs(nr - r) < 1e-10) { r = nr; break; }
        r = nr;
      }
      return r;
    }
    case 'NPV': {
      // NPV(rate, cf1, cf2, ...)
      return args.slice(1).reduce((s,cf,i)=>s+cf/Math.pow(1+a,i+1),0);
    }
    case 'IRR': {
      // IRR(cf0, cf1, ...) — Newton-Raphson
      let r = 0.1;
      for (let i = 0; i < 100; i++) {
        const f = args.reduce((s,cf,j)=>s+cf/Math.pow(1+r,j),0);
        const df = args.reduce((s,cf,j)=>s-j*cf/Math.pow(1+r,j+1),0);
        if (Math.abs(df) < 1e-15) break;
        const nr = r - f/df;
        if (Math.abs(nr-r) < 1e-10) { r = nr; break; }
        r = nr;
      }
      return r;
    }
    case 'IPMT': {
      // IPMT(rate, per, nper, pv)
      const pmt = callFunction('PMT',[a,c,b === undefined ? 0 : args[3]??0]);
      return -(args[3]??0) * a * Math.pow(1+a, b-1) - pmt * (Math.pow(1+a,b-1)-1);
    }
    // Conversions
    case 'C_TO_F': return a * 9/5 + 32;
    case 'F_TO_C': return (a - 32) * 5/9;
    case 'KG_TO_LB': return a * 2.20462;
    case 'LB_TO_KG': return a / 2.20462;
    case 'KM_TO_MI': return a * 0.621371;
    case 'MI_TO_KM': return a / 0.621371;
    case 'M_TO_FT': return a * 3.28084;
    case 'FT_TO_M': return a / 3.28084;
    case 'L_TO_GAL': return a * 0.264172;
    case 'GAL_TO_L': return a / 0.264172;
    // Conditional (simple)
    case 'IF': return a ? b : c;
    case 'MAX2': return Math.max(a, b);
    case 'MIN2': return Math.min(a, b);
    case 'NOT': return a ? 0 : 1;
    case 'AND': return args.every(x=>x!==0) ? 1 : 0;
    case 'OR':  return args.some(x=>x!==0) ? 1 : 0;

    default: throw new Error(`Função desconhecida: ${name}`);
  }
}

// ── Main evaluator ────────────────────────────────────────────────────────────
export function evaluate(expr: string): CalcResult {
  try {
    const cleaned = preprocessExpr(expr);
    const tokens = tokenise(cleaned);
    const parser = new Parser(tokens);
    const value = parser.parse();
    if (!isFinite(value) || isNaN(value)) throw new Error('Resultado inválido');
    return {
      value,
      steps: [],
      formatted: formatNum(value),
    };
  } catch (e: any) {
    return { value: NaN, steps: [], formatted: 'Erro', error: e.message ?? 'Erro desconhecido' };
  }
}

function preprocessExpr(expr: string): string {
  // Replace × ÷ with * /
  return expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/√\s*\(/g, 'SQRT(')
    .replace(/√(\d+\.?\d*)/g, 'SQRT($1)')
    .replace(/π/g, 'PI')
    .replace(/\^/g, '^')
    // implicit multiplication: 2( → 2*(   )( → )*(
    .replace(/(\d)\s*\(/g, '$1*(')
    .replace(/\)\s*(\d)/g, ')*$1');
}

export function formatNum(n: number, decimals?: number): string {
  if (!isFinite(n) || isNaN(n)) return 'Erro';
  if (n === Math.round(n) && Math.abs(n) < 1e15) {
    return new Intl.NumberFormat('pt-AO', { maximumFractionDigits: decimals ?? 0 }).format(n);
  }
  const str = parseFloat(n.toPrecision(10)).toString();
  // Use pt-AO grouping for large numbers
  const parts = str.split('.');
  parts[0] = new Intl.NumberFormat('pt-AO').format(parseFloat(parts[0]));
  return parts.join(',');
}

// ── Financial calculators ─────────────────────────────────────────────────────
export type FinancialResult = {
  label: string;
  value: number;
  formatted: string;
  steps: CalcStep[];
};

export function calcSimpleInterest(principal: number, ratePercent: number, timePeriods: number): FinancialResult {
  const r = ratePercent / 100;
  const interest = principal * r * timePeriods;
  const total = principal + interest;
  return {
    label: 'Juros Simples',
    value: interest,
    formatted: formatNum(interest, 2),
    steps: [
      { description: `Principal × Taxa × Tempo`, value: `${formatNum(principal)} × ${ratePercent}% × ${timePeriods}` },
      { description: 'Juros', value: formatNum(interest, 2) },
      { description: 'Total (Principal + Juros)', value: formatNum(total, 2) },
    ],
  };
}

export function calcCompoundInterest(principal: number, ratePercent: number, periods: number, perYear = 1): FinancialResult {
  const r = ratePercent / 100 / perYear;
  const n = periods * perYear;
  const amount = principal * Math.pow(1 + r, n);
  const interest = amount - principal;
  return {
    label: 'Juros Compostos',
    value: amount,
    formatted: formatNum(amount, 2),
    steps: [
      { description: `P × (1 + r/n)^(n×t)`, value: '' },
      { description: `${formatNum(principal)} × (1 + ${ratePercent}%/${perYear})^(${perYear}×${periods})` , value: '' },
      { description: 'Juros acumulados', value: formatNum(interest, 2) },
      { description: 'Montante final', value: formatNum(amount, 2) },
    ],
  };
}

export function calcLoan(principal: number, annualRatePercent: number, months: number): FinancialResult {
  const r = annualRatePercent / 100 / 12;
  const pmt = r === 0 ? principal / months : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const total = pmt * months;
  const interest = total - principal;
  return {
    label: 'Prestação Mensal',
    value: pmt,
    formatted: formatNum(pmt, 2),
    steps: [
      { description: 'Principal', value: formatNum(principal, 2) },
      { description: 'Taxa mensal', value: `${formatNum(annualRatePercent / 12, 4)}%` },
      { description: 'Prazo', value: `${months} meses` },
      { description: 'Prestação mensal', value: formatNum(pmt, 2) },
      { description: 'Total pago', value: formatNum(total, 2) },
      { description: 'Total de juros', value: formatNum(interest, 2) },
    ],
  };
}

export function calcROI(investment: number, gain: number): FinancialResult {
  const roi = ((gain - investment) / investment) * 100;
  return {
    label: 'ROI',
    value: roi,
    formatted: `${formatNum(roi, 2)}%`,
    steps: [
      { description: '(Ganho − Investimento) ÷ Investimento × 100', value: '' },
      { description: 'Lucro', value: formatNum(gain - investment, 2) },
      { description: 'ROI', value: `${formatNum(roi, 2)}%` },
    ],
  };
}

export function calcMargin(cost: number, salePrice: number): FinancialResult {
  const margin = ((salePrice - cost) / salePrice) * 100;
  const markup = ((salePrice - cost) / cost) * 100;
  return {
    label: 'Margem de Lucro',
    value: margin,
    formatted: `${formatNum(margin, 2)}%`,
    steps: [
      { description: 'Custo', value: formatNum(cost, 2) },
      { description: 'Preço de venda', value: formatNum(salePrice, 2) },
      { description: 'Lucro bruto', value: formatNum(salePrice - cost, 2) },
      { description: 'Margem', value: `${formatNum(margin, 2)}%` },
      { description: 'Markup', value: `${formatNum(markup, 2)}%` },
    ],
  };
}

export function calcBreakeven(fixedCosts: number, pricePerUnit: number, variableCostPerUnit: number): FinancialResult {
  const contribution = pricePerUnit - variableCostPerUnit;
  if (contribution <= 0) throw new Error('Preço deve ser maior que custo variável');
  const units = fixedCosts / contribution;
  const revenue = units * pricePerUnit;
  return {
    label: 'Ponto de Equilíbrio',
    value: units,
    formatted: formatNum(units, 0),
    steps: [
      { description: 'Margem de contribuição por unidade', value: formatNum(contribution, 2) },
      { description: 'Unidades mínimas', value: formatNum(units, 0) },
      { description: 'Receita mínima', value: formatNum(revenue, 2) },
    ],
  };
}

export function calcVAT(amount: number, vatPercent: number, inclusive: boolean): FinancialResult {
  const r = vatPercent / 100;
  const vat = inclusive ? amount - amount / (1 + r) : amount * r;
  const total = inclusive ? amount : amount + vat;
  const base = inclusive ? amount - vat : amount;
  return {
    label: 'IVA',
    value: vat,
    formatted: formatNum(vat, 2),
    steps: [
      { description: 'Valor base', value: formatNum(base, 2) },
      { description: `IVA (${vatPercent}%)`, value: formatNum(vat, 2) },
      { description: 'Total', value: formatNum(total, 2) },
    ],
  };
}

export function calcPercentage(value: number, percent: number, mode: 'of' | 'increase' | 'decrease' | 'what'): FinancialResult {
  let result: number;
  let label: string;
  let steps: CalcStep[];
  if (mode === 'of') {
    result = (value * percent) / 100;
    label = `${percent}% de ${formatNum(value)}`;
    steps = [{ description: `${formatNum(value)} × ${percent}% = `, value: formatNum(result, 2) }];
  } else if (mode === 'increase') {
    result = value * (1 + percent / 100);
    label = `${formatNum(value)} + ${percent}%`;
    steps = [{ description: 'Valor aumentado', value: formatNum(result, 2) }];
  } else if (mode === 'decrease') {
    result = value * (1 - percent / 100);
    label = `${formatNum(value)} − ${percent}%`;
    steps = [{ description: 'Valor reduzido', value: formatNum(result, 2) }];
  } else {
    result = (percent / value) * 100;
    label = `${formatNum(percent)} é quanto % de ${formatNum(value)}?`;
    steps = [{ description: 'Percentagem', value: `${formatNum(result, 2)}%` }];
  }
  return { label, value: result, formatted: formatNum(result, 2), steps };
}
