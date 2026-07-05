import {
  useState, useEffect, useRef, useCallback, useLayoutEffect,
} from 'react';
import {
  Calculator, X, Minus, Maximize2, Minimize2, ChevronUp,
  ChevronDown, History, BookOpen, Send, Copy, Check,
  RotateCcw, Star, Trash2, Plus, Brain, ArrowRight,
  TrendingUp, Percent, RefreshCw, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  evaluate, formatNum, calcSimpleInterest, calcCompoundInterest,
  calcLoan, calcROI, calcMargin, calcBreakeven, calcVAT, calcPercentage,
  type CalcStep,
} from '../lib/calcEngine';

// ── Types ─────────────────────────────────────────────────────────────────────
type HistoryEntry = {
  id: string; expression: string; result: string;
  label?: string; category?: string; favourited: boolean; created_at: string;
};

type FinancialMode =
  | 'none' | 'juros_simples' | 'juros_compostos' | 'emprestimo'
  | 'roi' | 'margem' | 'breakeven' | 'iva' | 'percentagem';

const FINANCIAL_MODES: { id: FinancialMode; label: string; icon: string }[] = [
  { id: 'percentagem',   label: '% Percentagem',      icon: '🔢' },
  { id: 'iva',           label: 'IVA',                 icon: '🧾' },
  { id: 'margem',        label: 'Margem / Markup',     icon: '💹' },
  { id: 'roi',           label: 'ROI',                 icon: '📈' },
  { id: 'juros_simples', label: 'Juros Simples',       icon: '💰' },
  { id: 'juros_compostos',label: 'Juros Compostos',    icon: '🏦' },
  { id: 'emprestimo',    label: 'Prestação / Empréstimo', icon: '🏠' },
  { id: 'breakeven',     label: 'Break-even',          icon: '⚖️' },
];

const QUICK_FORMULAS = [
  { label: 'IVA 14%',  expr: '* 1.14',    tip: 'Adicionar IVA 14%' },
  { label: 'IVA −14%', expr: '/ 1.14',    tip: 'Remover IVA 14%' },
  { label: '10%',      expr: '* 0.10',    tip: '10% do valor' },
  { label: '25%',      expr: '* 0.25',    tip: '25% do valor' },
  { label: '50%',      expr: '* 0.50',    tip: 'Metade' },
  { label: '2×',       expr: '* 2',       tip: 'Duplicar' },
  { label: '√',        expr: 'SQRT(',     tip: 'Raiz quadrada' },
  { label: 'x²',       expr: '^2',        tip: 'Ao quadrado' },
];

// ── NInput: numeric field for financial forms ─────────────────────────────────
function NInput({
  label, value, onChange, placeholder = '0', unit = '',
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; unit?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 placeholder-gray-600 pr-10"
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{unit}</span>}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function FloatingCalculator() {
  const { user } = useAuth();

  // Visibility / layout
  const [open, setOpen]           = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [tab, setTab]             = useState<'calc'|'finance'|'history'|'library'>('calc');

  // Position (draggable)
  const [pos, setPos]   = useState({ x: 24, y: -1 }); // -1 = use CSS default
  const dragStart       = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const panelRef        = useRef<HTMLDivElement>(null);

  // Calculator state
  const [display, setDisplay]   = useState('0');
  const [expression, setExpression] = useState('');
  const [memory, setMemory]     = useState<number>(0);
  const [memActive, setMemActive] = useState(false);
  const [history, setHistory]   = useState<HistoryEntry[]>([]);
  const [steps, setSteps]       = useState<CalcStep[]>([]);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [copied, setCopied]     = useState(false);
  const [justEvaled, setJustEvaled] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // AI query
  const [aiQuery, setAiQuery]   = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');

  // Financial mode
  const [finMode, setFinMode]   = useState<FinancialMode>('none');
  const [fin, setFin]           = useState<Record<string, string>>({});
  const [finResult, setFinResult] = useState<{ label: string; value: number; formatted: string; steps: CalcStep[] } | null>(null);

  // ── Load history ─────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('calc_history')
      .select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    setHistory((data ?? []) as HistoryEntry[]);
  }, [user]);

  useEffect(() => { if (open) loadHistory(); }, [open, loadHistory]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Init position to bottom-right
  useLayoutEffect(() => {
    if (pos.y === -1) {
      setPos({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
    }
  }, []);

  // ── Drag ─────────────────────────────────────────────────────────────────
  const onDragStart = (e: React.PointerEvent) => {
    if (fullscreen) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  };
  const onDragEnd = () => { dragStart.current = null; };

  // ── Calculator logic ──────────────────────────────────────────────────────
  const appendDigit = (d: string) => {
    if (justEvaled && /[\d.]/.test(d)) {
      setDisplay(d === '.' ? '0.' : d);
      setExpression('');
      setJustEvaled(false);
      return;
    }
    setJustEvaled(false);
    setDisplay(prev => {
      if (prev === '0' && d !== '.') return d;
      if (d === '.' && prev.includes('.')) return prev;
      return prev + d;
    });
  };

  const appendOp = (op: string) => {
    setJustEvaled(false);
    const val = display === 'Erro' ? '0' : display;
    setExpression(prev => {
      // If last char is operator, replace it
      const trimmed = prev.trimEnd();
      if (['+', '-', '*', '/', '^', '%'].some(o => trimmed.endsWith(o))) {
        return trimmed.slice(0, -1) + op;
      }
      return trimmed + val + op;
    });
    setDisplay('0');
  };

  const compute = () => {
    const full = expression + display;
    if (!full || full === '0') return;
    const res = evaluate(full);
    setSteps(res.steps);
    if (res.error) {
      setDisplay('Erro');
      setExpression(full + ' = Erro');
    } else {
      setDisplay(formatNum(res.value, 10).replace(/,/g, ''));
      setLastResult(res.value);
      setExpression(full + ' =');
      setJustEvaled(true);
      saveHistory(full, String(res.value));
    }
  };

  const clearAll = () => {
    setDisplay('0'); setExpression(''); setSteps([]);
    setLastResult(null); setJustEvaled(false);
  };
  const clearEntry = () => { setDisplay('0'); };
  const backspace   = () => {
    if (justEvaled) { clearAll(); return; }
    setDisplay(d => d.length > 1 ? d.slice(0, -1) : '0');
  };

  const toggleSign  = () => setDisplay(d => d.startsWith('-') ? d.slice(1) : d === '0' ? '0' : '-' + d);
  const toPercent   = () => {
    const v = parseFloat(display);
    if (!isNaN(v)) setDisplay(String(v / 100));
  };

  const memStore  = () => { setMemory(parseFloat(display) || 0); setMemActive(true); };
  const memRecall = () => { if (memActive) setDisplay(String(memory)); };
  const memAdd    = () => { setMemory(m => m + (parseFloat(display) || 0)); setMemActive(true); };
  const memClear  = () => { setMemory(0); setMemActive(false); };

  const applyQuickFormula = (expr: string) => {
    const val = lastResult ?? parseFloat(display) ?? 0;
    if (expr.startsWith('SQRT(')) {
      const res = evaluate(`SQRT(${val})`);
      if (!res.error) {
        setDisplay(String(res.value));
        setExpression(`SQRT(${val}) =`);
        setLastResult(res.value);
        saveHistory(`SQRT(${val})`, String(res.value));
      }
    } else {
      const full = `${val}${expr}`;
      setExpression(full);
      setDisplay('0');
      setJustEvaled(false);
    }
  };

  const saveHistory = async (expr: string, result: string) => {
    if (!user) return;
    await supabase.from('calc_history').insert({
      expression: expr, result, category: 'general',
    });
  };

  const copyResult = () => {
    const val = lastResult !== null ? String(lastResult) : display;
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ── AI query ─────────────────────────────────────────────────────────────
  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiAnswer('');

    // Pattern matching for common financial queries
    const q = aiQuery.toLowerCase();
    let answer = '';

    // "X% of Y"
    const pctOf = q.match(/(\d+(?:[.,]\d+)?)%\s+(?:de|of)\s+(\d+(?:[.,]\d+)?)/);
    if (pctOf) {
      const pct = parseFloat(pctOf[1]);
      const val = parseFloat(pctOf[2].replace(',', '.'));
      const res = (val * pct) / 100;
      answer = `${pct}% de ${formatNum(val)} = **${formatNum(res, 2)}**\n\nCálculo: ${val} × ${pct} ÷ 100 = ${formatNum(res, 2)}`;
      setDisplay(String(res)); setLastResult(res);
      saveHistory(`${pct}% de ${val}`, String(res));
    }
    // "quanto é X parcelas de Y"
    else if (q.match(/(\d+)\s*parcelas?\s+de\s+(\d+)/)) {
      const m = q.match(/(\d+)\s*parcelas?\s+de\s+(\d+(?:[.,]\d+)?)/)!;
      const n = parseInt(m[1]), p = parseFloat(m[2].replace(',', '.'));
      const total = n * p;
      answer = `${n} parcelas de ${formatNum(p, 2)} = **${formatNum(total, 2)}** total\n\nCálculo: ${n} × ${formatNum(p, 2)} = ${formatNum(total, 2)}`;
      setDisplay(String(total)); setLastResult(total);
    }
    // "iva de X"
    else if (q.match(/iva\s+de\s+(\d+(?:[.,]\d+)?)/)) {
      const m = q.match(/iva\s+de\s+(\d+(?:[.,]\d+)?)/)!;
      const val = parseFloat(m[1].replace(',', '.'));
      const vat = val * 0.14;
      const total = val + vat;
      answer = `IVA (14%) de ${formatNum(val, 2)}:\n\n**IVA = ${formatNum(vat, 2)}**\nTotal com IVA = ${formatNum(total, 2)}`;
      setDisplay(String(vat)); setLastResult(vat);
    }
    // margem
    else if (q.includes('margem') && q.match(/\d+/)) {
      const nums = q.match(/\d+(?:[.,]\d+)?/g)?.map(n => parseFloat(n.replace(',', '.')));
      if (nums && nums.length >= 2) {
        const [cost, price] = nums;
        const margin = ((price - cost) / price) * 100;
        const markup = ((price - cost) / cost) * 100;
        answer = `Custo: ${formatNum(cost, 2)} | Preço: ${formatNum(price, 2)}\n\n**Margem = ${formatNum(margin, 2)}%**\nMarkup = ${formatNum(markup, 2)}%\nLucro = ${formatNum(price - cost, 2)}`;
        setDisplay(String(parseFloat(margin.toFixed(2)))); setLastResult(margin);
      }
    }
    else {
      // Generic: try to extract and evaluate numbers/expression
      const mathExpr = aiQuery.replace(/[^\d+\-*/^().%,\s]/g, ' ').trim();
      if (mathExpr) {
        const res = evaluate(mathExpr);
        if (!res.error) {
          answer = `Resultado de "${aiQuery.trim()}":\n\n**${formatNum(res.value, 2)}**`;
          setDisplay(String(res.value)); setLastResult(res.value);
        } else {
          answer = `Não consegui interpretar automaticamente. Tente usar a calculadora directamente ou reformule como:\n• "15% de 250000"\n• "IVA de 50000"\n• "margem 30000 45000"\n• "12 parcelas de 5000"`;
        }
      } else {
        answer = `Não consegui interpretar. Exemplos que entendo:\n• "15% de 250000"\n• "IVA de 50000"\n• "margem custo preço"\n• "12 parcelas de 5000"`;
      }
    }

    setAiAnswer(answer);
    setAiLoading(false);
  };

  // ── Financial calculations ────────────────────────────────────────────────
  const runFinancial = () => {
    try {
      let r: typeof finResult = null;
      const n = (k: string) => parseFloat(fin[k] || '0');
      switch (finMode) {
        case 'juros_simples':  r = calcSimpleInterest(n('principal'), n('taxa'), n('tempo')); break;
        case 'juros_compostos':r = calcCompoundInterest(n('principal'), n('taxa'), n('tempo'), n('capitalizacao') || 1); break;
        case 'emprestimo':     r = calcLoan(n('valor'), n('taxa_anual'), n('meses')); break;
        case 'roi':            r = calcROI(n('investimento'), n('ganho')); break;
        case 'margem':         r = calcMargin(n('custo'), n('preco_venda')); break;
        case 'breakeven':      r = calcBreakeven(n('custos_fixos'), n('preco_unit'), n('custo_variavel')); break;
        case 'iva':            r = calcVAT(n('valor'), n('taxa_iva') || 14, fin['tipo'] === 'inclusivo'); break;
        case 'percentagem':    r = calcPercentage(n('valor'), n('percentagem'), (fin['modo'] as any) || 'of'); break;
      }
      setFinResult(r);
      if (r) {
        setLastResult(r.value);
        setDisplay(String(r.value));
        saveHistory(`[${r.label}]`, r.formatted);
      }
    } catch (e: any) {
      setFinResult({ label: 'Erro', value: NaN, formatted: 'Erro: ' + e.message, steps: [] });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // FAB trigger button (always visible)
  const fabStyle: React.CSSProperties = pos.y !== -1
    ? { position: 'fixed', left: pos.x - 28, top: pos.y - 28, zIndex: 9997 }
    : { position: 'fixed', right: 24, bottom: 24, zIndex: 9997 };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={fabStyle}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        title="Calculadora (Ctrl+K)"
        className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-2xl shadow-emerald-900/40 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 btn-ripple"
      >
        <Calculator size={22} />
      </button>
    );
  }

  const panelStyle: React.CSSProperties = fullscreen
    ? { position: 'fixed', inset: 0, zIndex: 9998 }
    : {
        position: 'fixed',
        left: Math.max(8, Math.min(pos.x - 170, window.innerWidth - 356)),
        top: Math.max(8, Math.min(pos.y - 30, window.innerHeight - (minimized ? 60 : 600))),
        width: 344,
        zIndex: 9998,
      };

  return (
    <div ref={panelRef} style={panelStyle}
      className={`bg-gray-950 border border-gray-700 ${fullscreen ? '' : 'rounded-2xl'} shadow-2xl flex flex-col overflow-hidden`}>

      {/* ── Title bar ── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-gray-900 border-b border-gray-800 cursor-move select-none shrink-0"
        onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd}>
        <Calculator size={14} className="text-emerald-400 shrink-0" />
        <span className="text-white text-xs font-bold flex-1">Calculadora IK Finance</span>
        <kbd className="hidden sm:inline-block text-gray-600 text-[10px] bg-gray-800 rounded px-1 py-0.5">Ctrl+K</kbd>
        <div className="flex gap-0.5 ml-1">
          <button onClick={() => setMinimized(m => !m)} title={minimized ? 'Expandir' : 'Minimizar'}
            className="w-6 h-6 rounded-lg hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            {minimized ? <ChevronDown size={12} /> : <Minus size={12} />}
          </button>
          <button onClick={() => setFullscreen(f => !f)} title={fullscreen ? 'Restaurar' : 'Tela cheia'}
            className="w-6 h-6 rounded-lg hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button onClick={() => setOpen(false)} title="Fechar"
            className="w-6 h-6 rounded-lg hover:bg-red-900/50 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors">
            <X size={12} />
          </button>
        </div>
      </div>

      {minimized ? null : (
        <>
          {/* ── Tabs ── */}
          <div className="flex border-b border-gray-800 bg-gray-900 shrink-0">
            {([
              { id: 'calc',    icon: '🔢', label: 'Calc' },
              { id: 'finance', icon: '💹', label: 'Finanças' },
              { id: 'history', icon: '🕐', label: 'Histórico' },
              { id: 'library', icon: '📚', label: 'IA' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-2 text-[10px] font-semibold transition-colors border-b-2 ${tab === t.id ? 'text-emerald-400 border-emerald-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                <span className="block text-sm leading-none mb-0.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── CALCULATOR TAB ── */}
          {tab === 'calc' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Display */}
              <div className="bg-gray-950 px-4 pt-4 pb-3 select-text">
                <p className="text-gray-600 text-xs h-5 truncate text-right">{expression || '\u00a0'}</p>
                <p className="text-white text-3xl font-bold text-right font-mono truncate mt-1">
                  {display.length > 14 ? parseFloat(display).toExponential(6) : display}
                </p>
                {memActive && <div className="flex justify-between mt-1"><span className="text-emerald-500 text-[10px] font-bold">M={formatNum(memory, 2)}</span></div>}
              </div>

              {/* Quick formulas */}
              <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto scrollbar-hide">
                {QUICK_FORMULAS.map(qf => (
                  <button key={qf.label} onClick={() => applyQuickFormula(qf.expr)}
                    title={qf.tip}
                    className="shrink-0 text-xs bg-gray-800 hover:bg-gray-700 text-emerald-400 px-2.5 py-1 rounded-lg border border-gray-700 hover:border-emerald-700 transition-colors">
                    {qf.label}
                  </button>
                ))}
              </div>

              {/* Memory row */}
              <div className="flex gap-1 px-3 pb-2">
                {[
                  ['MC', memClear],
                  ['MR', memRecall],
                  ['M+', memAdd],
                  ['MS', memStore],
                ].map(([label, fn]) => (
                  <button key={label as string} onClick={fn as any}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${memActive && (label === 'MR' || label === 'MC') ? 'bg-emerald-900/40 border-emerald-700 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'}`}>
                    {label as string}
                  </button>
                ))}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-4 gap-1.5 px-3 pb-3 flex-1">
                {(
                  [
                    ['C',    () => clearAll(),          'bg-red-900/40 text-red-400 hover:bg-red-900/60'],
                    ['⌫',   () => backspace(),          'bg-gray-800 text-amber-400 hover:bg-gray-700'],
                    ['%',    () => toPercent(),          'bg-gray-800 text-gray-200 hover:bg-gray-700'],
                    ['÷',    () => appendOp('/'),        'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'],
                    ['7',    () => appendDigit('7'),     'bg-gray-800 text-white hover:bg-gray-700'],
                    ['8',    () => appendDigit('8'),     'bg-gray-800 text-white hover:bg-gray-700'],
                    ['9',    () => appendDigit('9'),     'bg-gray-800 text-white hover:bg-gray-700'],
                    ['×',    () => appendOp('*'),        'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'],
                    ['4',    () => appendDigit('4'),     'bg-gray-800 text-white hover:bg-gray-700'],
                    ['5',    () => appendDigit('5'),     'bg-gray-800 text-white hover:bg-gray-700'],
                    ['6',    () => appendDigit('6'),     'bg-gray-800 text-white hover:bg-gray-700'],
                    ['−',    () => appendOp('-'),        'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'],
                    ['1',    () => appendDigit('1'),     'bg-gray-800 text-white hover:bg-gray-700'],
                    ['2',    () => appendDigit('2'),     'bg-gray-800 text-white hover:bg-gray-700'],
                    ['3',    () => appendDigit('3'),     'bg-gray-800 text-white hover:bg-gray-700'],
                    ['+',    () => appendOp('+'),        'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'],
                    ['±',    () => toggleSign(),         'bg-gray-800 text-white hover:bg-gray-700'],
                    ['0',    () => appendDigit('0'),     'bg-gray-800 text-white hover:bg-gray-700'],
                    [',',    () => appendDigit('.'),     'bg-gray-800 text-white hover:bg-gray-700'],
                    ['=',    () => compute(),            'bg-emerald-500 hover:bg-emerald-400 text-white font-bold'],
                  ] as [string, () => void, string][]
                ).map(([label, fn, cls]) => (
                  <button key={label} onClick={fn}
                    className={`${cls} rounded-xl h-12 text-base font-semibold transition-all active:scale-95 btn-ripple`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Steps + copy result */}
              <div className="px-3 pb-3 space-y-2">
                <div className="flex gap-2">
                  <button onClick={copyResult}
                    className="flex items-center gap-1.5 flex-1 text-xs bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-colors">
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copied ? 'Copiado!' : 'Copiar resultado'}
                  </button>
                  {steps.length > 0 && (
                    <button onClick={() => setShowSteps(s => !s)}
                      className="text-xs bg-gray-800 border border-gray-700 text-gray-400 hover:text-white px-3 py-2 rounded-xl transition-colors">
                      Passos
                    </button>
                  )}
                </div>
                {showSteps && steps.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-1.5">
                    {steps.map((s, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-500">{s.description}</span>
                        <span className="text-white font-mono">{String(s.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── FINANCE TAB ── */}
          {tab === 'finance' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Mode selector */}
              <div className="grid grid-cols-2 gap-1.5">
                {FINANCIAL_MODES.map(m => (
                  <button key={m.id} onClick={() => { setFinMode(m.id); setFin({}); setFinResult(null); }}
                    className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-colors ${finMode === m.id ? 'bg-emerald-900/40 border-emerald-600 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                    <span className="text-base block mb-0.5">{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Form per mode */}
              {finMode === 'percentagem' && (
                <div className="space-y-3">
                  <div className="flex gap-1">
                    {(['of','increase','decrease','what'] as const).map(m => (
                      <button key={m} onClick={() => setFin(f => ({ ...f, modo: m }))}
                        className={`flex-1 text-[10px] py-1.5 rounded-lg border transition-colors ${fin.modo === m || (!fin.modo && m === 'of') ? 'bg-emerald-500/20 border-emerald-600 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                        {m === 'of' ? 'X% de' : m === 'increase' ? '+%' : m === 'decrease' ? '−%' : '?%'}
                      </button>
                    ))}
                  </div>
                  <NInput label="Valor" value={fin.valor ?? ''} onChange={v => setFin(f => ({ ...f, valor: v }))} />
                  <NInput label="Percentagem" value={fin.percentagem ?? ''} onChange={v => setFin(f => ({ ...f, percentagem: v }))} unit="%" />
                </div>
              )}
              {finMode === 'iva' && (
                <div className="space-y-3">
                  <NInput label="Valor" value={fin.valor ?? ''} onChange={v => setFin(f => ({ ...f, valor: v }))} />
                  <NInput label="Taxa IVA" value={fin.taxa_iva ?? '14'} onChange={v => setFin(f => ({ ...f, taxa_iva: v }))} unit="%" />
                  <div className="flex gap-1">
                    {[['exclusivo','Excluir IVA'],['inclusivo','Incluir IVA']].map(([val,lbl]) => (
                      <button key={val} onClick={() => setFin(f => ({...f, tipo: val}))}
                        className={`flex-1 text-xs py-2 rounded-xl border transition-colors ${fin.tipo === val || (!fin.tipo && val === 'exclusivo') ? 'bg-emerald-500/20 border-emerald-600 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {finMode === 'margem' && (
                <div className="space-y-3">
                  <NInput label="Custo" value={fin.custo ?? ''} onChange={v => setFin(f => ({ ...f, custo: v }))} />
                  <NInput label="Preço de Venda" value={fin.preco_venda ?? ''} onChange={v => setFin(f => ({ ...f, preco_venda: v }))} />
                </div>
              )}
              {finMode === 'roi' && (
                <div className="space-y-3">
                  <NInput label="Investimento inicial" value={fin.investimento ?? ''} onChange={v => setFin(f => ({ ...f, investimento: v }))} />
                  <NInput label="Ganho obtido" value={fin.ganho ?? ''} onChange={v => setFin(f => ({ ...f, ganho: v }))} />
                </div>
              )}
              {finMode === 'juros_simples' && (
                <div className="space-y-3">
                  <NInput label="Principal (capital inicial)" value={fin.principal ?? ''} onChange={v => setFin(f => ({ ...f, principal: v }))} />
                  <NInput label="Taxa de juro" value={fin.taxa ?? ''} onChange={v => setFin(f => ({ ...f, taxa: v }))} unit="%" />
                  <NInput label="Período (anos/meses)" value={fin.tempo ?? ''} onChange={v => setFin(f => ({ ...f, tempo: v }))} />
                </div>
              )}
              {finMode === 'juros_compostos' && (
                <div className="space-y-3">
                  <NInput label="Principal" value={fin.principal ?? ''} onChange={v => setFin(f => ({ ...f, principal: v }))} />
                  <NInput label="Taxa anual" value={fin.taxa ?? ''} onChange={v => setFin(f => ({ ...f, taxa: v }))} unit="%" />
                  <NInput label="Tempo (anos)" value={fin.tempo ?? ''} onChange={v => setFin(f => ({ ...f, tempo: v }))} />
                  <NInput label="Capitalizações/ano" value={fin.capitalizacao ?? '1'} onChange={v => setFin(f => ({ ...f, capitalizacao: v }))} />
                </div>
              )}
              {finMode === 'emprestimo' && (
                <div className="space-y-3">
                  <NInput label="Valor do empréstimo" value={fin.valor ?? ''} onChange={v => setFin(f => ({ ...f, valor: v }))} />
                  <NInput label="Taxa anual" value={fin.taxa_anual ?? ''} onChange={v => setFin(f => ({ ...f, taxa_anual: v }))} unit="%" />
                  <NInput label="Prazo (meses)" value={fin.meses ?? ''} onChange={v => setFin(f => ({ ...f, meses: v }))} />
                </div>
              )}
              {finMode === 'breakeven' && (
                <div className="space-y-3">
                  <NInput label="Custos fixos" value={fin.custos_fixos ?? ''} onChange={v => setFin(f => ({ ...f, custos_fixos: v }))} />
                  <NInput label="Preço por unidade" value={fin.preco_unit ?? ''} onChange={v => setFin(f => ({ ...f, preco_unit: v }))} />
                  <NInput label="Custo variável / unidade" value={fin.custo_variavel ?? ''} onChange={v => setFin(f => ({ ...f, custo_variavel: v }))} />
                </div>
              )}

              {finMode !== 'none' && (
                <button onClick={runFinancial}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl text-sm btn-liquid btn-ripple transition-colors">
                  Calcular
                </button>
              )}

              {/* Result */}
              {finResult && (
                <div className="bg-gray-900 border border-emerald-900/60 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{finResult.label}</p>
                    <button onClick={copyResult} className="text-gray-500 hover:text-emerald-400 transition-colors"><Copy size={13} /></button>
                  </div>
                  <p className="text-emerald-400 text-2xl font-bold">{finResult.formatted}</p>
                  {finResult.steps.length > 0 && (
                    <div className="space-y-1.5 border-t border-gray-800 pt-3">
                      {finResult.steps.map((s, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-500">{s.description}</span>
                          <span className="text-white font-mono">{String(s.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Últimos cálculos</p>
                <button onClick={loadHistory} className="text-gray-600 hover:text-gray-400 transition-colors"><RefreshCw size={12} /></button>
              </div>
              {history.length === 0 && (
                <div className="text-center py-8">
                  <History size={24} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-600 text-xs">Sem histórico ainda</p>
                </div>
              )}
              {history.map(h => (
                <div key={h.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 hover:border-gray-700 cursor-pointer group transition-colors"
                  onClick={() => {
                    const v = parseFloat(h.result);
                    if (!isNaN(v)) { setDisplay(String(v)); setLastResult(v); setTab('calc'); }
                  }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-gray-500 text-xs truncate flex-1">{h.expression}</p>
                    <p className="text-white text-sm font-bold font-mono shrink-0">{formatNum(parseFloat(h.result), 6)}</p>
                  </div>
                  <p className="text-gray-700 text-[10px] mt-0.5">{new Date(h.created_at).toLocaleString('pt-AO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── AI TAB ── */}
          {tab === 'library' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-emerald-400" />
                  <p className="text-white text-xs font-semibold">Assistente de Cálculo</p>
                </div>
                <p className="text-gray-500 text-xs mb-3">
                  Escreva em linguagem natural e o assistente calcula para si.
                </p>
                <div className="flex gap-2">
                  <input
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && askAI()}
                    placeholder={`"15% de 250000" ou "IVA de 50000"`}
                    className="flex-1 bg-gray-800 border border-gray-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 placeholder-gray-600"
                  />
                  <button onClick={askAI} disabled={aiLoading}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white px-3 py-2 rounded-xl btn-liquid btn-ripple transition-colors">
                    {aiLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  </button>
                </div>
              </div>

              {aiAnswer && (
                <div className="bg-gray-900 border border-emerald-900/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain size={13} className="text-emerald-400" />
                    <span className="text-emerald-400 text-xs font-semibold">Resultado</span>
                  </div>
                  <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {aiAnswer.split('**').map((seg, i) =>
                      i % 2 === 1
                        ? <strong key={i} className="text-white">{seg}</strong>
                        : <span key={i}>{seg}</span>
                    )}
                  </div>
                  <button onClick={() => setTab('calc')}
                    className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                    <ArrowRight size={12} /> Ver na calculadora
                  </button>
                </div>
              )}

              {/* Quick suggestion pills */}
              <div>
                <p className="text-xs text-gray-600 mb-2">Exemplos rápidos</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '15% de 250000',
                    'IVA de 80000',
                    'margem 30000 50000',
                    '24 parcelas de 8500',
                    '10% de desconto em 45000',
                  ].map(ex => (
                    <button key={ex} onClick={() => { setAiQuery(ex); }}
                      className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 px-2.5 py-1 rounded-full transition-colors">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Function reference */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3">
                <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wider">Funções disponíveis</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    ['SUM(a,b,c)', 'Soma'],
                    ['AVERAGE(a,b)', 'Média'],
                    ['PMT(r,n,pv)', 'Prestação'],
                    ['NPV(r,c1,c2)', 'VPL'],
                    ['IRR(c0,c1)', 'TIR'],
                    ['SQRT(x)', 'Raiz'],
                    ['POWER(x,n)', 'Potência'],
                    ['ROUND(x,d)', 'Arredondar'],
                    ['LOG(x)', 'Log base 10'],
                    ['SIN/COS/TAN', 'Trigonométricas'],
                    ['STDEV(…)', 'Desv. Padrão'],
                    ['MEDIAN(…)', 'Mediana'],
                  ].map(([fn, desc]) => (
                    <div key={fn} className="text-[10px]">
                      <span className="text-emerald-400 font-mono">{fn}</span>
                      <span className="text-gray-600"> {desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
