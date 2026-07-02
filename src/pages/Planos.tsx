import { useState } from 'react';
import {
  Check, Star, Crown, Building2, Rocket, Zap, X,
  AlertCircle, Clock, Shield, RefreshCw, ChevronRight,
  Sparkles, MessageSquare, Store, Users, Phone, Mail,
  Send, CheckCircle2, ChevronDown,
} from 'lucide-react';
import { useProfile, getTrialDaysLeft, isTrialExpired } from '../context/ProfileContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const WA_NUMBER = '244943339350';
const SUPPORT_EMAIL = 'Inaciokuvingua@gmail.com';

const PLANS = [
  {
    id: 'free',
    label: 'Gratuito',
    price: 0,
    period: 'após o teste',
    icon: Star,
    color: 'border-gray-700',
    accent: 'text-gray-400',
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
    color: 'border-amber-600/60',
    accent: 'text-amber-400',
    badge: 'Mais popular',
    highlight: true,
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
    color: 'border-blue-700/60',
    accent: 'text-blue-400',
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
    color: 'border-purple-700/60',
    accent: 'text-purple-400',
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
  { icon: Sparkles,      label: 'IK Finance AI',       desc: 'Assistente inteligente completo' },
  { icon: Store,         label: 'Marketplace',          desc: 'Compra e venda de produtos' },
  { icon: Users,         label: 'Empresas',             desc: 'Gestão de equipes' },
  { icon: MessageSquare, label: 'Chat',                 desc: 'Mensagens privadas' },
  { icon: Shield,        label: 'Cofres ilimitados',    desc: 'Organize seu dinheiro' },
  { icon: Zap,           label: 'Relatórios avançados', desc: 'Análises detalhadas' },
];

type ContactModal = {
  plan: typeof PLANS[number];
  billing: 'mensal' | 'anual';
};

export default function Planos() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [billing, setBilling] = useState<'mensal' | 'anual'>('mensal');
  const [contactModal, setContactModal] = useState<ContactModal | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [requestSent, setRequestSent] = useState<string | null>(null); // planId
  const [sending, setSending] = useState(false);

  // Contact modal state
  const [whatsapp, setWhatsapp] = useState('');
  const [mensagem, setMensagem] = useState('');

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const daysLeft = getTrialDaysLeft(profile);
  const trialExpired = isTrialExpired(profile);
  const currentPlan = profile?.plan ?? 'free';
  const inTrial = profile?.plan === 'free' && profile?.trial_active && !trialExpired;

  const getPrice = (plan: typeof PLANS[number]) => {
    if (plan.price === 0) return 0;
    return billing === 'anual' ? Math.round(plan.price * 0.8) : plan.price;
  };

  const openContact = (plan: typeof PLANS[number]) => {
    if (plan.id === 'free') return;
    setWhatsapp('');
    setMensagem('');
    setContactModal({ plan, billing });
  };

  const buildWAMessage = (plan: typeof PLANS[number]) => {
    const price = getPrice(plan);
    const priceStr = price > 0 ? `${price.toLocaleString('pt-AO')} Kz/${billing === 'anual' ? 'mês (anual)' : 'mês'}` : 'Sob consulta';
    return encodeURIComponent(
      `Olá! Tenho interesse no plano *${plan.label}* da IK Finance.\n\n` +
      `Valor: ${priceStr}\nFaturação: ${billing === 'anual' ? 'Anual' : 'Mensal'}\n` +
      `Conta: ${user?.email ?? ''}\n\nPoderia me ajudar com o processo de assinatura?`
    );
  };

  const buildEmailSubject = (plan: typeof PLANS[number]) =>
    encodeURIComponent(`Solicitação de Assinatura — Plano ${plan.label}`);

  const buildEmailBody = (plan: typeof PLANS[number]) => {
    const price = getPrice(plan);
    const priceStr = price > 0 ? `${price.toLocaleString('pt-AO')} Kz/${billing === 'anual' ? 'mês (anual)' : 'mês'}` : 'Sob consulta';
    return encodeURIComponent(
      `Olá,\n\nGostaria de assinar o Plano ${plan.label} da IK Finance.\n\n` +
      `Valor: ${priceStr}\nFaturação: ${billing === 'anual' ? 'Anual' : 'Mensal'}\n` +
      `Minha conta: ${user?.email ?? ''}\n\n` +
      (mensagem ? `Mensagem adicional: ${mensagem}\n\n` : '') +
      `Aguardo as instruções de pagamento.\n\nObrigado!`
    );
  };

  const submitRequest = async () => {
    if (!contactModal || !user) return;
    setSending(true);
    try {
      const price = getPrice(contactModal.plan);
      const { error } = await supabase.from('plan_requests').insert({
        user_id: user.id,
        user_email: user.email ?? '',
        user_nome: profile?.nome ?? null,
        plan: contactModal.plan.id,
        billing: contactModal.billing,
        preco: price,
        moeda: 'AOA',
        status: 'pending',
        mensagem: mensagem || null,
        whatsapp: whatsapp || null,
      });
      if (error) throw error;
      setRequestSent(contactModal.plan.id);
      setContactModal(null);
      showToast(true, `Solicitação enviada! Nossa equipe entrará em contato em breve.`);
    } catch (e) {
      showToast(false, (e as Error).message);
    }
    setSending(false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Planos & Preços</h1>
        <p className="text-gray-400 text-sm mt-1">Escolha o plano ideal para você ou sua empresa</p>
      </div>

      {toast && (
        <div className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {toast.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {toast.msg}
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
                  Acesso completo a todos os recursos Premium por <strong>{daysLeft} dia{daysLeft !== 1 ? 's' : ''}</strong>.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-emerald-400 font-bold text-2xl">{daysLeft}</p>
              <p className="text-gray-500 text-xs">dias restantes</p>
            </div>
          </div>
          {profile?.trial_started_at && profile?.trial_ends_at && (() => {
            const start = new Date(profile.trial_started_at!).getTime();
            const end = new Date(profile.trial_ends_at!).getTime();
            const pct = Math.min(100, ((Date.now() - start) / (end - start)) * 100);
            return (
              <div className="mt-4">
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })()}
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
            <p className="text-red-300/70 text-sm mt-0.5">Escolha um plano abaixo para continuar com acesso completo. O plano gratuito mantém acesso básico.</p>
          </div>
        </div>
      )}

      {/* How it works banner */}
      <div className="bg-gray-900 border border-gray-700/50 rounded-2xl p-4">
        <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <MessageSquare size={15} className="text-emerald-400" /> Como funciona a assinatura
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { n: '1', title: 'Escolha o plano', desc: 'Selecione o plano ideal e clique em Solicitar.' },
            { n: '2', title: 'Entre em contato', desc: 'Fale connosco pelo WhatsApp ou e-mail para combinar o pagamento.' },
            { n: '3', title: 'Ativação imediata', desc: 'Após confirmação do pagamento, seu plano é ativado em minutos.' },
          ].map(s => (
            <div key={s.n} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-700/40 flex items-center justify-center shrink-0 text-emerald-400 font-bold text-xs">{s.n}</div>
              <div>
                <p className="text-white text-xs font-semibold">{s.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
          const price = getPrice(plan);
          const hasPendingRequest = requestSent === plan.id;

          return (
            <div key={plan.id} className={`relative bg-gray-900 border-2 rounded-2xl p-5 flex flex-col transition-all ${plan.color} ${isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-gray-950' : ''} ${'highlight' in plan && plan.highlight ? 'shadow-lg shadow-amber-900/20' : ''}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${plan.id === 'enterprise' ? 'bg-purple-600 text-white' : 'bg-amber-500 text-white'}`}>{plan.badge}</span>
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

              {/* CTA button */}
              {isCurrent ? (
                <div className="w-full py-2.5 rounded-xl bg-gray-800 text-gray-400 text-sm font-semibold text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={14} /> Plano atual
                </div>
              ) : plan.id === 'free' ? (
                <div className="w-full py-2.5 rounded-xl bg-gray-800/60 text-gray-500 text-sm font-medium text-center">
                  Plano básico
                </div>
              ) : hasPendingRequest ? (
                <div className="w-full py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-sm font-semibold text-center flex items-center justify-center gap-1.5">
                  <Clock size={13} /> Solicitação enviada
                </div>
              ) : (
                <button
                  onClick={() => openContact(plan)}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    'highlight' in plan && plan.highlight
                      ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-md shadow-amber-900/30'
                      : plan.id === 'enterprise'
                      ? 'border-2 border-purple-700 text-purple-400 hover:bg-purple-950/40'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  Solicitar {plan.label} <ChevronRight size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Contact methods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-4 bg-gray-900 border border-gray-700 hover:border-green-700/60 rounded-2xl p-5 transition-all group">
          <div className="w-12 h-12 bg-green-500/15 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-green-500/25 transition-colors">
            <Phone size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">WhatsApp</p>
            <p className="text-gray-500 text-xs mt-0.5">+{WA_NUMBER}</p>
            <p className="text-green-400 text-xs mt-1 font-medium">Resposta rápida · Clique para abrir</p>
          </div>
        </a>
        <a href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-4 bg-gray-900 border border-gray-700 hover:border-blue-700/60 rounded-2xl p-5 transition-all group">
          <div className="w-12 h-12 bg-blue-500/15 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-500/25 transition-colors">
            <Mail size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">E-mail</p>
            <p className="text-gray-500 text-xs mt-0.5 break-all">{SUPPORT_EMAIL}</p>
            <p className="text-blue-400 text-xs mt-1 font-medium">Resposta em até 24h</p>
          </div>
        </a>
      </div>

      {/* Trust signals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Zap,       title: 'Upgrade a qualquer momento', desc: 'Mude de plano sem perder nenhum dado' },
          { icon: Shield,    title: 'Conta nunca bloqueada',      desc: 'O plano gratuito garante acesso básico sempre' },
          { icon: RefreshCw, title: 'Sem contratos longos',       desc: 'Cancele ou ajuste quando quiser' },
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

      {/* ── Contact / Request modal ──────────────────────────────────────────── */}
      {contactModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center">
                  <contactModal.plan.icon size={16} className={contactModal.plan.accent} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Plano {contactModal.plan.label}</p>
                  {contactModal.plan.price > 0 && (
                    <p className="text-gray-500 text-xs">
                      {getPrice(contactModal.plan).toLocaleString('pt-AO')} Kz/{billing === 'anual' ? 'mês (anual)' : 'mês'}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setContactModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-gray-400 text-sm">
                Para assinar, entre em contato connosco diretamente ou envie uma solicitação que nossa equipe responderá brevemente.
              </p>

              {/* Direct contact buttons */}
              <div className="grid grid-cols-2 gap-3">
                <a href={`https://wa.me/${WA_NUMBER}?text=${buildWAMessage(contactModal.plan)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
                  <Phone size={15} /> WhatsApp
                </a>
                <a href={`mailto:${SUPPORT_EMAIL}?subject=${buildEmailSubject(contactModal.plan)}&body=${buildEmailBody(contactModal.plan)}`}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
                  <Mail size={15} /> E-mail
                </a>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-gray-600 text-xs">ou envie uma solicitação</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              {/* Optional form */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">WhatsApp (opcional)</label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      placeholder="+244 9XX XXX XXX"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-8 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Mensagem (opcional)</label>
                  <textarea
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    rows={2}
                    placeholder="Ex: Prefiro pagar via transferência bancária..."
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-600 resize-none"
                  />
                </div>
              </div>

              <button
                onClick={submitRequest}
                disabled={sending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {sending
                  ? <><RefreshCw size={13} className="animate-spin" /> Enviando...</>
                  : <><Send size={13} /> Enviar Solicitação</>
                }
              </button>

              <p className="text-center text-gray-600 text-xs">
                A conta {user?.email} receberá a confirmação após aprovação.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
