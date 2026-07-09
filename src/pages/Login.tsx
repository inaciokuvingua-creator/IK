import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, Eye, EyeOff, Mail, Lock, AlertCircle, MapPin, Quote, MessageCircle,
  UserRound, Building2, ShieldCheck, ChevronLeft, ChevronRight, Search, KeyRound,
  Smartphone, BadgeCheck,
} from 'lucide-react';
import { type AdvancedSignUpData, type SecurityQuestionInput, useAuth } from '../context/AuthContext';
import {
  ACCOUNT_TYPES,
  DOCUMENT_TYPES,
  SECURITY_QUESTION_SUGGESTIONS,
  formatUsername,
  normalizeUsername,
} from '../lib/accountSecurity';

type Mode = 'login' | 'signup' | 'recovery' | 'reset';

type SignupFormState = AdvancedSignUpData & {
  confirmPassword: string;
};

const INITIAL_SIGNUP: SignupFormState = {
  email: '',
  password: '',
  confirmPassword: '',
  accountType: 'cliente',
  fullName: '',
  username: '',
  phone: '',
  birthDate: '',
  sex: '',
  country: 'AO',
  province: '',
  city: '',
  address: '',
  postalCode: '',
  preferredLanguage: 'pt',
  bio: '',
  documentType: 'bi',
  documentNumber: '',
  issuerCountry: 'AO',
  issuedAt: '',
  expiresAt: '',
  documentUrl: '',
  companyName: '',
  companyCategory: '',
  companyWebsite: '',
  companyDescription: '',
  consent: false,
  securityQuestions: [
    { question: SECURITY_QUESTION_SUGGESTIONS[0], answer: '' },
    { question: SECURITY_QUESTION_SUGGESTIONS[1], answer: '' },
  ],
};

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function isBusinessLike(type: AdvancedSignUpData['accountType']) {
  return ['empresa', 'fornecedor', 'vendedor', 'criador', 'profissional'].includes(type);
}

export default function Login({ forceReset = false }: { forceReset?: boolean }) {
  const { t } = useTranslation();
  const { signIn, signUp, requestPasswordReset, completePasswordReset, recoverAccount, isPasswordRecovery } = useAuth();
  const resetFlowActive = forceReset || isPasswordRecovery;
  const [mode, setMode] = useState<Mode>(resetFlowActive ? 'reset' : 'login');
  const [signupStep, setSignupStep] = useState(0);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [signup, setSignup] = useState<SignupFormState>(INITIAL_SIGNUP);
  const [quickRecoveryIdentifier, setQuickRecoveryIdentifier] = useState('');
  const [recoveryForm, setRecoveryForm] = useState({
    identifier: '',
    fullName: '',
    birthDate: '',
    country: 'AO',
    city: '',
    phone: '',
    email: '',
    documentNumber: '',
  });
  const [recoveryResults, setRecoveryResults] = useState<Array<{
    user_id: string;
    username: string | null;
    masked_email: string | null;
    masked_phone: string | null;
    score: number;
    allow_reset: boolean;
    suspicious: boolean;
  }>>([]);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    if (!resetFlowActive) return;
    setMode('reset');
    setError(null);
    setSuccess('Defina uma nova senha para concluir a recuperação da conta.');
  }, [resetFlowActive]);

  const hasBusinessStep = isBusinessLike(signup.accountType);
  const steps = hasBusinessStep
    ? ['Tipo de conta', 'Identidade', 'Perfil profissional', 'Segurança']
    : ['Tipo de conta', 'Identidade', 'Segurança'];
  const finalStepIndex = steps.length - 1;
  const signupStrength = passwordStrength(signup.password);
  const usernamePreview = formatUsername(signup.username);

  const missingSignupHints = useMemo(() => {
    const hints: string[] = [];
    if (!signup.fullName.trim()) hints.push('Nome completo');
    if (!normalizeUsername(signup.username)) hints.push('Nome de utilizador único');
    if (!signup.phone?.trim()) hints.push('Telefone');
    if (!signup.documentNumber?.trim()) hints.push('Documento para recuperação');
    if (hasBusinessStep && !signup.companyName?.trim()) hints.push('Dados profissionais/empresa');
    return hints;
  }, [hasBusinessStep, signup]);

  const currentStepValid = (() => {
    if (signupStep === 0) return Boolean(signup.accountType);
    if (signupStep === 1) {
      return Boolean(
        signup.fullName.trim() &&
        normalizeUsername(signup.username) &&
        signup.email.trim() &&
        signup.password.length >= 8 &&
        signup.password === signup.confirmPassword &&
        signup.country.trim() &&
        signup.phone?.trim()
      );
    }
    if (hasBusinessStep && signupStep === 2) {
      if (!isBusinessLike(signup.accountType)) return true;
      if (signup.accountType === 'empresa') return Boolean(signup.companyName?.trim() && signup.companyCategory?.trim());
      return Boolean(signup.bio?.trim() || signup.companyName?.trim());
    }
    const securityIndex = hasBusinessStep ? 3 : 2;
    if (signupStep === securityIndex) {
      return Boolean(
        signup.securityQuestions.every((item) => item.question.trim() && item.answer.trim()) &&
        signup.consent
      );
    }
    return false;
  })();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const { error: authError } = await signIn(identifier, password);
    if (authError) setError(authError);
    setLoading(false);
  };

  const handleSignupSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const payload: AdvancedSignUpData = {
      ...signup,
      username: normalizeUsername(signup.username),
      securityQuestions: signup.securityQuestions.map((item: SecurityQuestionInput) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      })),
    };
    const { error: signupError } = await signUp(payload);
    if (signupError) {
      setError(signupError);
    } else {
      setSuccess('Conta criada. Se a confirmação por e-mail estiver ativa, confirme o endereço e depois complete documentos e 2FA em Meu Perfil.');
      setMode('login');
      setIdentifier(signup.email);
      setSignup(INITIAL_SIGNUP);
      setSignupStep(0);
    }
    setLoading(false);
  };

  const handleQuickReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const { error: resetError } = await requestPasswordReset(quickRecoveryIdentifier);
    if (resetError) setError(resetError);
    else setSuccess('Se a conta existir, enviamos um link seguro de redefinição para o e-mail associado.');
    setLoading(false);
  };

  const handleIdentityRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const { error: recoveryError, candidates } = await recoverAccount(recoveryForm);
    if (recoveryError) {
      setError(recoveryError);
    } else {
      setRecoveryResults(candidates);
      if (candidates.length === 0) setSuccess('Nenhuma conta compatível foi encontrada com os dados informados.');
      else setSuccess('Analisamos os dados informados. Revise os contactos mascarados e prossiga com a redefinição segura.');
    }
    setLoading(false);
  };

  const sendResetForCandidate = async (candidateIdentifier: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const { error: resetError } = await requestPasswordReset(candidateIdentifier);
    if (resetError) setError(resetError);
    else setSuccess('Link de redefinição enviado para o contacto principal da conta.');
    setLoading(false);
  };

  const handlePasswordResetCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (resetPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (resetPassword !== resetConfirm) {
      setError('A confirmação da senha não corresponde.');
      return;
    }
    setLoading(true);
    const { error: resetError } = await completePasswordReset(resetPassword);
    if (resetError) setError(resetError);
    else setSuccess('Senha redefinida com sucesso. A entrar na sua conta...');
    setLoading(false);
  };

  const updateSecurityQuestion = (index: number, patch: Partial<SecurityQuestionInput>) => {
    setSignup((current) => ({
      ...current,
      securityQuestions: current.securityQuestions.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  const stepProgress = ((signupStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,#020617_0%,#0b1220_55%,#111827_100%)] flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[52%] flex-col border-r border-white/10 overflow-y-auto backdrop-blur-sm bg-black/15">
        <div className="flex items-center gap-3 px-12 pt-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/40">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg tracking-tight">IK FINANCE</p>
            <p className="text-emerald-300/70 text-xs">Conta universal para finanças, lojas, negócios e comunidade</p>
          </div>
        </div>

        <div className="px-12 pt-12 pb-8 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              {t('auth.controlTotal')}<br />{t('auth.dasFinancas')}
            </h1>
            <p className="text-gray-300 text-base leading-relaxed max-w-xl">
              Novo cadastro multi-etapas com identidade reforçada, recuperação inteligente, segurança de dispositivos e um único perfil para todo o ecossistema IK Finance.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, title: 'Segurança avançada', desc: 'Histórico de login, dispositivos autorizados, OTP e recuperação por identidade.' },
              { icon: Building2, title: 'Conta universal', desc: 'Uma única conta para marketplace, empresas, mensagens, pagamentos e comunidades.' },
              { icon: Smartphone, title: 'Pronto para PWA', desc: 'Funciona em telemóvel, tablet e computador com experiência consistente.' },
              { icon: BadgeCheck, title: 'Perfis completos', desc: 'Dados públicos e privados separados, com preenchimento progressivo e auditável.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <Icon size={18} className="text-emerald-300" />
                </div>
                <p className="text-white font-semibold text-sm mb-1.5">{title}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-12 border-t border-white/10" />

        <div className="px-12 py-8 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.25em] mb-6">Criador do ecossistema</p>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/30">
              <span className="text-white font-bold text-xl">IK</span>
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">Inácio Kuvingua Ulundo</p>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin size={11} className="text-emerald-400" />
                <span className="text-emerald-400 text-xs font-medium">{t('auth.creatorLocation')}</span>
              </div>
            </div>
          </div>

          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Experiência desenhada para dar mais identidade, controlo e proteção a cada utilizador sem fragmentar o acesso entre módulos.
          </p>

          <div className="relative bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
            <Quote size={20} className="text-emerald-500/40 absolute top-4 left-4" />
            <p className="text-gray-300 text-sm leading-relaxed italic pl-6">
              A tecnologia não é apenas sobre máquinas e códigos. É sobre criar oportunidades,
              resolver problemas e construir um futuro melhor para todos.
            </p>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.25em] mb-3">{t('auth.contacto')}</p>
            <a href="https://wa.me/244943339350" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group">
              <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-green-600/30 transition-colors">
                <MessageCircle size={15} className="text-green-400" />
              </div>
              <div>
                <p className="text-gray-300 text-xs font-medium">WhatsApp</p>
                <p className="text-white text-sm font-semibold">+244 943 339 350</p>
              </div>
            </a>
            <a href="mailto:Inaciokuvingua@gmail.com" className="flex items-center gap-3 p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group">
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

        <div className="px-12 py-6 border-t border-white/10">
          <p className="text-gray-500 text-xs leading-relaxed">
            © {new Date().getFullYear()} IK FINANCE · {t('auth.footer')}<br />
            {t('auth.createdBy')} <span className="text-gray-400 font-medium">Inácio Kuvingua Ulundo</span>.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b border-white/10 bg-black/15 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="text-white font-bold tracking-tight">IK FINANCE</span>
          </div>
          <span className="text-emerald-300/70 text-xs">Acesso universal</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-white/10 bg-white/[0.02]">
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {[
                  { value: 'login' as Mode, label: 'Entrar' },
                  { value: 'signup' as Mode, label: 'Criar conta' },
                  { value: 'recovery' as Mode, label: 'Recuperar conta' },
                  ...(resetFlowActive ? [{ value: 'reset' as Mode, label: 'Nova senha' }] : []),
                ].map((item) => (
                  <button key={item.value} type="button" onClick={() => { setMode(item.value); setError(null); setSuccess(null); }} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${mode === item.value ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}>
                    {item.label}
                  </button>
                ))}
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">
                {mode === 'login' && 'Entrar com segurança'}
                {mode === 'signup' && 'Cadastro avançado IK FINANCE'}
                {mode === 'recovery' && 'Recuperar minha conta'}
                {mode === 'reset' && 'Definir nova senha'}
              </h2>
              <p className="text-gray-400 text-sm max-w-xl">
                {mode === 'login' && 'Use e-mail, @username, telefone ou documento cadastrado. Os acessos ficam registados por dispositivo.'}
                {mode === 'signup' && 'Crie uma identidade completa em etapas, com perfil público, dados privados e recuperação preparada desde o início.'}
                {mode === 'recovery' && 'Recupere acesso por e-mail, telefone, nome de utilizador, documento ou confirmação inteligente dos seus dados.'}
                {mode === 'reset' && 'Escolha uma nova senha forte para concluir a recuperação e voltar a entrar no IK Finance.'}
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {error && <div className="flex items-center gap-2 bg-red-950/50 border border-red-900 rounded-2xl p-3.5 mb-5"><AlertCircle size={16} className="text-red-400 shrink-0" /><p className="text-red-300 text-sm">{error}</p></div>}
              {success && <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-800 rounded-2xl p-3.5 mb-5"><ShieldCheck size={16} className="text-emerald-400 shrink-0" /><p className="text-emerald-300 text-sm">{success}</p></div>}

              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Identificador</label>
                    <div className="relative">
                      <UserRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder="E-mail, @username, telefone ou documento" className="w-full bg-slate-900 border border-white/10 text-white rounded-2xl py-3 pl-10 pr-4 text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm text-gray-400">{t('auth.password')}</label>
                      <button type="button" onClick={() => setMode('recovery')} className="text-xs text-emerald-400 hover:text-emerald-300">Esqueceu o acesso?</button>
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={t('auth.passwordPlaceholder')} className="w-full bg-slate-900 border border-white/10 text-white rounded-2xl py-3 pl-10 pr-11 text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-gray-400">E-mail autenticado</div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-gray-400">Auditoria por dispositivo</div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-gray-400">Alertas de acesso suspeito</div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-600 text-white font-semibold rounded-2xl py-3 text-sm transition-colors mt-2">{loading ? t('auth.loading') : 'Entrar'}</button>
                </form>
              )}

              {mode === 'reset' && (
                <form onSubmit={handlePasswordResetCompletion} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Nova senha</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type={showResetPassword ? 'text' : 'password'} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required placeholder="Mínimo 8 caracteres" className="w-full bg-slate-900 border border-white/10 text-white rounded-2xl py-3 pl-10 pr-11 text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors" />
                      <button type="button" onClick={() => setShowResetPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                        {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Confirmar nova senha</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type={showResetPassword ? 'text' : 'password'} value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} required placeholder="Repita a nova senha" className="w-full bg-slate-900 border border-white/10 text-white rounded-2xl py-3 pl-10 pr-4 text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-gray-400">Use 8+ caracteres</div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-gray-400">Combine letras, números e símbolos</div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-gray-400">A redefinição termina automaticamente</div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-600 text-white font-semibold rounded-2xl py-3 text-sm transition-colors mt-2">{loading ? t('auth.loading') : 'Guardar nova senha'}</button>
                </form>
              )}

              {mode === 'signup' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2"><span>Etapa {signupStep + 1} de {steps.length}</span><span>{Math.round(stepProgress)}%</span></div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all" style={{ width: `${stepProgress}%` }} /></div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {steps.map((step, index) => <span key={step} className={`px-3 py-1 rounded-full text-xs border ${index === signupStep ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : index < signupStep ? 'border-white/10 text-white bg-white/5' : 'border-white/10 text-gray-500 bg-transparent'}`}>{step}</span>)}
                    </div>
                  </div>

                  {signupStep === 0 && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {ACCOUNT_TYPES.map((item) => (
                        <button key={item.value} type="button" onClick={() => setSignup((current) => ({ ...current, accountType: item.value }))} className={`text-left p-4 rounded-2xl border transition-colors ${signup.accountType === item.value ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">{item.value === 'empresa' ? <Building2 size={18} className="text-emerald-300" /> : <UserRound size={18} className="text-emerald-300" />}</div>
                            <div><p className="text-white font-semibold text-sm">{item.label}</p><p className="text-gray-500 text-xs">{item.value}</p></div>
                          </div>
                          <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {signupStep === 1 && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2"><label className="block text-sm text-gray-400 mb-1.5">Nome completo</label><input value={signup.fullName} onChange={(e) => setSignup((current) => ({ ...current, fullName: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Nome de utilizador</label><input value={signup.username} onChange={(e) => setSignup((current) => ({ ...current, username: e.target.value }))} placeholder="inaciok" className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /><p className="text-xs text-emerald-400 mt-1">{usernamePreview || '@username'}</p></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">E-mail</label><input type="email" value={signup.email} onChange={(e) => setSignup((current) => ({ ...current, email: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Senha</label><div className="relative"><input type={showSignupPassword ? 'text' : 'password'} value={signup.password} onChange={(e) => setSignup((current) => ({ ...current, password: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 pr-11 text-white text-sm focus:outline-none focus:border-emerald-500" /><button type="button" onClick={() => setShowSignupPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div><div className="flex gap-1 mt-2">{[1, 2, 3, 4].map((value) => <div key={value} className={`h-1.5 flex-1 rounded-full ${signupStrength >= value ? 'bg-emerald-400' : 'bg-white/10'}`} />)}</div></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Confirmar senha</label><div className="relative"><input type={showSignupConfirm ? 'text' : 'password'} value={signup.confirmPassword} onChange={(e) => setSignup((current) => ({ ...current, confirmPassword: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 pr-11 text-white text-sm focus:outline-none focus:border-emerald-500" /><button type="button" onClick={() => setShowSignupConfirm((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showSignupConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Telefone</label><input value={signup.phone} onChange={(e) => setSignup((current) => ({ ...current, phone: e.target.value }))} placeholder="+244..." className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Data de nascimento</label><input type="date" value={signup.birthDate} onChange={(e) => setSignup((current) => ({ ...current, birthDate: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Sexo</label><select value={signup.sex} onChange={(e) => setSignup((current) => ({ ...current, sex: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"><option value="">Opcional</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option><option value="outro">Outro</option></select></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">País</label><input value={signup.country} onChange={(e) => setSignup((current) => ({ ...current, country: e.target.value.toUpperCase() }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Província / Estado</label><input value={signup.province} onChange={(e) => setSignup((current) => ({ ...current, province: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Cidade</label><input value={signup.city} onChange={(e) => setSignup((current) => ({ ...current, city: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Código postal</label><input value={signup.postalCode} onChange={(e) => setSignup((current) => ({ ...current, postalCode: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div className="sm:col-span-2"><label className="block text-sm text-gray-400 mb-1.5">Morada</label><input value={signup.address} onChange={(e) => setSignup((current) => ({ ...current, address: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Idioma preferido</label><select value={signup.preferredLanguage} onChange={(e) => setSignup((current) => ({ ...current, preferredLanguage: e.target.value as AdvancedSignUpData['preferredLanguage'] }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"><option value="pt">Português</option><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option><option value="zh">中文</option><option value="ja">日本語</option></select></div>
                    </div>
                  )}

                  {hasBusinessStep && signupStep === 2 && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2"><label className="block text-sm text-gray-400 mb-1.5">Biografia / descrição</label><textarea value={signup.bio} onChange={(e) => setSignup((current) => ({ ...current, bio: e.target.value }))} rows={4} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Nome da empresa / marca</label><input value={signup.companyName} onChange={(e) => setSignup((current) => ({ ...current, companyName: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Categoria</label><input value={signup.companyCategory} onChange={(e) => setSignup((current) => ({ ...current, companyCategory: e.target.value }))} placeholder="Tecnologia, retalho, serviços..." className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Website</label><input value={signup.companyWebsite} onChange={(e) => setSignup((current) => ({ ...current, companyWebsite: e.target.value }))} placeholder="https://..." className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Documento profissional / empresa</label><select value={signup.documentType} onChange={(e) => setSignup((current) => ({ ...current, documentType: e.target.value as AdvancedSignUpData['documentType'] }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500">{DOCUMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Número do documento</label><input value={signup.documentNumber} onChange={(e) => setSignup((current) => ({ ...current, documentNumber: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">País emissor</label><input value={signup.issuerCountry} onChange={(e) => setSignup((current) => ({ ...current, issuerCountry: e.target.value.toUpperCase() }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Validade</label><input type="date" value={signup.expiresAt} onChange={(e) => setSignup((current) => ({ ...current, expiresAt: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div className="sm:col-span-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">Upload do documento e logótipo pode ser concluído logo após a criação da conta em <span className="text-white font-medium">Meu Perfil</span>, sem perder o histórico do cadastro.</div>
                    </div>
                  )}

                  {signupStep === finalStepIndex && (
                    <div className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        {signup.securityQuestions.map((item, index) => (
                          <div key={`${item.question}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <label className="block text-sm text-gray-400 mb-1.5">Pergunta de segurança {index + 1}</label>
                            <select value={item.question} onChange={(e) => updateSecurityQuestion(index, { question: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 mb-3">{SECURITY_QUESTION_SUGGESTIONS.map((question) => <option key={question} value={question}>{question}</option>)}</select>
                            <input value={item.answer} onChange={(e) => updateSecurityQuestion(index, { answer: e.target.value })} placeholder="Resposta secreta" className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
                          </div>
                        ))}
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3 text-xs"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-gray-400">Recuperação por e-mail</div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-gray-400">OTP e 2FA podem ser ativados no perfil</div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-gray-400">Histórico de login por dispositivo</div></div>
                      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><input type="checkbox" checked={signup.consent} onChange={(e) => setSignup((current) => ({ ...current, consent: e.target.checked }))} className="mt-1" /><span className="text-sm text-gray-300 leading-relaxed">Concordo com a utilização segura dos meus dados para autenticação, recuperação de conta, prevenção de fraude, auditoria de acessos e exportação futura das minhas informações.</span></label>
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">Faltas recomendadas antes de concluir: {missingSignupHints.length > 0 ? missingSignupHints.join(', ') : 'nenhuma. O seu perfil inicial está bem preparado.'}</div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button type="button" onClick={() => setSignupStep((current) => Math.max(0, current - 1))} disabled={signupStep === 0 || loading} className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-white/10 text-gray-300 disabled:opacity-40 hover:bg-white/[0.03]"><ChevronLeft size={16} /> Voltar</button>
                    {signupStep < finalStepIndex ? (
                      <button type="button" onClick={() => setSignupStep((current) => Math.min(finalStepIndex, current + 1))} disabled={!currentStepValid || loading} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-white font-semibold disabled:bg-emerald-900 disabled:text-emerald-600 hover:bg-emerald-400">Continuar <ChevronRight size={16} /></button>
                    ) : (
                      <button type="button" onClick={handleSignupSubmit} disabled={!currentStepValid || loading} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-white font-semibold disabled:bg-emerald-900 disabled:text-emerald-600 hover:bg-emerald-400">{loading ? 'Criando conta...' : 'Criar conta segura'}</button>
                    )}
                  </div>
                </div>
              )}

              {mode === 'recovery' && (
                <div className="space-y-8">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <form onSubmit={handleQuickReset} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                      <div className="flex items-center gap-2 mb-1"><KeyRound size={16} className="text-emerald-400" /><h3 className="text-white font-semibold">Redefinição rápida</h3></div>
                      <p className="text-gray-400 text-sm">Informe e-mail, telefone, @username ou documento cadastrado para receber o link seguro.</p>
                      <div><label className="block text-sm text-gray-400 mb-1.5">Identificador</label><input value={quickRecoveryIdentifier} onChange={(e) => setQuickRecoveryIdentifier(e.target.value)} required className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <button type="submit" disabled={loading} className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-600">{loading ? 'A processar...' : 'Enviar redefinição'}</button>
                    </form>
                    <form onSubmit={handleIdentityRecovery} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                      <div className="flex items-center gap-2 mb-1"><Search size={16} className="text-emerald-400" /><h3 className="text-white font-semibold">Não lembro meus dados</h3></div>
                      <p className="text-gray-400 text-sm">Confirme os dados que lembrar para o sistema comparar automaticamente a identidade.</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <input value={recoveryForm.identifier} onChange={(e) => setRecoveryForm((current) => ({ ...current, identifier: e.target.value }))} placeholder="E-mail, @username ou documento" className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
                        <input value={recoveryForm.fullName} onChange={(e) => setRecoveryForm((current) => ({ ...current, fullName: e.target.value }))} placeholder="Nome completo" className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
                        <input type="date" value={recoveryForm.birthDate} onChange={(e) => setRecoveryForm((current) => ({ ...current, birthDate: e.target.value }))} className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
                        <input value={recoveryForm.country} onChange={(e) => setRecoveryForm((current) => ({ ...current, country: e.target.value }))} placeholder="País" className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
                        <input value={recoveryForm.city} onChange={(e) => setRecoveryForm((current) => ({ ...current, city: e.target.value }))} placeholder="Cidade" className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
                        <input value={recoveryForm.phone} onChange={(e) => setRecoveryForm((current) => ({ ...current, phone: e.target.value }))} placeholder="Telefone antigo" className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
                        <input value={recoveryForm.email} onChange={(e) => setRecoveryForm((current) => ({ ...current, email: e.target.value }))} placeholder="E-mail antigo" className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
                        <input value={recoveryForm.documentNumber} onChange={(e) => setRecoveryForm((current) => ({ ...current, documentNumber: e.target.value }))} placeholder="Número do documento" className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
                      </div>
                      <button type="submit" disabled={loading} className="w-full py-3 rounded-2xl bg-white text-slate-950 font-semibold hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-400">{loading ? 'Comparando dados...' : 'Comparar identidade'}</button>
                    </form>
                  </div>

                  {recoveryResults.length > 0 && (
                    <div className="space-y-3">
                      {recoveryResults.map((candidate) => (
                        <div key={candidate.user_id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                          <div>
                            <p className="text-white font-semibold">{candidate.username ? `@${candidate.username}` : 'Conta compatível'}</p>
                            <p className="text-gray-400 text-sm">E-mail: {candidate.masked_email || 'não disponível'} · Telefone: {candidate.masked_phone || 'não disponível'}</p>
                            <p className={`text-xs mt-2 ${candidate.allow_reset ? 'text-emerald-400' : candidate.suspicious ? 'text-amber-400' : 'text-red-400'}`}>Pontuação de correspondência: {candidate.score}%{candidate.allow_reset && ' · recuperação aprovada'}{candidate.suspicious && ' · verificação adicional recomendada'}{!candidate.allow_reset && !candidate.suspicious && ' · acesso bloqueado temporariamente'}</p>
                          </div>
                          <button type="button" disabled={!candidate.allow_reset || loading || !candidate.username} onClick={() => candidate.username && sendResetForCandidate(candidate.username)} className="px-4 py-3 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-600">Redefinir senha</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}