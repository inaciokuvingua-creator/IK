import { useTranslation } from 'react-i18next';
import { TrendingUp, Shield, BarChart3, Briefcase, Home, ArrowRight, CheckCircle } from 'lucide-react';

type Props = { onGetStarted: () => void };

export default function HomePage({ onGetStarted }: Props) {
  const { t } = useTranslation();

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
            {t('home.acessar')}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-900/60 rounded-full px-4 py-1.5 text-emerald-400 text-sm font-medium mb-6">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
          {t('home.badge')}
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 max-w-3xl mx-auto">
          {t('home.heroTitle')}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
            IK FINANCE
          </span>
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('home.heroSub')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onGetStarted}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            {t('home.ctaPrimary')} <ArrowRight size={16} />
          </button>
          <button
            onClick={onGetStarted}
            className="flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-600 text-gray-300 font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            {t('home.ctaSecondary')}
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('home.stat1Label'), value: t('home.stat1Val'), icon: Shield },
            { label: t('home.stat2Label'), value: t('home.stat2Val'), icon: Briefcase },
            { label: t('home.stat3Label'), value: t('home.stat3Val'), icon: Home },
            { label: t('home.stat4Label'), value: t('home.stat4Val'), icon: BarChart3 },
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
        <h2 className="text-3xl font-bold text-center mb-3">{t('home.featuresTitle')}</h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">{t('home.featuresSub')}</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              color: 'emerald',
              title: t('home.f1Title'),
              desc: t('home.f1Desc'),
              items: ['Saldo em tempo real', 'Cores e ícones personalizados', 'Histórico de transações'],
            },
            {
              icon: Briefcase,
              color: 'blue',
              title: t('home.f2Title'),
              desc: t('home.f2Desc'),
              items: ['Receita e despesa mensal', 'Categorização', 'Margem de lucro'],
            },
            {
              icon: Home,
              color: 'amber',
              title: t('home.f3Title'),
              desc: t('home.f3Desc'),
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
          <h2 className="text-3xl font-bold mb-4">{t('home.ctaTitle')}</h2>
          <p className="text-gray-400 mb-8">{t('home.ctaSub')}</p>
          <button
            onClick={onGetStarted}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-10 py-3.5 rounded-xl transition-colors inline-flex items-center gap-2"
          >
            {t('home.ctaBtn')} <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
