import { useEffect, useState } from 'react';
import { Users, TrendingUp, TrendingDown, Wallet, Activity, UserPlus, RefreshCw, BarChart3, ArrowUpRight } from 'lucide-react';
import { adminApi, type AdminStats } from '../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState(new Date());

  const load = async () => {
    try {
      setError(null);
      const s = await adminApi.stats();
      setStats(s);
      setLastSync(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmt = (n: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(n);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState msg={error} onRetry={load} />;
  if (!stats) return null;

  const maxDaily = Math.max(...stats.dailyNew.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Visão geral da plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-xs">
            Atualizado {lastSync.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button onClick={load} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Utilizadores" value={stats.users.total} icon={Users} color="blue" sub={`+${stats.users.newToday} hoje`} />
        <KpiCard label="Ativos este mês" value={stats.users.activeMonth} icon={Activity} color="emerald" sub={`${stats.users.newWeek} novos/semana`} />
        <KpiCard label="Receitas globais" value={fmt(stats.financeiro.totalReceitas)} icon={TrendingUp} color="emerald" sub="Soma de todas as entradas" />
        <KpiCard label="Despesas globais" value={fmt(stats.financeiro.totalDespesas)} icon={TrendingDown} color="red" sub="Soma de todas as saídas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={16} className="text-emerald-400" />
            <h2 className="font-semibold text-white text-sm">Saldo Agregado</h2>
          </div>
          <p className={`text-3xl font-bold mb-1 ${stats.financeiro.saldo >= 0 ? 'text-white' : 'text-red-400'}`}>
            {fmt(stats.financeiro.saldo)}
          </p>
          <p className="text-gray-500 text-xs">Saldo líquido de todos os utilizadores</p>

          <div className="mt-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Receitas</span>
              <span className="text-emerald-400 font-semibold text-sm">{fmt(stats.financeiro.totalReceitas)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Despesas</span>
              <span className="text-red-400 font-semibold text-sm">{fmt(stats.financeiro.totalDespesas)}</span>
            </div>
            <div className="h-px bg-gray-800" />
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm font-medium">Transações</span>
              <span className="text-white font-bold">{stats.transacoes.total.toLocaleString('pt-AO')}</span>
            </div>
          </div>
        </div>

        {/* User growth */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus size={16} className="text-blue-400" />
            <h2 className="font-semibold text-white text-sm">Novos Utilizadores (7 dias)</h2>
          </div>

          <div className="flex items-end gap-2 h-28">
            {stats.dailyNew.map((d) => {
              const pct = (d.count / maxDaily) * 100;
              const date = new Date(d.date + 'T00:00:00');
              const label = date.toLocaleDateString('pt-AO', { weekday: 'short' });
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-gray-500 text-xs">{d.count > 0 ? d.count : ''}</span>
                  <div className="w-full flex items-end" style={{ height: '72px' }}>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${pct > 0 ? 'bg-blue-500' : 'bg-gray-800'}`}
                      style={{ height: `${Math.max(pct, pct > 0 ? 8 : 3)}%` }}
                    />
                  </div>
                  <span className="text-gray-600 text-xs capitalize">{label}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-800">
            <StatMini label="Novos hoje" value={stats.users.newToday} color="blue" />
            <StatMini label="Esta semana" value={stats.users.newWeek} color="blue" />
            <StatMini label="Este mês" value={stats.users.newMonth} color="blue" />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total registros hoje', value: stats.transacoes.hoje, icon: BarChart3, color: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' },
          { label: 'Utilizadores novos/semana', value: stats.users.newWeek, icon: UserPlus, color: 'bg-blue-950/40 text-blue-400 border-blue-900/40' },
          { label: 'Ativos / total', value: `${stats.users.activeMonth}/${stats.users.total}`, icon: Activity, color: 'bg-teal-950/40 text-teal-400 border-teal-900/40' },
          { label: 'Margem financeira', value: stats.financeiro.totalReceitas > 0 ? `${Math.round((stats.financeiro.saldo / stats.financeiro.totalReceitas) * 100)}%` : 'N/A', icon: ArrowUpRight, color: 'bg-amber-950/40 text-amber-400 border-amber-900/40' },
        ].map((item) => (
          <div key={item.label} className={`border rounded-2xl p-4 ${item.color}`}>
            <item.icon size={18} className="mb-2 opacity-80" />
            <p className="text-xl font-bold text-white">{item.value}</p>
            <p className="text-xs opacity-70 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: React.ElementType; color: string; sub: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-950 text-blue-400',
    emerald: 'bg-emerald-950 text-emerald-400',
    red: 'bg-red-950 text-red-400',
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={17} />
      </div>
      <p className="text-xl font-bold text-white leading-tight mb-0.5">{value}</p>
      <p className="text-gray-400 text-sm font-medium">{label}</p>
      <p className="text-gray-600 text-xs mt-1">{sub}</p>
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = { blue: 'text-blue-400', emerald: 'text-emerald-400' };
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-800 rounded-xl w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-28 bg-gray-900 rounded-2xl border border-gray-800" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-56 bg-gray-900 rounded-2xl border border-gray-800" />
        <div className="lg:col-span-2 h-56 bg-gray-900 rounded-2xl border border-gray-800" />
      </div>
    </div>
  );
}

function ErrorState({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-red-400 text-sm">{msg}</p>
      <button onClick={onRetry} className="text-xs text-gray-400 border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">Tentar novamente</button>
    </div>
  );
}
