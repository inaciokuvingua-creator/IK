import { useState } from 'react';
import { TrendingUp, Eye, EyeOff, Mail, Lock, AlertCircle, MapPin, Quote, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === 'login' ? signIn : signUp;
    const { error } = await fn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col lg:flex-row">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border-r border-gray-800 overflow-y-auto">

        {/* Logo */}
        <div className="flex items-center gap-3 px-12 pt-10">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">IK FINANCE</span>
        </div>

        {/* Hero */}
        <div className="px-12 pt-12 pb-8">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Controle total<br />das suas finanças
          </h1>
          <p className="text-gray-400 text-base leading-relaxed mb-8">
            Gerencie cofres, negócios e patrimônio em um só lugar. Visão completa da sua saúde financeira.
          </p>
          <div className="space-y-3">
            {[
              { icon: '🏦', title: 'Cofres inteligentes', desc: 'Organize seu dinheiro em múltiplas contas com metas' },
              { icon: '📊', title: 'Análise de negócios', desc: 'Acompanhe receitas e despesas por negócio' },
              { icon: '🏠', title: 'Controle de patrimônio', desc: 'Monitore seus ativos e investimentos' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-lg shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{item.title}</p>
                  <p className="text-gray-500 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-12 border-t border-gray-800" />

        {/* ── Creator section ──────────────────────────────────────────────── */}
        <div className="px-12 py-8 flex-1">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-6">Sobre o Criador</p>

          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/30">
              <span className="text-white font-bold text-xl">IK</span>
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">Inácio Kuvingua Ulundo</p>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin size={11} className="text-emerald-400" />
                <span className="text-emerald-400 text-xs font-medium">Huambo, Angola</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Jovem angolano apaixonado por tecnologia, inovação e desenvolvimento de soluções digitais.
            Com dedicação e aprendizagem contínua, desenvolveu esta plataforma para oferecer uma
            experiência moderna, segura e eficiente.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            A sua visão é transformar ideias em soluções reais, contribuindo para o crescimento
            tecnológico de Angola e inspirando jovens africanos a explorarem o mundo da tecnologia
            e da programação.
          </p>

          {/* Quote */}
          <div className="relative bg-gray-800/60 border border-gray-700/60 rounded-2xl p-5 mb-6">
            <Quote size={20} className="text-emerald-500/40 absolute top-4 left-4" />
            <p className="text-gray-300 text-sm leading-relaxed italic pl-6">
              A tecnologia não é apenas sobre máquinas e códigos. É sobre criar oportunidades,
              resolver problemas e construir um futuro melhor para todos.
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">Contacto</p>
            <a
              href="https://wa.me/244943339350"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl transition-all group"
            >
              <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-green-600/30 transition-colors">
                <MessageCircle size={15} className="text-green-400" />
              </div>
              <div>
                <p className="text-gray-300 text-xs font-medium">WhatsApp</p>
                <p className="text-white text-sm font-semibold">+244 943 339 350</p>
              </div>
            </a>
            <a
              href="mailto:Inaciokuvingua@gmail.com"
              className="flex items-center gap-3 p-3.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl transition-all group"
            >
              <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-600/30 transition-colors">
                <Mail size={15} className="text-blue-400" />
              </div>
              <div>
                <p className="text-gray-300 text-xs font-medium">E-mail</p>
                <p className="text-white text-sm font-semibold">Inaciokuvingua@gmail.com</p>
              </div>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-12 py-6 border-t border-gray-800">
          <p className="text-gray-600 text-xs leading-relaxed">
            © {new Date().getFullYear()} IK FINANCE · Todos os direitos reservados.<br />
            Criado e desenvolvido por <span className="text-gray-500 font-medium">Inácio Kuvingua Ulundo</span>.
          </p>
        </div>
      </div>

      {/* ── Right panel — Auth form ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="text-white font-bold tracking-tight">IK FINANCE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">IK</span>
            </div>
            <span className="text-gray-400 text-xs">por Inácio K. Ulundo</span>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">
                {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
              </h2>
              <p className="text-gray-400 text-sm">
                {mode === 'login' ? 'Bem-vindo de volta ao IK FINANCE' : 'Comece a controlar suas finanças'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl py-3 pl-10 pr-4 text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl py-3 pl-10 pr-11 text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-950/50 border border-red-900 rounded-xl p-3">
                  <AlertCircle size={15} className="text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-600 text-white font-semibold rounded-xl py-3 text-sm transition-colors mt-2"
              >
                {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                {mode === 'login' ? 'Criar conta' : 'Entrar'}
              </button>
            </p>

            {/* Mobile creator credit */}
            <div className="lg:hidden mt-10 pt-6 border-t border-gray-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">IK</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Inácio Kuvingua Ulundo</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="text-emerald-400" />
                    <span className="text-emerald-400 text-xs">Huambo, Angola</span>
                  </div>
                </div>
              </div>

              <blockquote className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <Quote size={14} className="text-emerald-500/50 mb-2" />
                <p className="text-gray-400 text-xs leading-relaxed italic">
                  A tecnologia não é apenas sobre máquinas e códigos. É sobre criar oportunidades,
                  resolver problemas e construir um futuro melhor para todos.
                </p>
              </blockquote>

              <div className="flex gap-2">
                <a href="https://wa.me/244943339350" target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl transition-colors">
                  <MessageCircle size={14} className="text-green-400" />
                  <span className="text-gray-400 text-xs">WhatsApp</span>
                </a>
                <a href="mailto:Inaciokuvingua@gmail.com"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl transition-colors">
                  <Mail size={14} className="text-blue-400" />
                  <span className="text-gray-400 text-xs">E-mail</span>
                </a>
              </div>

              <p className="text-center text-gray-700 text-xs">
                © {new Date().getFullYear()} IK FINANCE · Criado por Inácio Kuvingua Ulundo
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
