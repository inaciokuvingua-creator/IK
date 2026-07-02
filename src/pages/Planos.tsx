import { useState } from 'react';
import {
  Check, Star, Crown, Building2, Rocket, Zap, X,
  AlertCircle, Clock, Shield, RefreshCw, ChevronRight,
  Sparkles, MessageSquare, Store, Users,
} from 'lucide-react';
import { useProfile, getTrialDaysLeft, isTrialExpired } from '../context/ProfileContext';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const PLANS = [
  {
    id: 'free',
    label: 'Gratuito',
    price: 0,
    period: 'após o teste',
    icon: Star,
    color: 'border-gray-700',
    accent: 'text-gray-400',
    btnClass: 'bg-gray-800 text-gray-400',
    badge: '',
    features: [
      'Dashboard financeiro',
      'Até 3 cofres',
      'Até 50 transações/mês',
      'Relatórios básicos',
      '1 negócio',
      'Marketplace (compra)',
    ],
    disabled: ['Loja no marketplace', 'Empresas e equipas', 'Chat privado', 'IK Finance AI', 'Verificação de conta', 'Suporte prioritário'],
  },
  {
    id: 'premium',
    label: 'Premium',
    price: 2500,
    period: 'mês',
    icon: Crown,
    color: 'border-amber-700',
    accent: 'text-amber-400',
    btnClass: 'bg-amber-500 hover:bg-amber-400 text-white',
    badge: 'Mais popular',
    features: [
      'Tudo do gratuito',
      'Cofres ilimitados',
      'Transações ilimitadas',
      'Relatórios avançados',
      'Negócios ilimitados',
      'Loja no marketplace',
      'Chat privado',
      'IK Finance AI (500 msgs/dia)',
      'Verificação de conta',
      'Suporte prioritário',
    ],
    disabled: ['Empresas multi-utilizador', 'API avançada'],
  },
  {
    id: 'business',
    label: 'Business',
    price: 7500,
    period: 'mês',
    icon: Building2,
    color: 'border-blue-700',
    accent: 'text-blue-400',
    btnClass: 'bg-blue-600 hover:bg-blue-500 text-white',
    badge: '',
    features: [
      'Tudo do Premium',
      'Empresas e departamentos',
      'Até 20 funcionários',
      'Gestão de equipas',
      'Relatórios empresariais',
      'Múltiplas lojas',
      'API de integrações',
      'Dashboard empresarial',
    ],
    disabled: ['Organizações ilimitadas'],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 0,
    period: 'personalizado',
    icon: Rocket,
    color: 'border-purple-700',
    accent: 'text-purple-400',
    btnClass: 'border-2 border-purple-700 text-purple-400 hover:bg-purple-950/40',
    badge: 'Personalizado',
    features: [
      'Tudo do Business',
      'Organizações ilimitadas',
      'Funcionários ilimitados',
      'SLA garantido',
      'Gerente dedicado',
      'Integrações bancárias',
      'White-label disponível',
      'Suporte 24/7',
    ],
    disabled: [],
  },
];

const TRIAL_FEATURES = [
  { icon: Sparkles,     label: 'IK Finance AI',      desc: 'Assistente inteligente completo' },
  { icon: Store,        label: 'Marketplace',         desc: 'Compra e venda de produtos' },
  { icon: Users,        label: 'Empresas',            desc: 'Gestão de equipes' },
  { icon: MessageSquare,label: 'Chat',                desc: 'Mensagens privadas' },
  { icon: Shield,       label: 'Cofres ilimitados',   desc: 'Organize seu dinheiro' },
  { icon: Zap,          label: 'Relatórios avançados',desc: 'Análises detalhadas' },
];

export default function Planos() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { format } = useCurrency();
  const [billing, setBilling] = useState<'mensal' | 'anual'>('mensal');
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = (ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 4000); };

  const daysLeft = getTrialDaysLeft(profile);
  const trialExpired = isTrialExpired(profile);
  const currentPlan = profile?.plan ?? 'free';
  const inTrial = profile?.plan === 'free' && profile?.trial_active && !trialExpired;

  const subscribe = async (planId: string) => {
    if (!user) return;
    if (planId === 'enterprise') {
      window.open('mailto:Inaciokuvingua@gmail.com?subject=IK Finance Enterprise&body=Olá, tenho interesse no plano Enterprise.', '_blank');
      return;
    }
    if (planId === 'free') return;
    setLoading(planId);
    try {
      const planData = PLANS.find(p => p.id === planId)!;
      const multiplier = billing === 'anual' ? 12 : 1;
      const discount = billing === 'anual' ? 0.8 : 1;
      const preco = planData.price * multiplier * discount;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + (billing === 'anual' ? 12 : 1));

      await supabase.from('plan_subscriptions').insert({
        user_id: user.id,
        plan: planId,
        preco,
        moeda: 'AOA',
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      // Update user profile plan
      await supabase.from('user_profiles').update({
        plan: planId,
        plan_expires_at: expiresAt.toISOString(),
        trial_active: false,
      }).eq('user_id', user.id);

      showToast(true, `Plano ${planData.label} ativado com sucesso! Integração com Stripe/PayPal disponível em breve para pagamento online.`);
    } catch (e) { showToast(false, (e as Error).message); }
    setLoading(null);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Planos & Preços</h1>
        <p className="text-gray-400 text-sm mt-1">Escolha o plano ideal para você ou sua empresa</p>
      </div>

      {toast && (
        <div className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Trial banner */}
      {inTrial && (
        <div className="bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-800/50 rounded-2xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Clock size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Período de Teste Gratuito</p>
                <p className="text-emerald-300/80 text-sm mt-0.5">
                  Você tem acesso completo a todos os recursos Premium por <strong>{daysLeft} dia{daysLeft !== 1 ? 's' : ''}</strong>.
                </p>
                {profile?.trial_started_at && profile?.trial_ends_at && (
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(profile.trial_started_at).toLocaleDateString('pt-AO')} → {new Date(profile.trial_ends_at).toLocaleDateString('pt-AO')}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-emerald-400 font-bold text-2xl">{daysLeft}</p>
              <p className="text-gray-500 text-xs">dias restantes</p>
            </div>
          </div>

          {/* Trial progress bar */}
          {profile?.trial_started_at && profile?.trial_ends_at && (() => {
            const start = new Date(profile.trial_started_at).getTime();
            const end = new Date(profile.trial_ends_at).getTime();
            const pct = Math.min(100, ((Date.now() - start) / (end - start)) * 100);
            return (
              <div className="mt-4">
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })()}

          {/* Trial features grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            {TRIAL_FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                <Icon size={13} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-white text-xs font-medium leading-tight">{label}</p>
                  <p className="text-gray-500 text-[10px]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired trial banner */}
      {trialExpired && currentPlan === 'free' && (
        <div className="bg-red-950/40 border border-red-700/50 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-bold text-sm">O seu período de teste expirou</p>
            <p className="text-red-300/70 text-sm mt-0.5">Escolha um plano abaixo para continuar com acesso completo à plataforma. A sua conta nunca será bloqueada — o plano gratuito mantém acesso básico.</p>
          </div>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${billing === 'mensal' ? 'text-white' : 'text-gray-500'}`}>Mensal</span>
        <button onClick={() => setBilling(billing === 'mensal' ? 'anual' : 'mensal')}
          className={`relative w-12 h-6 rounded-full transition-colors ${billing === 'anual' ? 'bg-emerald-500' : 'bg-gray-700'}`}>
          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billing === 'anual' ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm font-medium ${billing === 'anual' ? 'text-white' : 'text-gray-500'}`}>
          Anual <span className="text-emerald-400 text-xs font-semibold">−20%</span>
        </span>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          const price = billing === 'anual' && plan.price > 0 ? Math.round(plan.price * 0.8) : plan.price;

          return (
            <div key={plan.id} className={`relative bg-gray-900 border-2 rounded-2xl p-5 flex flex-col ${plan.color} ${isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-gray-950' : ''}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500 text-white whitespace-nowrap">{plan.badge}</span>
                </div>
              )}

              <div className="mb-4">
                <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center mb-3">
                  <Icon size={18} className={plan.accent} />
                </div>
                <h3 className="text-white font-bold text-lg">{plan.label}</h3>
                <div className="mt-2">
                  {plan.price === 0 && plan.id !== 'enterprise' ? (
                    <div>
                      <p className="text-2xl font-bold text-white">Grátis</p>
                      <p className="text-gray-500 text-xs mt-0.5">{plan.period}</p>
                    </div>
                  ) : plan.id === 'enterprise' ? (
                    <p className={`text-lg font-bold ${plan.accent}`}>Sob consulta</p>
                  ) : (
                    <div>
                      <span className="text-2xl font-bold text-white">{price.toLocaleString('pt-AO')} Kz</span>
                      <span className="text-gray-500 text-sm">/{billing === 'anual' ? 'mês' : plan.period}</span>
                      {billing === 'anual' && <p className="text-emerald-400 text-xs mt-0.5">Cobrado anualmente</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-1.5 mb-5">
                {plan.features.map(f => (
                  <div key={f} className="flex items-start gap-2">
                    <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-gray-300 text-xs">{f}</span>
                  </div>
                ))}
                {plan.disabled.map(f => (
                  <div key={f} className="flex items-start gap-2 opacity-40">
                    <X size={13} className="text-gray-600 shrink-0 mt-0.5" />
                    <span className="text-gray-500 text-xs">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => subscribe(plan.id)}
                disabled={isCurrent || loading === plan.id || plan.id === 'free'}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                  isCurrent ? 'bg-gray-800 text-gray-400 cursor-default' : plan.btnClass
                }`}
              >
                {loading === plan.id ? (
                  <span className="flex items-center justify-center gap-2"><RefreshCw size={13} className="animate-spin" /> Processando...</span>
                ) : isCurrent ? 'Plano atual' :
                  plan.id === 'enterprise' ? 'Contactar vendas' :
                  plan.id === 'free' ? 'Plano básico' :
                  <span className="flex items-center justify-center gap-1.5">
                    Assinar {plan.label} <ChevronRight size={13} />
                  </span>
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* Trust signals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {[
          { icon: Zap,     title: 'Upgrade a qualquer momento', desc: 'Mude de plano sem perder nenhum dado' },
          { icon: Shield,  title: 'Conta nunca bloqueada',      desc: 'O plano gratuito garante acesso básico sempre' },
          { icon: RefreshCw, title: 'Cancele quando quiser',    desc: 'Sem contratos ou taxas de cancelamento' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
            <Icon size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-sm font-medium">{title}</p>
              <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment note */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-gray-400 text-xs leading-relaxed">
          <strong className="text-white">Pagamentos:</strong> A integração com Stripe, PayPal e transferência bancária está em configuração. Por enquanto, o plano é ativado imediatamente. Para pagamentos, contacte <a href="mailto:Inaciokuvingua@gmail.com" className="text-emerald-400 hover:text-emerald-300">Inaciokuvingua@gmail.com</a> ou <a href="https://wa.me/244943339350" className="text-emerald-400 hover:text-emerald-300">WhatsApp</a>.
        </p>
      </div>
    </div>
  );
}
