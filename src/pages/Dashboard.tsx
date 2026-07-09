import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimation } from '../context/AnimationContext';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, TrendingDown, Wallet, Briefcase, Home,
  ArrowUpRight, ArrowDownRight, Plus, RefreshCw,
  PiggyBank, BarChart3,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Cofre, Negocio, PatrimonioItem, Transacao } from '../lib/supabase';
import { formatDate } from '../lib/format';
import { useCurrency } from '../context/CurrencyContext';

type Props = { onNavigate: (page: string) => void };

export default function Dashboard({ onNavigate }: Props) {
  const { t } = useTranslation();
  const { entryClass, kpiClass, cardClass } = useAnimation();
  const [cofres, setCofres] = useState<Cofre[]>([]);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [patrimonio, setPatrimonio] = useState<PatrimonioItem[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const { format } = useCurrency();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    const [c, n, p, tx] = await Promise.all([
      supabase.from('cofres').select('*').order('created_at', { ascending: false }),
      supabase.from('negocios').select('*').eq('ativo', true),
      supabase.from('patrimonio').select('*'),
      supabase.from('transacoes').select('*').order('data_transacao', { ascending: false }).limit(10),
    ]);
    if (!c.error) setCofres(c.data ?? []);
    if (!n.error) setNegocios(n.data ?? []);
    if (!p.error) setPatrimonio(p.data ?? []);
    if (!tx.error) setTransacoes(tx.data ?? []);
    setLastSync(new Date());
    setLoading(false);
  }, []);

  // Debounce realtime handler so multiple rapid changes only trigger one fetch
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAll(), 600);
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();

    // Realtime — one channel, listen to all 4 tables
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cofres' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'negocios' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrimonio' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, debouncedFetch)
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchAll, debouncedFetch]);

  // ── Aggregates ─────────────────────────────────────────────────────────────

  // Cofres
  const saldoCofres = cofres.reduce((s, c) => s + c.saldo, 0);

  // Financeiro — transacoes sem cofre vinculado
  const txLivres = transacoes.filter((tx) => tx.cofre_id === null);
  const receitasFinanceiro = txLivres.filter((tx) => tx.tipo === 'entrada').reduce((s, tx) => s + tx.valor, 0);
  const despesasFinanceiro = txLivres.filter((tx) => tx.tipo === 'saida').reduce((s, tx) => s + tx.valor, 0);
  const saldoFinanceiro = receitasFinanceiro - despesasFinanceiro;

  // Negócios
  const receitaNegocios = negocios.reduce((s, n) => s + n.receita_mensal, 0);
  const despesaNegocios = negocios.reduce((s, n) => s + n.despesa_mensal, 0);
  const lucroNegocios = receitaNegocios - despesaNegocios;

  // Patrimônio
  const totalPatrimonio = patrimonio.reduce((s, p) => s + p.valor_atual, 0);
  const totalInvestimentos = patrimonio
    .filter((p) => p.categoria === 'investimento' || p.categoria === 'cripto')
    .reduce((s, p) => s + p.valor_atual, 0);

  // Total geral — saldo líquido do usuário
  const saldoTotal = saldoCofres + saldoFinanceiro + lucroNegocios;
  const saldoTotalPositive = saldoTotal >= 0;

  // Receitas totais e despesas totais combinadas
  const receitasTotal = receitasFinanceiro + receitaNegocios;
  const despesasTotal = despesasFinanceiro + despesaNegocios;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className={`space-y-6 ${entryClass()}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <RefreshCw size={11} />
          <span>{t('dashboard.updatedAt', { time: lastSync.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })}</span>
        </div>
      </div>

      {/* Hero — Saldo Total */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${saldoTotalPositive ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <p className="text-gray-400 text-sm">{t('dashboard.saldoTotal')}</p>
        </div>
        <p className={`text-4xl font-bold tracking-tight mb-4 ${saldoTotalPositive ? 'text-white' : 'text-red-400'}`}>
          {format(saldoTotal)}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label={t('dashboard.emCofres')} value={format(saldoCofres)} positive />
          <MiniStat label={t('dashboard.financeiro')} value={format(saldoFinanceiro)} positive={saldoFinanceiro >= 0} />
          <MiniStat label={t('dashboard.negocios')} value={format(lucroNegocios)} positive={lucroNegocios >= 0} />
          <MiniStat label={t('dashboard.patrimonio')} value={format(totalPatrimonio)} positive />
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t('dashboard.totalReceitas')} value={format(receitasTotal)} icon={TrendingUp} color="emerald" sub={t('dashboard.financAndNegocios')} />
        <KpiCard label={t('dashboard.totalDespesas')} value={format(despesasTotal)} icon={TrendingDown} color="red" sub={`Saldo: ${format(receitasTotal - despesasTotal)}`} />
        <KpiCard label={t('dashboard.investimentos')} value={format(totalInvestimentos)} icon={BarChart3} color="blue" sub={`${patrimonio.filter(p => p.categoria === 'investimento' || p.categoria === 'cripto').length} ativos`} />
        <KpiCard label={t('dashboard.negociosAtivos')} value={format(lucroNegocios)} icon={Briefcase} color={lucroNegocios >= 0 ? 'teal' : 'red'} sub={`${negocios.length} negócio${negocios.length !== 1 ? 's' : ''} · lucro mensal`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent transactions */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">{t('dashboard.ultTrans')}</h2>
            <button onClick={() => onNavigate('financeiro')} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              {t('dashboard.verTodas')}
            </button>
          </div>

          {transacoes.length === 0 ? (
            <EmptyState message={t('dashboard.nenhumaTrans')} action={t('dashboard.adicionarTrans')} onAction={() => onNavigate('financeiro')} />
          ) : (
            <div className="space-y-1">
              {transacoes.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800/50 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tx.tipo === 'entrada' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                    {tx.tipo === 'entrada' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{tx.descricao || tx.categoria}</p>
                    <p className="text-gray-500 text-xs">{formatDate(tx.data_transacao)} · {tx.categoria}</p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${tx.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.tipo === 'entrada' ? '+' : '-'}{format(tx.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Cofres */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PiggyBank size={15} className="text-emerald-400" />
                <h2 className="font-semibold text-white text-sm">{t('dashboard.cofres')}</h2>
              </div>
              <button onClick={() => onNavigate('cofres')} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                <Plus size={12} /> {t('dashboard.novo')}
              </button>
            </div>
            {cofres.length === 0 ? (
              <EmptyState message={t('dashboard.nenhumCofre')} action={t('dashboard.criarCofre')} onAction={() => onNavigate('cofres')} />
            ) : (
              <div className="space-y-2">
                {cofres.slice(0, 4).map((c) => (
                  <div key={c.id} onClick={() => onNavigate('cofres')} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-800/50 transition-colors cursor-pointer">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: c.cor + '22' }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                    </div>
                    <p className="text-white text-xs font-medium flex-1 truncate">{c.nome}</p>
                    <span className="text-xs font-semibold text-white">{format(c.saldo)}</span>
                  </div>
                ))}
                {cofres.length > 4 && (
                  <button onClick={() => onNavigate('cofres')} className="w-full text-center text-xs text-gray-500 hover:text-gray-400 py-1">{t('dashboard.maisItens', { n: cofres.length - 4 })}</button>
                )}
              </div>
            )}
          </div>

          {/* Patrimônio */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Home size={15} className="text-blue-400" />
                <h2 className="font-semibold text-white text-sm">{t('dashboard.patrimoniTitle')}</h2>
              </div>
              <button onClick={() => onNavigate('patrimonio')} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">{t('dashboard.gerir')}</button>
            </div>
            {patrimonio.length === 0 ? (
              <EmptyState message={t('dashboard.nenhumAtivo')} action={t('dashboard.adicionarAtivo')} onAction={() => onNavigate('patrimonio')} />
            ) : (
              <div className="space-y-2">
                {patrimonio.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/50 transition-colors">
                    <div>
                      <p className="text-white text-xs font-medium">{p.nome}</p>
                      <p className="text-gray-500 text-xs">{p.categoria}</p>
                    </div>
                    <span className="text-xs font-semibold text-white">{format(p.valor_atual)}</span>
                  </div>
                ))}
                {patrimonio.length > 3 && (
                  <button onClick={() => onNavigate('patrimonio')} className="w-full text-center text-xs text-gray-500 hover:text-gray-400 py-1">{t('dashboard.maisItens', { n: patrimonio.length - 3 })}</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Negócios */}
      {negocios.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">{t('dashboard.negociosAtivosTitle')}</h2>
            <button onClick={() => onNavigate('negocios')} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">{t('dashboard.gerenciar')}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {negocios.slice(0, 3).map((n) => {
              const lucro = n.receita_mensal - n.despesa_mensal;
              return (
                <div key={n.id} className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                      <Briefcase size={14} className="text-gray-300" />
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lucro >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                      {lucro >= 0 ? '+' : ''}{format(lucro)}
                    </span>
                  </div>
                  <p className="text-white text-sm font-semibold">{n.nome}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{n.categoria}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="bg-gray-800/60 rounded-xl px-3.5 py-3">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`text-sm font-bold ${positive ? 'text-white' : 'text-red-400'}`}>{value}</p>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: React.ElementType; color: string; sub: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-950 text-emerald-400',
    blue: 'bg-blue-950 text-blue-400',
    teal: 'bg-teal-950 text-teal-400',
    red: 'bg-red-950 text-red-400',
  };
  return (
    <div className="kpi-card">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
        <Icon size={17} />
      </div>
      <p className="text-xl font-bold text-white mb-0.5 leading-tight">{value}</p>
      <p className="text-gray-400 text-sm font-medium">{label}</p>
      <p className="text-gray-600 text-xs mt-1">{sub}</p>
    </div>
  );
}

function EmptyState({ message, action, onAction }: { message: string; action: string; onAction: () => void }) {
  return (
    <div className="text-center py-6">
      <p className="text-gray-500 text-xs mb-2">{message}</p>
      <button onClick={onAction} className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-900/50 hover:border-emerald-800 px-3 py-1.5 rounded-lg transition-colors">
        {action}
      </button>
    </div>
  );
}
