import { useState, useRef } from 'react';
import {
  User, Shield, CheckCircle, Star, Globe, Phone,
  Camera, Save, AlertCircle, Crown, Zap, Building2, Rocket,
  Award, Clock, Instagram, Facebook, Youtube, Linkedin,
  X, ExternalLink, Upload, Trash2,
} from 'lucide-react';
import { useProfile, getTrialDaysLeft, isTrialExpired, type SocialLinks } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const PLAN_INFO = {
  free:       { label: 'Gratuito',   color: 'text-gray-400',    bg: 'bg-gray-800/40',      border: 'border-gray-700',   icon: Star,      desc: '3 meses de acesso completo' },
  premium:    { label: 'Premium',    color: 'text-amber-400',   bg: 'bg-amber-950/40',     border: 'border-amber-800',  icon: Crown,     desc: 'Recursos avançados sem limites' },
  business:   { label: 'Business',   color: 'text-blue-400',    bg: 'bg-blue-950/40',      border: 'border-blue-800',   icon: Building2, desc: 'Para equipas e empresas' },
  enterprise: { label: 'Enterprise', color: 'text-purple-400',  bg: 'bg-purple-950/40',    border: 'border-purple-800', icon: Rocket,    desc: 'Grandes organizações' },
};

const ROLE_LABELS: Record<string, string> = {
  user: 'Utilizador', moderator: 'Moderador', admin_ops: 'Admin Operacional', super_admin: 'Super Admin',
};

const COUNTRIES = ['AO','BR','PT','US','GB','FR','DE','ZA','CN','MZ','CV','ST','GW','GQ'];

type SocialKey = keyof SocialLinks;

const SOCIAL_META: { key: SocialKey; label: string; icon: React.ElementType; color: string; placeholder: string; prefix: string }[] = [
  { key: 'instagram', label: 'Instagram',  icon: Instagram, color: 'text-pink-400',   placeholder: 'seuusuario',      prefix: 'https://instagram.com/' },
  { key: 'facebook',  label: 'Facebook',   icon: Facebook,  color: 'text-blue-400',   placeholder: 'seuperfil',       prefix: 'https://facebook.com/' },
  { key: 'tiktok',    label: 'TikTok',     icon: User,      color: 'text-gray-300',   placeholder: '@seuusuario',     prefix: 'https://tiktok.com/@' },
  { key: 'youtube',   label: 'YouTube',    icon: Youtube,   color: 'text-red-400',    placeholder: '@seucanal',       prefix: 'https://youtube.com/' },
  { key: 'linkedin',  label: 'LinkedIn',   icon: Linkedin,  color: 'text-blue-500',   placeholder: 'seuperfil',       prefix: 'https://linkedin.com/in/' },
  { key: 'website',   label: 'Website',    icon: Globe,     color: 'text-emerald-400', placeholder: 'https://...',    prefix: '' },
];

function buildSocialUrl(key: SocialKey, value: string): string {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  const meta = SOCIAL_META.find(s => s.key === key);
  if (!meta || !meta.prefix) return value;
  const handle = value.replace(/^[@/]/, '');
  return meta.prefix + handle;
}

export default function Perfil() {
  const { user } = useAuth();
  const { profile, updateProfile, loading } = useProfile();
  const [form, setForm] = useState<Record<string, string>>({});
  const [socialForm, setSocialForm] = useState<SocialLinks>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [verifType, setVerifType] = useState('');
  const [verifLoading, setVerifLoading] = useState(false);
  const [showVerifModal, setShowVerifModal] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 3500); };

  const startEdit = () => {
    if (!profile) return;
    setForm({ nome: profile.nome, bio: profile.bio ?? '', phone: profile.phone ?? '', country: profile.country });
    setSocialForm({ ...profile.social_links });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({
        nome: form.nome,
        bio: form.bio || null,
        phone: form.phone || null,
        country: form.country,
        social_links: socialForm,
      });
      setEditing(false);
      setAvatarPreview(null);
      showToast(true, 'Perfil atualizado com sucesso');
    } catch { showToast(false, 'Erro ao salvar'); }
    setSaving(false);
  };

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast(false, 'Imagem muito grande. Máximo 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      // Bust cache with timestamp
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      await updateProfile({ avatar_url: urlWithCache });
      showToast(true, 'Foto de perfil atualizada!');
    } catch (e) { showToast(false, (e as Error).message); setAvatarPreview(null); }
    setAvatarUploading(false);
  };

  const removeAvatar = async () => {
    if (!user || !profile?.avatar_url) return;
    setAvatarUploading(true);
    try {
      await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`, `${user.id}/avatar.webp`]);
      await updateProfile({ avatar_url: null });
      setAvatarPreview(null);
      showToast(true, 'Foto removida');
    } catch (e) { showToast(false, (e as Error).message); }
    setAvatarUploading(false);
  };

  // ── Verification ───────────────────────────────────────────────────────────
  const requestVerification = async () => {
    if (!verifType) return;
    setVerifLoading(true);
    try {
      const { error } = await supabase.from('verifications').insert({ tipo: verifType });
      if (error) throw error;
      setShowVerifModal(false);
      showToast(true, 'Pedido enviado! Análise em até 48h.');
    } catch (e) { showToast(false, (e as Error).message); }
    setVerifLoading(false);
  };

  if (loading || !profile) {
    return (
      <div className="space-y-4 max-w-2xl animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-900 rounded-2xl border border-gray-800" />)}
      </div>
    );
  }

  const plan = PLAN_INFO[profile.plan];
  const PlanIcon = plan.icon;
  const daysLeft = getTrialDaysLeft(profile);
  const trialExpired = isTrialExpired(profile);
  const avatarSrc = avatarPreview ?? profile.avatar_url;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
        <p className="text-gray-400 text-sm mt-0.5">Gerencie suas informações pessoais e conta</p>
      </div>

      {toast && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Trial / expiry banner */}
      {profile.plan === 'free' && profile.trial_active && !trialExpired && daysLeft <= 14 && (
        <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-700/50 rounded-xl p-4">
          <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-300 font-semibold text-sm">Período de teste a terminar</p>
            <p className="text-amber-300/70 text-xs mt-0.5">
              Restam <strong>{daysLeft} dia{daysLeft !== 1 ? 's' : ''}</strong> do seu teste gratuito. Faça upgrade para continuar com todos os recursos.
            </p>
          </div>
          <Zap size={14} className="text-amber-400 shrink-0 mt-0.5" />
        </div>
      )}

      {profile.plan === 'free' && trialExpired && (
        <div className="flex items-start gap-3 bg-red-950/40 border border-red-700/50 rounded-xl p-4">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-300 font-semibold text-sm">Período de teste expirado</p>
            <p className="text-red-300/70 text-xs mt-0.5">O seu teste gratuito terminou. Faça upgrade para continuar a usar todos os recursos da plataforma.</p>
          </div>
        </div>
      )}

      {/* Profile header card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-emerald-900/60 to-teal-900/40" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl border-4 border-gray-900 overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-2xl">{profile.nome?.[0]?.toUpperCase() ?? 'U'}</span>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {profile.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                  <CheckCircle size={12} className="text-white" />
                </div>
              )}
              {/* Hover overlay */}
              <div
                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center gap-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={14} className="text-white" />
                <span className="text-white text-[9px] font-semibold">Alterar</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
            </div>

            {/* Avatar actions + Edit */}
            <div className="flex items-center gap-2">
              {profile.avatar_url && (
                <button onClick={removeAvatar} disabled={avatarUploading}
                  className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
                  title="Remover foto">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
                title="Upload foto">
                <Upload size={12} /> Foto
              </button>
              <button onClick={editing ? save : startEdit} disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${editing ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600'}`}>
                {editing ? <><Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}</> : <><Camera size={14} /> Editar</>}
              </button>
            </div>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Bio</label>
                <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={2}
                  placeholder="Fala sobre você..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+244..."
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">País</label>
                  <select value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Social links editing */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-semibold uppercase tracking-wider">Redes Sociais</label>
                <div className="space-y-2">
                  {SOCIAL_META.map(({ key, label, icon: Icon, color, placeholder }) => (
                    <div key={key} className="flex items-center gap-2.5">
                      <Icon size={15} className={`${color} shrink-0`} />
                      <input
                        value={socialForm[key] ?? ''}
                        onChange={e => setSocialForm({ ...socialForm, [key]: e.target.value })}
                        placeholder={key === 'website' ? 'https://seusite.com' : placeholder}
                        className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-600"
                      />
                      {socialForm[key] && (
                        <button onClick={() => setSocialForm({ ...socialForm, [key]: '' })} className="text-gray-600 hover:text-gray-400 transition-colors">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Cancelar</button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-bold text-white">{profile.nome}</h2>
                {profile.verified && (
                  <span className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle size={11} /> Verificado
                  </span>
                )}
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">{ROLE_LABELS[profile.role] ?? profile.role}</span>
              </div>
              {profile.bio && <p className="text-gray-400 text-sm mb-2">{profile.bio}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                <span className="flex items-center gap-1"><Globe size={12} />{profile.country}</span>
                {profile.phone && <span className="flex items-center gap-1"><Phone size={12} />{profile.phone}</span>}
                <span className="flex items-center gap-1"><Clock size={12} />Desde {new Date(profile.created_at).toLocaleDateString('pt-AO', { month: 'short', year: 'numeric' })}</span>
              </div>
              <p className="text-gray-600 text-xs mt-1">{user?.email}</p>

              {/* Social links display */}
              {Object.keys(profile.social_links).some(k => !!profile.social_links[k as SocialKey]) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {SOCIAL_META.filter(s => !!profile.social_links[s.key]).map(({ key, label, icon: Icon, color }) => {
                    const value = profile.social_links[key]!;
                    const url = buildSocialUrl(key, value);
                    return (
                      <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl transition-colors group"
                        title={label}>
                        <Icon size={13} className={color} />
                        <span className="text-gray-400 group-hover:text-white text-xs transition-colors">{label}</span>
                        <ExternalLink size={10} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Plan card */}
      <div className={`border rounded-2xl p-5 ${plan.bg} ${plan.border}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center">
              <PlanIcon size={18} className={plan.color} />
            </div>
            <div>
              <p className="text-white font-semibold">Plano {plan.label}</p>
              <p className={`text-xs ${plan.color} mt-0.5`}>{plan.desc}</p>
            </div>
          </div>
          {profile.plan_expires_at && (
            <div className="text-right">
              <p className="text-gray-500 text-xs">Expira em</p>
              <p className="text-gray-300 text-sm font-medium">{new Date(profile.plan_expires_at).toLocaleDateString('pt-AO')}</p>
            </div>
          )}
        </div>

        {/* Trial progress */}
        {profile.plan === 'free' && profile.trial_active && profile.trial_started_at && profile.trial_ends_at && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">Início do teste</span>
              <span className={trialExpired ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {trialExpired ? 'Expirado' : `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restantes`}
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              {(() => {
                const start = new Date(profile.trial_started_at).getTime();
                const end = new Date(profile.trial_ends_at).getTime();
                const now = Date.now();
                const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
                return <div className={`h-full rounded-full transition-all ${trialExpired ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />;
              })()}
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>{new Date(profile.trial_started_at).toLocaleDateString('pt-AO')}</span>
              <span>{new Date(profile.trial_ends_at).toLocaleDateString('pt-AO')}</span>
            </div>
            {!trialExpired && (
              <p className="text-gray-500 text-xs mt-3">Está a usar a versão de teste completa da IK Finance.</p>
            )}
            {trialExpired && (
              <p className="text-red-400/70 text-xs mt-2">O teste terminou. Selecione um plano para continuar.</p>
            )}
          </div>
        )}

        {(profile.plan !== 'free' || trialExpired) && (
          <div className="mt-4 pt-4 border-t border-white/10">
            {profile.plan === 'free' ? (
              <>
                <p className="text-gray-400 text-xs mb-2">Faça upgrade para desbloquear todos os recursos</p>
                <a href="#planos" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-lg transition-colors">
                  <Zap size={12} /> Ver planos
                </a>
              </>
            ) : (
              <p className="text-gray-500 text-xs">Plano activo até {profile.plan_expires_at ? new Date(profile.plan_expires_at).toLocaleDateString('pt-AO') : '—'}</p>
            )}
          </div>
        )}
      </div>

      {/* Verification */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award size={16} className="text-blue-400" />
          <h3 className="font-semibold text-white text-sm">Verificação de Conta</h3>
        </div>

        {profile.verified ? (
          <div className="flex items-center gap-3 bg-blue-950/40 border border-blue-800/50 rounded-xl p-4">
            <CheckCircle size={20} className="text-blue-400 shrink-0" />
            <div>
              <p className="text-white font-medium text-sm">Conta verificada</p>
              <p className="text-blue-300 text-xs mt-0.5">Tipo: {profile.verification_type ?? '-'} · Selo visível em todo o ecossistema IK Finance</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Obtenha o selo de verificação e transmita mais credibilidade.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['user', 'creator', 'store', 'company'] as const).map((tipo) => {
                const labels = { user: 'Pessoal', creator: 'Criador', store: 'Loja', company: 'Empresa' };
                const icons = { user: User, creator: Star, store: Globe, company: Building2 };
                const Icon = icons[tipo];
                return (
                  <button key={tipo} onClick={() => { setVerifType(tipo); setShowVerifModal(true); }}
                    className="flex flex-col items-center gap-2 p-3 bg-gray-800/60 hover:bg-gray-800 border border-gray-700 hover:border-blue-700 rounded-xl transition-colors group">
                    <Icon size={16} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                    <span className="text-gray-400 group-hover:text-white text-xs font-medium transition-colors">{labels[tipo]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Verification modal */}
      {showVerifModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowVerifModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-2">Solicitar Verificação</h3>
            <p className="text-gray-400 text-sm mb-4">
              Tipo: <span className="text-white font-medium capitalize">{verifType}</span><br />
              Nossa equipa analisará o pedido em até 48 horas.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowVerifModal(false)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={requestVerification} disabled={verifLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {verifLoading ? 'Enviando...' : 'Solicitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
