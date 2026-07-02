import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Transacao, Cofre, Negocio } from '../lib/supabase';
import { formatDate } from '../lib/format';
import { useCurrency } from '../context/CurrencyContext';

type Summary = { totalEntradas: number; totalSaidas: number; saldo: number; byCategoria: Record<string, { entradas: number; saidas: number }> };

export default function Relatorios() {
  const { format } = useCurrency();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [cofres, setCofres] = useState<Cofre[]>([]);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoMes, setPeriodoMes] = useState(new Date().getMonth() + 1);
  const [periodoAno, setPeriodoAno] = useState(new Date().getFullYear());
  const [filtroCofre, setFiltroCofre] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos');

  useEffect(() => {
    Promise.all([
      supabase.from('transacoes').select('*').order('data_transacao', { ascending: false }),
      supabase.from('cofres').select('*'),
      supabase.from('negocios').select('*'),
    ]).then(([t, c, n]) => {
      if (!t.error) setTransacoes(t.data ?? []);
      if (!c.error) setCofres(c.data ?? []);
      if (!n.error) setNegocios(n.data ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = transacoes.filter((t) => {
    const [y, m] = t.data_transacao.split('-');
    const matchPeriod = parseInt(m) === periodoMes && parseInt(y) === periodoAno;
    const matchCofre = filtroCofre === 'todos' || t.cofre_id === filtroCofre;
    const matchTipo = filtroTipo === 'todos' || t.tipo === filtroTipo;
    return matchPeriod && matchCofre && matchTipo;
  });

  const summary: Summary = filtered.reduce<Summary>((acc, t) => {
    if (t.tipo === 'entrada') acc.totalEntradas += t.valor;
    else acc.totalSaidas += t.valor;
    acc.saldo = acc.totalEntradas - acc.totalSaidas;
    if (!acc.byCategoria[t.categoria]) acc.byCategoria[t.categoria] = { entradas: 0, saidas: 0 };
    if (t.tipo === 'entrada') acc.byCategoria[t.categoria].entradas += t.valor;
    else acc.byCategoria[t.categoria].saidas += t.valor;
    return acc;
  }, { totalEntradas: 0, totalSaidas: 0, saldo: 0, byCategoria: {} });

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const years = Array.from(new Set(transacoes.map((t) => parseInt(t.data_transacao.split('-')[0])))).sort((a, b) => b - a);
  if (!years.includes(periodoAno)) years.unshift(periodoAno);

  const topSaidas = Object.entries(summary.byCategoria)
    .sort((a, b) => b[1].saidas - a[1].saidas)
    .slice(0, 5);

  const maxSaida = Math.max(...topSaidas.map(([, v]) => v.saidas), 1);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Relatórios</h1>
        <p className="text-gray-400 text-sm mt-0.5">Análise detalhada das suas finanças</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select value={periodoMes} onChange={(e) => setPeriodoMes(parseInt(e.target.value))} className="input py-2 text-sm pr-9 appearance-none">
            {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={periodoAno} onChange={(e) => setPeriodoAno(parseInt(e.target.value))} className="input py-2 text-sm pr-9 appearance-none">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filtroCofre} onChange={(e) => setFiltroCofre(e.target.value)} className="input py-2 text-sm pr-9 appearance-none">
            <option value="todos">Todos os cofres</option>
            {cofres.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
        <div className="flex gap-1">
          {(['todos', 'entrada', 'saida'] as const).map((t) => (
            <button key={t} onClick={() => setFiltroTipo(t)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${filtroTipo === t ? 'bg-emerald-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-700'}`}>
              {t === 'todos' ? 'Todos' : t === 'entrada' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight size={15} className="text-emerald-400" />
            <p className="text-gray-400 text-xs">Total Entradas</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{format(summary.totalEntradas)}</p>
          <p className="text-gray-600 text-xs mt-1">{filtered.filter((t) => t.tipo === 'entrada').length} transações</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight size={15} className="text-red-400" />
            <p className="text-gray-400 text-xs">Total Saídas</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{format(summary.totalSaidas)}</p>
          <p className="text-gray-600 text-xs mt-1">{filtered.filter((t) => t.tipo === 'saida').length} transações</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs mb-1">Saldo do Período</p>
          <p className={`text-2xl font-bold ${summary.saldo >= 0 ? 'text-white' : 'text-red-400'}`}>{format(summary.saldo)}</p>
          <p className="text-gray-600 text-xs mt-1">{filtered.length} transações no total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By category */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Saídas por Categoria</h2>
          {topSaidas.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Sem dados para o período</p>
          ) : (
            <div className="space-y-3">
              {topSaidas.map(([cat, vals]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 capitalize">{cat}</span>
                    <span className="text-red-400 font-medium">{format(vals.saidas)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(vals.saidas / maxSaida) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Negocios summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Resumo por Negócio</h2>
          {negocios.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Nenhum negócio cadastrado</p>
          ) : (
            <div className="space-y-2">
              {negocios.filter((n) => n.ativo).map((n) => {
                const lucro = n.receita_mensal - n.despesa_mensal;
                return (
                  <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{n.nome}</p>
                      <p className="text-gray-500 text-xs">{n.categoria}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{format(lucro)}</p>
                      <p className="text-gray-600 text-xs">lucro/mês</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transactions list */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">
          Transações — {meses[periodoMes - 1]} {periodoAno}
          <span className="text-gray-500 font-normal text-sm ml-2">({filtered.length})</span>
        </h2>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 text-sm">Nenhuma transação no período selecionado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const cofre = cofres.find((c) => c.id === t.cofre_id);
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/30 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${t.tipo === 'entrada' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                    {t.tipo === 'entrada' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{t.descricao}</p>
                    <p className="text-gray-500 text-xs">{formatDate(t.data_transacao)} · {t.categoria}{cofre ? ` · ${cofre.nome}` : ''}</p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.tipo === 'entrada' ? '+' : '-'}{format(t.valor)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
