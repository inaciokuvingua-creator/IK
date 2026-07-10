import { useState } from 'react';
import { Shield, Eye, EyeOff, AlertCircle, Lock, User } from 'lucide-react';
import { useAdminAuth } from '../AdminAuthContext';

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    // O fluxo chama diretamente o login do contexto, que tratará o bypass
    const err = await login(identifier.trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl mb-4">
            <Shield size={28} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Painel Administrativo</h1>
          <p className="text-gray-500 text-sm mt-1">IK Finance · Acesso Restrito</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <form onSubmit={handle} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Utilizador ou e-mail</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="admin ou inaciokuvingua@gmail.com"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl py-3 pl-10 pr-4 text-sm placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl py-3 pl-10 pr-11 text-sm placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
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
              className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:text-red-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              {loading ? 'Autenticando...' : 'Entrar no Painel'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-800">
            <div className="flex items-start gap-2.5 bg-amber-950/30 border border-amber-900/40 rounded-xl p-3.5">
              <Shield size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300/80 text-xs leading-relaxed">
                Área restrita. Todas as ações são registadas em log de auditoria. Acesso não autorizado é proibido.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          © IK Finance · Criado por Inácio Kuvingua Ulundo
        </p>
      </div>
    </div>
  );
}
