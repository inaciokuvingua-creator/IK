import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, BarChart2, PieChart as PieIcon,
  Activity, Layers, RefreshCw, Wifi, WifiOff, ChevronDown,
  ArrowUp, ArrowDown, Minus, Calendar, Filter, LayoutGrid,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

// ── Types ────────────────────────────────────────────────────────────────────
type Tx = {
  id: string; tipo: 'entrada' | 'saida'; valor: number;
  categoria: string; data_transacao: string; descricao: string;
  cofre_id: string | null; negocio_id: string | null;
};
type Cofre = { id: string; nome: string; saldo: number; cor: string; };
type Negocio = { id: string; nome: string; receita_mensal: number; despesa_mensal: number; ativo: boolean; };
type Patrimonio = { id: string; nome: string; categoria: string; valor_aquisicao: number; valor_atual: number; };

type ChartType = 'area' | 'bar' | 'line' | 'composed' | 'pie' | 'donut' | 'radar';

const PALETTE = ['#10b981','#ef4444','#3b82f6','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#06b6d4','#a78bfa'];

// ── Tooltip customizado ───────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-2xl min-w-[160px]">
      {label && <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
            {p.name}
          </span>
          <span className="text-white text-xs font-bold">{format(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload, format }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-2xl">
      <p className="text-gray-300 text-xs font-medium capitalize">{name}</p>
      <p className="text-white text-sm font-bold mt-0.5">{format(value)}</p>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, delta, color }: { label: string; value: string; delta?: number; color: string }) {
  const up = (delta ?? 0) > 0;
  const zero = (delta ?? 0) === 0;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-gray-500 text-xs mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {delta !== undefined && (
        <div className={`flex items-center gap-1 mt-1.5 text-xs ${zero ? 'text-gray-600' : up ? 'text-emerald-400' : 'text-red-400'}`}>
          {zero ? <Minus size={11} /> : up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
          {zero ? 'Sem variação' : `${Math.abs(delta).toFixed(1)}% vs mês anterior`}
        </div>
      )}
    </div>
  );
}

// ── Chart type selector ────────────────────────────────────────────────────────
function ChartTypePicker({ value, onChange, chartTypes }: { value: ChartType; onChange: (t: ChartType) => void; chartTypes: { id: ChartType; label: string; icon: React.ElementType }[] }) {
  return (
    <div className="flex items-center gap-1 bg-gray-800/60 border border-gray-700 rounded-xl p-1 flex-wrap">
      {chartTypes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === id
              ? 'bg-emerald-500 text-white shadow'
              : 'text-gray-500 hover:text-gray-200 hover:bg-gray-700/50'
          }`}
        >
          <Icon size={12} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Relatorios() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { format } = useCurrency();

  const CHART_TYPES: { id: ChartType; label: string; icon: React.ElementType }[] = [
    { id: 'area',     label: t('relatorios.chartTypes.area'),     icon: Activity   },
    { id: 'bar',      label: t('relatorios.chartTypes.bar'),      icon: BarChart2  },
    { id: 'line',     label: t('relatorios.chartTypes.line'),     icon: TrendingUp },
    { id: 'composed', label: t('relatorios.chartTypes.composed'), icon: Layers     },
    { id: 'pie',      label: t('relatorios.chartTypes.pie'),      icon: PieIcon    },
    { id: 'donut',    label: t('relatorios.chartTypes.donut'),    icon: PieIcon    },
    { id: 'radar',    label: t('relatorios.chartTypes.radar'),    icon: LayoutGrid },
  ];

  const MONTHS = t('relatorios.months', { returnObjects: true }) as string[];

  const [txs, setTxs]             = useState<Tx[]>([]);
  const [cofres, setCofres]        = useState<Cofre[]>([]);
  const [negocios, setNegocios]    = useState<Negocio[]>([]);
  const [patrimonio, setPatrimonio] = useState<Patrimonio[]>([]);
  const [loading, setLoading]      = useState(true);
  const [realtime, setRealtime]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Filters
  const currentYear = new Date().getFullYear();
  const [year, setYear]         = useState(currentYear);
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
  const [cofreFilter, setCofreFilter] = useState('all');

  // Chart type per section
  const [cashflowType, setCashflowType] = useState<ChartType>('area');
  const [catType, setCatType]           = useState<ChartType>('bar');
  const [negocioType, setNegocioType]   = useState<ChartType>('bar');
  const [patrimonioType, setPatrimonioType] = useState<ChartType>('donut');

  const load = useCallback(async () => {
    if (!user) return;
    const [tx, c, n, p] = await Promise.all([
      supabase.from('transacoes').select('*').eq('user_id', user.id).order('data_transacao'),
      supabase.from('cofres').select('id,nome,saldo,cor').eq('user_id', user.id),
      supabase.from('negocios').select('*').eq('user_id', user.id),
      supabase.from('patrimonio').select('*').eq('user_id', user.id),
    ]);
    setTxs(tx.data ?? []);
    setCofres(c.data ?? []);
    setNegocios(n.data ?? []);
    setPatrimonio(p.data ?? []);
    setLoading(false);
    setLastUpdate(new Date());
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('relatorios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes', filter: `user_id=eq.${user.id}` }, () => { load(); setLastUpdate(new Date()); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cofres',     filter: `user_id=eq.${user.id}` }, () => { load(); setLastUpdate(new Date()); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'negocios',   filter: `user_id=eq.${user.id}` }, () => { load(); setLastUpdate(new Date()); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrimonio', filter: `user_id=eq.${user.id}` }, () => { load(); setLastUpdate(new Date()); })
      .subscribe((status) => setRealtime(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return txs.filter(tx => {
      const d = new Date(tx.data_transacao);
      if (d.getFullYear() !== year) return false;
      if (monthFilter !== 'all' && d.getMonth() !== monthFilter) return false;
      if (cofreFilter !== 'all') {
        if (cofreFilter === 'none') return tx.cofre_id === null;
        if (tx.cofre_id !== cofreFilter) return false;
      }
      return true;
    });
  }, [txs, year, monthFilter, cofreFilter]);

  // Monthly cashflow (12 months of selected year)
  const monthlyCashflow = useMemo(() => {
    return MONTHS.map((m, i) => {
      const monthTxs = txs.filter(tx => {
        const d = new Date(tx.data_transacao);
        return d.getFullYear() === year && d.getMonth() === i;
      });
      const entradas = monthTxs.filter(tx => tx.tipo === 'entrada').reduce((s, tx) => s + tx.valor, 0);
      const saidas   = monthTxs.filter(tx => tx.tipo === 'saida').reduce((s, tx) => s + tx.valor, 0);
      return { mes: m, [t('relatorios.entradas')]: entradas, [t('relatorios.saidas')]: saidas, [t('relatorios.saldo')]: entradas - saidas };
    });
  }, [txs, year, MONTHS, t]);

  // Category breakdown
  const byCategoria = useMemo(() => {
    const map: Record<string, { entrada: number; saida: number }> = {};
    filtered.forEach(tx => {
      if (!map[tx.categoria]) map[tx.categoria] = { entrada: 0, saida: 0 };
      map[tx.categoria][tx.tipo] += tx.valor;
    });
    return Object.entries(map)
      .map(([cat, v]) => ({ name: cat, [t('relatorios.entradas')]: v.entrada, [t('relatorios.saidas')]: v.saida, Total: v.entrada + v.saida }))
      .sort((a, b) => b.Total - a.Total)
      .slice(0, 8);
  }, [filtered, t]);

  // Pie data for saidas by category
  const pieSaidas = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter(tx => tx.tipo === 'saida').forEach(tx => {
      map[tx.categoria] = (map[tx.categoria] ?? 0) + tx.valor;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Negócios comparison
  const negocioData = useMemo(() =>
    negocios.filter(n => n.ativo).map(n => ({
      name: n.nome.length > 14 ? n.nome.slice(0, 13) + '…' : n.nome,
      [t('relatorios.receita')]: n.receita_mensal,
      [t('relatorios.despesa')]: n.despesa_mensal,
      [t('relatorios.lucro')]:   n.receita_mensal - n.despesa_mensal,
    })), [negocios, t]);

  // Patrimônio by category
  const patrimonioData = useMemo(() => {
    const map: Record<string, number> = {};
    patrimonio.forEach(p => { map[p.categoria] = (map[p.categoria] ?? 0) + p.valor_atual; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [patrimonio]);

  // Radar data: monthly performance (last 6 months)
  const radarData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i);
      const monthTxs = txs.filter(tx => {
        const td = new Date(tx.data_transacao);
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
      });
      const ent = monthTxs.filter(tx => tx.tipo === 'entrada').reduce((s, tx) => s + tx.valor, 0);
      const sai = monthTxs.filter(tx => tx.tipo === 'saida').reduce((s, tx) => s + tx.valor, 0);
      return { subject: MONTHS[d.getMonth()], [t('relatorios.entradas')]: ent, [t('relatorios.saidas')]: sai };
    });
  }, [txs, MONTHS, t]);

  // KPI deltas (current vs previous month)
  const { kpiTotals, delta } = useMemo(() => {
    const now = new Date();
    const cm = now.getMonth(), cy = now.getFullYear();
    const pm = cm === 0 ? 11 : cm - 1;
    const py = cm === 0 ? cy - 1 : cy;

    const curr = txs.filter(tx => { const d = new Date(tx.data_transacao); return d.getMonth() === cm && d.getFullYear() === cy; });
    const prev = txs.filter(tx => { const d = new Date(tx.data_transacao); return d.getMonth() === pm && d.getFullYear() === py; });

    const sum = (arr: Tx[], tipo: string) => arr.filter(tx => tx.tipo === tipo).reduce((s, tx) => s + tx.valor, 0);
    const pct = (a: number, b: number) => b === 0 ? 0 : ((a - b) / b) * 100;

    const entCurr = sum(curr, 'entrada'), entPrev = sum(prev, 'entrada');
    const saiCurr = sum(curr, 'saida'),   saiPrev = sum(prev, 'saida');
    const totEnt  = txs.filter(tx => tx.tipo === 'entrada').reduce((s, tx) => s + tx.valor, 0);
    const totSai  = txs.filter(tx => tx.tipo === 'saida').reduce((s, tx) => s + tx.valor, 0);

    return {
      kpiTotals: { entradas: totEnt, saidas: totSai, saldo: totEnt - totSai, entCurr, saiCurr },
      delta: { entradas: pct(entCurr, entPrev), saidas: pct(saiCurr, saiPrev), saldo: pct(entCurr - saiCurr, entPrev - saiPrev) },
    };
  }, [txs]);

  const cofresTotal = cofres.reduce((s, c) => s + c.saldo, 0);
  const patrimonioTotal = patrimonio.reduce((s, p) => s + p.valor_atual, 0);

  const fmtCompact = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return String(Math.round(v));
  };

  // ── Cumulative balance line ────────────────────────────────────────────────
  const cumulativeLine = useMemo(() => {
    let running = 0;
    const yearTxs = txs.filter(tx => new Date(tx.data_transacao).getFullYear() === year);
    const byDay: Record<string, number> = {};
    yearTxs.forEach(tx => {
      const day = tx.data_transacao.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + (tx.tipo === 'entrada' ? tx.valor : -tx.valor);
    });
    return Object.entries(byDay).sort().map(([date, d]) => {
      running += d;
      return { date: date.slice(5), [t('relatorios.saldo')]: running };
    });
  }, [txs, year, t]);

  // ── Cofres data ────────────────────────────────────────────────────────────
  const cofresData = useMemo(() =>
    cofres.map(c => ({ name: c.nome.length > 12 ? c.nome.slice(0, 11) + '…' : c.nome, value: c.saldo, color: c.cor || '#10b981' })),
    [cofres]);

  const AXIS_STYLE = { fill: '#6b7280', fontSize: 11 };
  const GRID_STROKE = '#1f2937';
  const ANIMATION = { isAnimationActive: true, animationDuration: 800, animationEasing: 'ease-out' as const };

  // Translated series names (used in chart dataKeys)
  const ENT = t('relatorios.entradas');
  const SAI = t('relatorios.saidas');
  const SAL = t('relatorios.saldo');
  const REC = t('relatorios.receita');
  const DES = t('relatorios.despesa');
  const LUC = t('relatorios.lucro');
  const VAL = t('relatorios.valor');

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-900 rounded-xl w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-900 rounded-2xl border border-gray-800" />)}
      </div>
      <div className="h-80 bg-gray-900 rounded-2xl border border-gray-800" />
    </div>
  );

  return (
    <div className="space-y-6 anim-page">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 size={22} className="text-emerald-400" /> {t('relatorios.title')}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-1.5">
            {realtime
              ? <><Wifi size={11} className="text-emerald-400" /> {t('relatorios.dadosTempoReal')}</>
              : <><WifiOff size={11} className="text-red-400" /> {t('relatorios.reconectando')}</>
            }
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-gray-600 text-xs">
              {t('relatorios.atualizado', { time: lastUpdate.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })}
            </span>
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-white px-4 py-2 rounded-xl transition-colors">
          <RefreshCw size={14} /> {t('relatorios.atualizar')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-500" />
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
            {[currentYear - 2, currentYear - 1, currentYear].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <select value={monthFilter === 'all' ? 'all' : String(monthFilter)}
          onChange={e => setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
          <option value="all">Todos os meses</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        {cofres.length > 0 && (
          <select value={cofreFilter}
            onChange={e => setCofreFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
            <option value="all">Todos os cofres</option>
            <option value="none">Sem cofre</option>
            {cofres.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
          <Filter size={11} /> {filtered.length} {t('relatorios.filtros')}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t('relatorios.totalEntradas')} value={format(kpiTotals.entradas)} delta={delta.entradas} color="text-emerald-400" />
        <KpiCard label={t('relatorios.totalSaidas')}   value={format(kpiTotals.saidas)}   delta={delta.saidas}   color="text-red-400"     />
        <KpiCard label={t('relatorios.saldoLiquido')}  value={format(kpiTotals.saldo)}    delta={delta.saldo}    color={kpiTotals.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <KpiCard label={t('relatorios.cofres')}        value={format(cofresTotal)}         color="text-blue-400"  />
      </div>

      {/* ─────────────── CHART 1: Monthly Cashflow ─────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <h2 className="text-white font-semibold">{t('relatorios.fluxoCaixaMensal')} — {year}</h2>
            <p className="text-gray-500 text-xs mt-0.5">{t('relatorios.fluxoSub')}</p>
          </div>
          <ChartTypePicker value={cashflowType} onChange={setCashflowType} chartTypes={CHART_TYPES} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          {cashflowType === 'area' ? (
            <AreaChart data={monthlyCashflow}>
              <defs>
                <linearGradient id="gEnt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSai" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="mes" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
              <Tooltip content={<CustomTooltip format={format} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Area type="monotone" dataKey={ENT} stroke="#10b981" fill="url(#gEnt)" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} {...ANIMATION} />
              <Area type="monotone" dataKey={SAI} stroke="#ef4444" fill="url(#gSai)" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} activeDot={{ r: 5 }} {...ANIMATION} />
            </AreaChart>
          ) : cashflowType === 'bar' ? (
            <BarChart data={monthlyCashflow} barGap={4} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="mes" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
              <Tooltip content={<CustomTooltip format={format} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Bar dataKey={ENT} fill="#10b981" radius={[4,4,0,0]} {...ANIMATION} />
              <Bar dataKey={SAI} fill="#ef4444" radius={[4,4,0,0]} {...ANIMATION} />
            </BarChart>
          ) : cashflowType === 'line' ? (
            <LineChart data={monthlyCashflow}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="mes" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
              <Tooltip content={<CustomTooltip format={format} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Line type="monotone" dataKey={ENT} stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} {...ANIMATION} />
              <Line type="monotone" dataKey={SAI} stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} activeDot={{ r: 5 }} {...ANIMATION} />
              <Line type="monotone" dataKey={SAL} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 3" dot={false} {...ANIMATION} />
              <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 4" />
            </LineChart>
          ) : cashflowType === 'composed' ? (
            <ComposedChart data={monthlyCashflow}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="mes" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
              <Tooltip content={<CustomTooltip format={format} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Bar dataKey={ENT} fill="#10b981" radius={[4,4,0,0]} fillOpacity={0.8} {...ANIMATION} />
              <Bar dataKey={SAI} fill="#ef4444" radius={[4,4,0,0]} fillOpacity={0.8} {...ANIMATION} />
              <Line type="monotone" dataKey={SAL} stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} {...ANIMATION} />
            </ComposedChart>
          ) : cashflowType === 'pie' ? (
            <PieChart>
              <Pie data={[{ name: ENT, value: kpiTotals.entradas }, { name: SAI, value: kpiTotals.saidas }]}
                cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} {...ANIMATION}>
                <Cell fill="#10b981" /><Cell fill="#ef4444" />
              </Pie>
              <Tooltip content={<PieTooltip format={format} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
            </PieChart>
          ) : cashflowType === 'donut' ? (
            <PieChart>
              <Pie data={[{ name: ENT, value: kpiTotals.entradas }, { name: SAI, value: kpiTotals.saidas }]}
                cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value" paddingAngle={3} {...ANIMATION}>
                <Cell fill="#10b981" /><Cell fill="#ef4444" />
              </Pie>
              <Tooltip content={<PieTooltip format={format} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
            </PieChart>
          ) : (
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={100}>
              <PolarGrid stroke={GRID_STROKE} />
              <PolarAngleAxis dataKey="subject" tick={AXIS_STYLE} />
              <PolarRadiusAxis tick={AXIS_STYLE} tickFormatter={fmtCompact} />
              <Radar name={ENT} dataKey={ENT} stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} {...ANIMATION} />
              <Radar name={SAI} dataKey={SAI} stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} {...ANIMATION} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Tooltip content={<CustomTooltip format={format} />} />
            </RadarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ─────────────── CHART 2: Saldo Acumulado ──────────────────────────── */}
      {cumulativeLine.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="mb-5">
            <h2 className="text-white font-semibold">{t('relatorios.saldoAcumulado')} — {year}</h2>
            <p className="text-gray-500 text-xs mt-0.5">{t('relatorios.saldoAcumSub')}</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cumulativeLine}>
              <defs>
                <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
              <Tooltip content={<CustomTooltip format={format} />} />
              <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 4" label={{ value: 'Zero', fill: '#6b7280', fontSize: 10 }} />
              <Area type="monotone" dataKey={SAL} stroke="#3b82f6" fill="url(#gSaldo)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#3b82f6' }} {...ANIMATION} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─────────────── CHART 3 + 4: Categories + Cofres ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Categories */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
            <div>
              <h2 className="text-white font-semibold">{t('relatorios.porCategoria')}</h2>
              <p className="text-gray-500 text-xs mt-0.5">{t('relatorios.catSub')}</p>
            </div>
            <ChartTypePicker value={catType} onChange={setCatType} chartTypes={CHART_TYPES} />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            {catType === 'pie' ? (
              <PieChart>
                <Pie data={pieSaidas} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} {...ANIMATION}>
                  {pieSaidas.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<PieTooltip format={format} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              </PieChart>
            ) : catType === 'donut' ? (
              <PieChart>
                <Pie data={pieSaidas} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value" {...ANIMATION}>
                  {pieSaidas.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<PieTooltip format={format} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              </PieChart>
            ) : catType === 'radar' ? (
              <RadarChart data={byCategoria} cx="50%" cy="50%" outerRadius={90}>
                <PolarGrid stroke={GRID_STROKE} />
                <PolarAngleAxis dataKey="name" tick={{ ...AXIS_STYLE, fontSize: 10 }} />
                <PolarRadiusAxis tick={AXIS_STYLE} tickFormatter={fmtCompact} />
                <Radar name={SAI} dataKey={SAI} stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} {...ANIMATION} />
                <Radar name={ENT} dataKey={ENT} stroke="#10b981" fill="#10b981" fillOpacity={0.2} {...ANIMATION} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip format={format} />} />
              </RadarChart>
            ) : catType === 'area' ? (
              <AreaChart data={byCategoria}>
                <defs>
                  <linearGradient id="gCatS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="name" tick={{ ...AXIS_STYLE, fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
                <Tooltip content={<CustomTooltip format={format} />} />
                <Area type="monotone" dataKey={SAI} stroke="#ef4444" fill="url(#gCatS)" strokeWidth={2} {...ANIMATION} />
              </AreaChart>
            ) : catType === 'line' ? (
              <LineChart data={byCategoria}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="name" tick={{ ...AXIS_STYLE, fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
                <Tooltip content={<CustomTooltip format={format} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Line type="monotone" dataKey={ENT} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} {...ANIMATION} />
                <Line type="monotone" dataKey={SAI} stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} {...ANIMATION} />
              </LineChart>
            ) : (
              <BarChart data={byCategoria} layout={catType === 'composed' ? 'horizontal' : 'vertical'} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} />
                <YAxis type="category" dataKey="name" tick={{ ...AXIS_STYLE, fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip format={format} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Bar dataKey={SAI} fill="#ef4444" radius={[0,4,4,0]} {...ANIMATION} />
                <Bar dataKey={ENT} fill="#10b981" radius={[0,4,4,0]} {...ANIMATION} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Cofres */}
        {cofresData.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="mb-5">
              <h2 className="text-white font-semibold">{t('relatorios.saldoPorCofre')}</h2>
              <p className="text-gray-500 text-xs mt-0.5">{t('relatorios.cofreSub')}</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={cofresData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true} {...ANIMATION}>
                  {cofresData.map((c, i) => <Cell key={i} fill={c.color || PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<PieTooltip format={format} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Cofres legend with saldo */}
            <div className="mt-4 space-y-2">
              {cofresData.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color || PALETTE[i % PALETTE.length] }} />
                    <span className="text-gray-400 text-xs truncate max-w-[120px]">{c.name}</span>
                  </div>
                  <span className="text-white text-xs font-semibold">{format(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────── CHART 5: Negócios ─────────────────────────────────── */}
      {negocioData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
            <div>
              <h2 className="text-white font-semibold">{t('relatorios.desempenhoNegocios')}</h2>
              <p className="text-gray-500 text-xs mt-0.5">{t('relatorios.negocioSub')}</p>
            </div>
            <ChartTypePicker value={negocioType} onChange={setNegocioType} chartTypes={CHART_TYPES} />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            {negocioType === 'radar' ? (
              <RadarChart data={negocioData} cx="50%" cy="50%" outerRadius={100}>
                <PolarGrid stroke={GRID_STROKE} />
                <PolarAngleAxis dataKey="name" tick={{ ...AXIS_STYLE, fontSize: 10 }} />
                <PolarRadiusAxis tick={AXIS_STYLE} tickFormatter={fmtCompact} />
                <Radar name={REC} dataKey={REC} stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} {...ANIMATION} />
                <Radar name={DES} dataKey={DES} stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} {...ANIMATION} />
                <Radar name={LUC} dataKey={LUC} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} {...ANIMATION} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip format={format} />} />
              </RadarChart>
            ) : negocioType === 'pie' ? (
              <PieChart>
                <Pie data={negocioData.map(n => ({ name: n.name, value: n[LUC] }))}
                  cx="50%" cy="50%" outerRadius={95} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} {...ANIMATION}>
                  {negocioData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<PieTooltip format={format} />} />
              </PieChart>
            ) : negocioType === 'donut' ? (
              <PieChart>
                <Pie data={negocioData.map(n => ({ name: n.name, value: Math.max(0, n[LUC]) }))}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value" {...ANIMATION}>
                  {negocioData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<PieTooltip format={format} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              </PieChart>
            ) : negocioType === 'line' ? (
              <LineChart data={negocioData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
                <Tooltip content={<CustomTooltip format={format} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                <Line type="monotone" dataKey={REC} stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} {...ANIMATION} />
                <Line type="monotone" dataKey={DES} stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} {...ANIMATION} />
                <Line type="monotone" dataKey={LUC} stroke="#f59e0b" strokeWidth={2}   dot={{ r: 4 }} strokeDasharray="5 3" {...ANIMATION} />
              </LineChart>
            ) : negocioType === 'area' ? (
              <AreaChart data={negocioData}>
                <defs>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
                <Tooltip content={<CustomTooltip format={format} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                <Area type="monotone" dataKey={REC} stroke="#10b981" fill="url(#gRec)" strokeWidth={2} {...ANIMATION} />
                <Area type="monotone" dataKey={DES} stroke="#ef4444" fill="url(#gDes)" strokeWidth={2} {...ANIMATION} />
              </AreaChart>
            ) : negocioType === 'composed' ? (
              <ComposedChart data={negocioData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
                <Tooltip content={<CustomTooltip format={format} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                <Bar dataKey={REC} fill="#10b981" radius={[4,4,0,0]} fillOpacity={0.85} {...ANIMATION} />
                <Bar dataKey={DES} fill="#ef4444" radius={[4,4,0,0]} fillOpacity={0.85} {...ANIMATION} />
                <Line type="monotone" dataKey={LUC} stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} {...ANIMATION} />
              </ComposedChart>
            ) : (
              <BarChart data={negocioData} barGap={4} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
                <Tooltip content={<CustomTooltip format={format} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                <Bar dataKey={REC} fill="#10b981" radius={[4,4,0,0]} {...ANIMATION} />
                <Bar dataKey={DES} fill="#ef4444" radius={[4,4,0,0]} {...ANIMATION} />
                <Bar dataKey={LUC} fill="#f59e0b" radius={[4,4,0,0]} {...ANIMATION} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* ─────────────── CHART 6: Patrimônio ────────────────────────────────── */}
      {patrimonioData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
            <div>
              <h2 className="text-white font-semibold">{t('relatorios.composicaoPatrimonio')}</h2>
              <p className="text-gray-500 text-xs mt-0.5">{t('relatorios.patrimonioSub', { val: format(patrimonioTotal) })}</p>
            </div>
            <ChartTypePicker value={patrimonioType} onChange={setPatrimonioType} chartTypes={CHART_TYPES} />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            {patrimonioType === 'donut' || patrimonioType === 'pie' ? (
              <PieChart>
                <Pie data={patrimonioData}
                  cx="50%" cy="50%"
                  innerRadius={patrimonioType === 'donut' ? 65 : 0}
                  outerRadius={105}
                  paddingAngle={patrimonioType === 'donut' ? 3 : 0}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={true}
                  {...ANIMATION}>
                  {patrimonioData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<PieTooltip format={format} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              </PieChart>
            ) : patrimonioType === 'radar' ? (
              <RadarChart data={patrimonioData} cx="50%" cy="50%" outerRadius={100}>
                <PolarGrid stroke={GRID_STROKE} />
                <PolarAngleAxis dataKey="name" tick={{ ...AXIS_STYLE, fontSize: 10 }} />
                <PolarRadiusAxis tick={AXIS_STYLE} tickFormatter={fmtCompact} />
                <Radar name={VAL} dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} {...ANIMATION} />
                <Tooltip content={<CustomTooltip format={format} />} />
              </RadarChart>
            ) : (
              <BarChart data={patrimonioData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={80} />
                <Tooltip content={<CustomTooltip format={format} />} />
                <Bar dataKey="value" name={VAL} radius={[6,6,0,0]} {...ANIMATION}>
                  {patrimonioData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {txs.length === 0 && cofres.length === 0 && negocios.length === 0 && (
        <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800">
          <BarChart2 size={40} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">{t('relatorios.semDados')}</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            {t('relatorios.semDadosSub')}
          </p>
        </div>
      )}
    </div>
  );
}
