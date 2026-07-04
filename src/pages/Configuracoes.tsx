import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Bell, BellOff, Mail, Smartphone, Check, X, Trash2,
  ShieldCheck, Clock, TrendingUp, Briefcase, Building2,
  PiggyBank, Target, AlertTriangle, ChevronRight, Info, Sparkles, Lock, Languages
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useAI } from '../context/AIContext';
import { formatDate } from '../lib/format';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Configuracoes() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    pushSupported, pushPermission, pushSubscribed,
    prefs, notifications, unreadCount,
    requestPushPermission, unsubscribePush,
    updatePrefs, markAllRead, clearLog,
  } = useNotifications();

  const { privacy, updatePrivacy } = useAI();
  const [tab, setTab] = useState<'notificacoes' | 'historico' | 'conta' | 'ia' | 'idioma'>('notificacoes');
  const [requesting, setRequesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handlePushToggle = async () => {
    if (pushSubscribed) {
      await unsubscribePush();
      await updatePrefs({ push_enabled: false });
      setResult({ ok: true, msg: t('configuracoes.push.desativado') });
    } else {
      setRequesting(true);
      const ok = await requestPushPermission();
      if (ok) {
        await updatePrefs({ push_enabled: true });
        setResult({ ok: true, msg: t('configuracoes.push.ativadoOk') });
      } else {
        setResult({ ok: false, msg: t('configuracoes.push.erroPerm') });
      }
      setRequesting(false);
    }
    setTimeout(() => setResult(null), 3500);
  };

  const toggle = async (field: keyof typeof prefs) => {
    if (!prefs) return;
    await updatePrefs({ [field]: !prefs[field as keyof typeof prefs] });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('configuracoes.title')}</h1>
        <p className="text-gray-400 text-sm mt-0.5">Preferências do app e notificações</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 flex-wrap">
        {([
          ['notificacoes', t('configuracoes.tabs.notificacoes'), Bell],
          ['historico', t('configuracoes.tabs.historico', { n: unreadCount > 0 ? unreadCount : '' }).replace(' ()', ''), Clock],
          ['conta', t('configuracoes.tabs.conta'), ShieldCheck],
          ['ia', t('configuracoes.tabs.ai'), Sparkles],
          ['idioma', t('configuracoes.tabs.idioma'), Languages],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Feedback toast */}
      {result && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${result.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {result.ok ? <Check size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
          <p className="text-sm">{result.msg}</p>
        </div>
      )}

      {/* ── NOTIFICAÇÕES ───────────────────────────────────────────────────── */}
      {tab === 'notificacoes' && (
        <div className="space-y-4">

          {/* Push section */}
          <Section title={t('configuracoes.push.title')} icon={Smartphone} subtitle={t('configuracoes.push.subtitle')}>
            {!pushSupported ? (
              <InfoBanner icon={Info} text={t('configuracoes.push.semSuporte')} color="amber" />
            ) : pushPermission === 'denied' ? (
              <InfoBanner icon={BellOff} text={t('configuracoes.push.negado')} color="red" />
            ) : (
              <div className="space-y-3">
                <ToggleRow
                  label={pushSubscribed ? t('configuracoes.push.ativo') : t('configuracoes.push.ativar')}
                  description={pushSubscribed ? t('configuracoes.push.ativoDesc') : t('configuracoes.push.ativarDesc')}
                  active={pushSubscribed}
                  loading={requesting}
                  onChange={handlePushToggle}
                  accent
                />
                {pushSubscribed && (
                  <div className="ml-1 pl-4 border-l-2 border-gray-800 space-y-2 pt-1">
                    <ToggleRow label={t('configuracoes.push.transacoes')} description={t('configuracoes.push.transacoesDesc')} icon={TrendingUp} active={prefs?.on_transaction ?? true} onChange={() => toggle('on_transaction')} />
                    <ToggleRow label={t('configuracoes.push.cofres')} description={t('configuracoes.push.cofresDesc')} icon={PiggyBank} active={prefs?.on_cofre ?? true} onChange={() => toggle('on_cofre')} />
                    <ToggleRow label={t('configuracoes.push.negocios')} description={t('configuracoes.push.negociosDesc')} icon={Briefcase} active={prefs?.on_negocio ?? true} onChange={() => toggle('on_negocio')} />
                    <ToggleRow label={t('configuracoes.push.patrimonio')} description={t('configuracoes.push.patrimonioDesc')} icon={Building2} active={prefs?.on_patrimonio ?? true} onChange={() => toggle('on_patrimonio')} />
                    <ToggleRow label={t('configuracoes.push.meta')} description={t('configuracoes.push.metaDesc')} icon={Target} active={prefs?.on_meta_reached ?? true} onChange={() => toggle('on_meta_reached')} />
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Email section */}
          <Section title={t('configuracoes.email.title')} icon={Mail} subtitle={`Alertas enviados para ${user?.email ?? 'seu e-mail'}`}>
            <div className="space-y-3">
              <ToggleRow
                label={t('configuracoes.email.toggle')}
                description={t('configuracoes.email.toggleDesc')}
                active={prefs?.email_enabled ?? true}
                onChange={() => toggle('email_enabled')}
                accent
              />
              {prefs?.email_enabled && (
                <div className="ml-1 pl-4 border-l-2 border-gray-800 space-y-2 pt-1">
                  <ToggleRow label={t('configuracoes.email.resumoDiario')} description={t('configuracoes.email.resumoDiarioDesc')} icon={Clock} active={prefs?.daily_summary ?? false} onChange={() => toggle('daily_summary')} />
                  <ToggleRow label={t('configuracoes.email.movimentos')} description={t('configuracoes.email.movimentosDesc')} icon={TrendingUp} active={prefs?.on_transaction ?? true} onChange={() => toggle('on_transaction')} />
                  <ToggleRow label={t('configuracoes.email.alertasCofre')} description={t('configuracoes.email.alertaCofreDesc')} icon={Target} active={prefs?.on_meta_reached ?? true} onChange={() => toggle('on_meta_reached')} />
                </div>
              )}
            </div>
          </Section>

          {/* How it works */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Como funciona</p>
            <div className="space-y-2.5">
              {[
                ['Push', 'Notificações instantâneas no celular/browser quando algo muda na sua conta. Funciona em background, mesmo sem o app aberto.'],
                ['E-mail', 'Alertas enviados para o seu e-mail cadastrado. Ideal para resumos e histórico fora do app.'],
                ['In-app', 'Notificações visíveis dentro do app, no histórico abaixo. Sempre ativas e armazenadas por 30 dias.'],
              ].map(([tl, d]) => (
                <div key={tl} className="flex gap-3">
                  <div className="w-14 shrink-0 text-xs font-semibold text-emerald-400 pt-0.5">{tl}</div>
                  <p className="text-gray-400 text-xs leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTÓRICO ──────────────────────────────────────────────────────── */}
      {tab === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">{t('configuracoes.historico.notificacoes', { n: notifications.length })}</p>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-900/50 hover:border-emerald-800 px-3 py-1.5 rounded-lg transition-colors">
                  <Check size={12} /> {t('configuracoes.historico.marcarLidas')}
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearLog} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 border border-gray-800 hover:border-red-900/50 px-3 py-1.5 rounded-lg transition-colors">
                  <Trash2 size={12} /> {t('configuracoes.historico.limpar')}
                </button>
              )}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell size={28} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">{t('configuracoes.historico.nenhumaTitulo')}</p>
                <p className="text-gray-600 text-xs mt-1">{t('configuracoes.historico.nenhumaDesc')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/60">
                {notifications.map((n) => (
                  <div key={n.id} className={`flex items-start gap-3 px-5 py-4 transition-colors ${!n.lida ? 'bg-emerald-950/10' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.lida ? 'bg-emerald-400' : 'bg-gray-700'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${!n.lida ? 'text-white' : 'text-gray-300'}`}>{n.titulo}</p>
                        <span className="text-xs text-gray-600 shrink-0">{new Date(n.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{n.corpo}</p>
                      <p className="text-gray-700 text-xs mt-1">{formatDate(n.created_at.split('T')[0])}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONTA ──────────────────────────────────────────────────────────── */}
      {tab === 'conta' && (
        <div className="space-y-4">
          <Section title={t('configuracoes.conta.title')} icon={ShieldCheck} subtitle={t('configuracoes.conta.subtitle')}>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-lg">
                  {user?.email?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{user?.email}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{t('configuracoes.conta.membroDesde', { date: user?.created_at ? formatDate(user.created_at.split('T')[0]) : '-' })}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-xl space-y-2">
                <Row label={t('configuracoes.conta.sessao')} value={t('configuracoes.conta.sessaoDesc')} ok />
                <Row label={t('configuracoes.conta.dados')} value={t('configuracoes.conta.dadosDesc')} ok />
                <Row label={t('configuracoes.conta.acesso')} value={t('configuracoes.conta.acessoDesc')} ok />
              </div>
            </div>
          </Section>

          <Section title={t('configuracoes.conta.acessoUniversal')} icon={ChevronRight} subtitle={t('configuracoes.conta.acessoUniversalDesc')}>
            <div className="space-y-2.5">
              {[
                ['Web', 'Acesse pelo navegador em qualquer computador ou tablet. Seus dados ficam na nuvem.'],
                ['PWA (instalado)', 'Instale o app no celular ou desktop. Funciona offline com dados em cache.'],
                ['Android / iOS', 'Use o guia em MOBILE_BUILD.md para compilar a versão nativa para as lojas.'],
              ].map(([tl, d]) => (
                <div key={tl} className="flex gap-3 p-3 bg-gray-800/30 rounded-xl">
                  <div className="w-20 shrink-0 text-xs font-semibold text-blue-400 pt-0.5">{tl}</div>
                  <p className="text-gray-400 text-xs leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {tab === 'ia' && (
        <div className="space-y-4">
          <Section title={t('configuracoes.ai.title')} icon={Sparkles} subtitle={t('configuracoes.ai.subtitle')}>
            <div className="space-y-4">
              <div className={`flex items-center gap-4 p-4 rounded-xl border ${privacy.enabled ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-gray-800/40 border-gray-700'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${privacy.enabled ? 'bg-emerald-500/20' : 'bg-gray-700'}`}>
                  <Sparkles size={18} className={privacy.enabled ? 'text-emerald-400' : 'text-gray-500'} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{t('configuracoes.ai.title')}</p>
                  <p className={`text-xs mt-0.5 font-medium ${privacy.enabled ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {privacy.enabled ? t('configuracoes.ai.ativo') : t('configuracoes.ai.desativado')}
                  </p>
                </div>
                <button
                  onClick={() => updatePrivacy({ enabled: !privacy.enabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${privacy.enabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${privacy.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={11} /> {t('configuracoes.ai.permissoes')}
                </p>
                {[
                  {
                    key: 'allowFinancialData' as const,
                    label: t('configuracoes.ai.dadosFinanceiros'),
                    desc: t('configuracoes.ai.dadosFinanceirosDesc'),
                    icon: TrendingUp,
                  },
                  {
                    key: 'allowBusinessData' as const,
                    label: t('configuracoes.ai.dadosEmpresariais'),
                    desc: t('configuracoes.ai.dadosEmpresariaisDesc'),
                    icon: Briefcase,
                  },
                ].map(({ key, label, desc, icon: Icon }) => (
                  <div key={key} className="flex items-start gap-4 p-4 bg-gray-800/40 rounded-xl">
                    <Icon size={16} className="text-gray-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{label}</p>
                      <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                    <button
                      onClick={() => updatePrivacy({ [key]: !privacy[key] })}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${privacy[key] ? 'bg-emerald-500' : 'bg-gray-600'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${privacy[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 bg-blue-950/30 border border-blue-800/30 rounded-xl p-3.5">
                <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-blue-300/80 text-xs leading-relaxed">
                  {t('configuracoes.ai.privacidade')}
                </p>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ── IDIOMA ─────────────────────────────────────────────────────────── */}
      {tab === 'idioma' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-white font-semibold">{t('configuracoes.idioma.title')}</h3>
            <p className="text-gray-500 text-sm mt-1">{t('configuracoes.idioma.subtitle')}</p>
          </div>
          <LanguageSwitcher variant="settings" />
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, icon: Icon, subtitle, children }: { title: string; icon: React.ElementType; subtitle: string; children: ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
          <Icon size={17} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{title}</p>
          <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, icon: Icon, active, loading = false, onChange, accent = false }: { label: string; description: string; icon?: React.ElementType; active: boolean; loading?: boolean; onChange: () => void; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && <Icon size={14} className="text-gray-600 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={loading}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 disabled:opacity-50 ${active ? (accent ? 'bg-emerald-500' : 'bg-emerald-600') : 'bg-gray-700'}`}
      >
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function InfoBanner({ icon: Icon, text, color }: { icon: React.ElementType; text: string; color: 'amber' | 'red' }) {
  const colors = color === 'amber' ? 'bg-amber-950/40 border-amber-900/50 text-amber-300' : 'bg-red-950/40 border-red-900/50 text-red-300';
  return (
    <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border ${colors}`}>
      <Icon size={15} className="shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed">{text}</p>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className={`text-xs font-medium flex items-center gap-1 ${ok ? 'text-emerald-400' : 'text-gray-400'}`}>
        {ok && <Check size={11} />} {value}
      </span>
    </div>
  );
}
