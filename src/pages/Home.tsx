import { TrendingUp, Shield, BarChart3, Briefcase, Home, ArrowRight, CheckCircle } from 'lucide-react';

type Props = { onGetStarted: () => void };

export default function HomePage({ onGetStarted }: Props) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">IK FINANCE</span>
          </div>
          <button
            onClick={onGetStarted}
            className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
          >
            Acessar
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-900/60 rounded-full px-4 py-1.5 text-emerald-400 text-sm font-medium mb-6">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
          Seu gestor inteligente de patrimônio
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 max-w-3xl mx-auto">
          Gerencie seu{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
            IK FINANCE
          </span>
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Controle cofres, analise negócios, acompanhe seu patrimônio e visualize relatórios completos — tudo em um só lugar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onGetStarted}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            Começar agora <ArrowRight size={16} />
          </button>
          <button
            onClick={onGetStarted}
            className="flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-600 text-gray-300 font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            Ver demonstração
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Cofres', value: 'Ilimitados', icon: Shield },
            { label: 'Negócios', value: 'Multi-conta', icon: Briefcase },
            { label: 'Ativos', value: 'Rastreados', icon: Home },
            { label: 'Relatórios', value: 'Em tempo real', icon: BarChart3 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                <Icon size={18} className="text-emerald-400" />
              </div>
              <p className="text-white font-bold text-lg">{value}</p>
              <p className="text-gray-500 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-3">Tudo que você precisa</h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">Uma solução completa para gerenciar sua vida financeira com precisão e segurança.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              color: 'emerald',
              title: 'Cofres',
              desc: 'Organize seu dinheiro em múltiplos cofres com saldos independentes. Ideal para separar reservas, investimentos e gastos do dia a dia.',
              items: ['Saldo em tempo real', 'Cores e ícones personalizados', 'Histórico de transações'],
            },
            {
              icon: Briefcase,
              color: 'blue',
              title: 'Negócios',
              desc: 'Acompanhe receitas e despesas de cada negócio ou fonte de renda. Entenda o lucro líquido de cada operação.',
              items: ['Receita e despesa mensal', 'Categorização', 'Margem de lucro'],
            },
            {
              icon: Home,
              color: 'amber',
              title: 'Patrimônio',
              desc: 'Registre todos seus ativos — imóveis, veículos, investimentos — e acompanhe a evolução do valor ao longo do tempo.',
              items: ['Valor de aquisição e atual', 'Categorias de ativo', 'Variação percentual'],
            },
          ].map(({ icon: Icon, color, title, desc, items }) => {
            const colorMap: Record<string, string> = {
              emerald: 'bg-emerald-950/40 border-emerald-900/40',
              blue: 'bg-blue-950/40 border-blue-900/40',
              amber: 'bg-amber-950/40 border-amber-900/40',
            };
            const iconMap: Record<string, string> = {
              emerald: 'text-emerald-400 bg-emerald-950',
              blue: 'text-blue-400 bg-blue-950',
              amber: 'text-amber-400 bg-amber-950',
            };
            const checkMap: Record<string, string> = {
              emerald: 'text-emerald-400',
              blue: 'text-blue-400',
              amber: 'text-amber-400',
            };
            return (
              <div key={title} className={`border rounded-2xl p-6 ${colorMap[color]}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconMap[color]}`}>
                  <Icon size={20} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{desc}</p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle size={14} className={checkMap[color]} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800 py-20">
        <div className="max-w-2xl mx-auto text-center px-6">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-gray-400 mb-8">Crie sua conta gratuitamente e comece a controlar suas finanças hoje mesmo.</p>
          <button
            onClick={onGetStarted}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-10 py-3.5 rounded-xl transition-colors inline-flex items-center gap-2"
          >
            Criar conta grátis <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
