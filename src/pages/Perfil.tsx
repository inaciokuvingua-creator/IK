import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  User, Shield, CheckCircle, Star, Globe, Phone, Camera, Save, AlertCircle, Crown, Zap, Building2, Rocket,
  Award, Clock, Instagram, Facebook, Youtube, Linkedin, X, ExternalLink, Upload, Trash2, FileBadge,
  Smartphone, MapPin, Download, ShieldAlert,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProfile, getTrialDaysLeft, isTrialExpired, type SocialLinks } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { hashSecurityAnswer } from '../lib/accountSecurity';
import PaymentMethodsManager from '../components/PaymentMethodsManager';

const PLAN_INFO = {
  free:       { label: 'Gratuito',   color: 'text-gray-400',    bg: 'bg-gray-800/40',      border: 'border-gray-700',   icon: Star,      desc: '3 meses de acesso completo' },
  premium:    { label: 'Premium',    color: 'text-amber-400',   bg: 'bg-amber-950/40',     border: 'border-amber-800',  icon: Crown,     desc: 'Recursos avançados sem limites' },
  business:   { label: 'Business',   color: 'text-blue-400',    bg: 'bg-blue-950/40',      border: 'border-blue-800',   icon: Building2, desc: 'Para equipas e empresas' },
  enterprise: { label: 'Enterprise', color: 'text-purple-400',  bg: 'bg-purple-950/40',    border: 'border-purple-800', icon: Rocket,    desc: 'Grandes organizações' },
};

const ROLE_LABELS: Record<string, string> = {
  user: 'Utilizador', moderator: 'Moderador', admin_ops: 'Admin Operacional', super_admin: 'Super Admin',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  cliente: 'Cliente', vendedor: 'Vendedor', empresa: 'Empresa', fornecedor: 'Fornecedor', criador: 'Criador', profissional: 'Profissional', administrador: 'Administrador',
};

const COUNTRIES = ['AO', 'BR', 'PT', 'US', 'GB', 'FR', 'DE', 'ZA', 'CN', 'MZ', 'CV', 'ST', 'GW', 'GQ'];

type SocialKey = keyof SocialLinks;

type IdentityDocument = {
  id: string;
  document_type: string;
  document_number: string;
  issuer_country: string;
  issued_at: string | null;
  expires_at: string | null;
  document_url: string | null;
  verification_status: string;
};

type LoginHistoryEntry = {
  id: string;
  auth_method: string;
  device_name: string | null;
  location_label: string | null;
  timezone: string | null;
  suspicious: boolean;
  created_at: string;
};

type DeviceEntry = {
  id: string;
  device_id: string;
  device_name: string | null;
  browser: string | null;
  platform: string | null;
  last_seen_at: string;
  last_location: string | null;
  trusted: boolean;
  revoked_at: string | null;
};

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
  const meta = SOCIAL_META.find((item) => item.key === key);
  if (!meta || !meta.prefix) return value;
  const handle = value.replace(/^[@/]/, '');
  return meta.prefix + handle;
}

export default function Perfil() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, updateProfile, loading, refetch } = useProfile();
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
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documents, setDocuments] = useState<IdentityDocument[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [securityQuestions, setSecurityQuestions] = useState([{ question: '', answer: '' }, { question: '', answer: '' }]);
  const [securityQuestionCount, setSecurityQuestionCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const showToast = (ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 3500); };

  const completionHints = useMemo(() => {
    if (!profile) return [];
    const hints: string[] = [];
    if (!profile.full_name) hints.push('Nome completo');
    if (!profile.username) hints.push('Nome de utilizador');
    if (!profile.birth_date) hints.push('Data de nascimento');
    if (!profile.phone) hints.push('Telefone');
    if (!profile.city) hints.push('Cidade');
    if (!documents[0]?.document_number) hints.push('Documento de identificação');
    if (!profile.public_bio) hints.push('Biografia pública');
    if (securityQuestionCount < 2) hints.push('Perguntas de segurança');
    if (profile.account_type === 'empresa' && !profile.company_name) hints.push('Perfil empresarial');
    return hints;
  }, [documents, profile, securityQuestionCount]);

  const fetchSecurityData = useCallback(async () => {
    if (!user) return;
    const [documentsResult, historyResult, devicesResult, questionsResult] = await Promise.all([
      supabase.from('user_identity_documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_login_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
      supabase.from('user_devices').select('*').eq('user_id', user.id).order('last_seen_at', { ascending: false }),
      supabase.from('user_security_questions').select('id').eq('user_id', user.id),
    ]);
    setDocuments((documentsResult.data ?? []) as IdentityDocument[]);
    setLoginHistory((historyResult.data ?? []) as LoginHistoryEntry[]);
    setDevices((devicesResult.data ?? []) as DeviceEntry[]);
    setSecurityQuestionCount((questionsResult.data ?? []).length);
  }, [user]);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  const startEdit = () => {
    if (!profile) return;
    const firstDocument = documents[0];
    setForm({
      nome: profile.nome,
      full_name: profile.full_name ?? profile.nome,
      display_name: profile.display_name ?? '',
      username: profile.username ?? '',
      email: profile.email ?? user?.email ?? '',
      bio: profile.public_bio ?? profile.bio ?? '',
      phone: profile.phone ?? '',
      country: profile.country,
      province: profile.province ?? '',
      city: profile.city ?? '',
      address: profile.address ?? '',
      postal_code: profile.postal_code ?? '',
      birth_date: profile.birth_date ?? '',
      sex: profile.sex ?? '',
      account_type: profile.account_type,
      preferred_language: profile.preferred_language ?? profile.idioma ?? 'pt',
      profile_visibility: profile.profile_visibility,
      security_level: profile.security_level,
      company_name: profile.company_name ?? '',
      company_category: profile.company_category ?? '',
      company_description: profile.company_description ?? '',
      company_website: profile.company_website ?? '',
      website: profile.website ?? '',
      document_type: firstDocument?.document_type ?? 'bi',
      document_number: firstDocument?.document_number ?? '',
      issuer_country: firstDocument?.issuer_country ?? profile.country,
      issued_at: firstDocument?.issued_at ?? '',
      expires_at: firstDocument?.expires_at ?? '',
    });
    setSocialForm({ ...(profile.social_links ?? {}) });
    setSecurityQuestions([{ question: '', answer: '' }, { question: '', answer: '' }]);
    setEditing(true);
  };

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      const fullName = form.full_name || form.nome;
      await updateProfile({
        nome: fullName,
        full_name: fullName,
        display_name: form.display_name || fullName,
        username: form.username || null,
        email: form.email || null,
        bio: form.bio || null,
        public_bio: form.bio || null,
        phone: form.phone || null,
        country: form.country,
        province: form.province || null,
        city: form.city || null,
        address: form.address || null,
        postal_code: form.postal_code || null,
        birth_date: form.birth_date || null,
        sex: form.sex || null,
        account_type: form.account_type as typeof profile.account_type,
        preferred_language: form.preferred_language || 'pt',
        idioma: form.preferred_language || 'pt',
        profile_visibility: form.profile_visibility as typeof profile.profile_visibility,
        security_level: form.security_level as typeof profile.security_level,
        website: form.website || null,
        company_name: form.company_name || null,
        company_category: form.company_category || null,
        company_description: form.company_description || null,
        company_website: form.company_website || null,
        social_links: socialForm,
      });

      if (form.email && form.email !== user.email) {
        await supabase.auth.updateUser({ email: form.email });
      }

      const primaryDocument = documents[0];
      if (form.document_number) {
        const documentPayload = {
          user_id: user.id,
          document_type: form.document_type || 'bi',
          document_number: form.document_number,
          issuer_country: form.issuer_country || form.country,
          issued_at: form.issued_at || null,
          expires_at: form.expires_at || null,
          document_url: primaryDocument?.document_url ?? null,
          updated_at: new Date().toISOString(),
        };
        if (primaryDocument) {
          await supabase.from('user_identity_documents').update(documentPayload).eq('id', primaryDocument.id);
        } else {
          await supabase.from('user_identity_documents').insert(documentPayload);
        }
      }

      const filledQuestions = securityQuestions.filter((item) => item.question.trim() && item.answer.trim());
      if (filledQuestions.length > 0) {
        await supabase.from('user_security_questions').delete().eq('user_id', user.id);
        const prepared = await Promise.all(filledQuestions.map(async (item) => ({
          user_id: user.id,
          question: item.question.trim(),
          answer_hash: await hashSecurityAnswer(item.question, item.answer),
        })));
        await supabase.from('user_security_questions').insert(prepared);
      }

      setEditing(false);
      setAvatarPreview(null);
      await Promise.all([fetchSecurityData(), refetch()]);
      showToast(true, 'Perfil avançado atualizado com sucesso.');
    } catch (error) {
      showToast(false, (error as Error).message || t('perfil.erroSalvar'));
    }
    setSaving(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast(false, t('perfil.imagemGrande')); return; }
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
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      await updateProfile({ avatar_url: urlWithCache });
      showToast(true, t('perfil.fotoAtualizada'));
    } catch (error) {
      showToast(false, (error as Error).message);
      setAvatarPreview(null);
    }
    setAvatarUploading(false);
  };

  const uploadIdentityDocument = async (file: File) => {
    if (!user) return;
    setDocumentUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('identity-documents').upload(path, file, { upsert: true });
      if (error) throw error;
      const primaryDocument = documents[0];
      if (primaryDocument) {
        await supabase.from('user_identity_documents').update({ document_url: path, updated_at: new Date().toISOString() }).eq('id', primaryDocument.id);
      } else {
        await supabase.from('user_identity_documents').insert({
          user_id: user.id,
          document_type: form.document_type || 'bi',
          document_number: form.document_number || 'pendente',
          issuer_country: form.issuer_country || profile?.country || 'AO',
          document_url: path,
        });
      }
      await fetchSecurityData();
      showToast(true, 'Documento privado enviado com sucesso.');
    } catch (error) {
      showToast(false, (error as Error).message);
    }
    setDocumentUploading(false);
  };

  const removeAvatar = async () => {
    if (!user || !profile?.avatar_url) return;
    setAvatarUploading(true);
    try {
      await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`, `${user.id}/avatar.webp`]);
      await updateProfile({ avatar_url: null });
      setAvatarPreview(null);
      showToast(true, t('perfil.fotoRemovida'));
    } catch (error) {
      showToast(false, (error as Error).message);
    }
    setAvatarUploading(false);
  };

  const requestVerification = async () => {
    if (!verifType) return;
    setVerifLoading(true);
    try {
      const { error } = await supabase.from('verifications').insert({ tipo: verifType });
      if (error) throw error;
      setShowVerifModal(false);
      showToast(true, t('perfil.pedidoEnviado'));
    } catch (error) {
      showToast(false, (error as Error).message);
    }
    setVerifLoading(false);
  };

  const revokeDevice = async (deviceId: string) => {
    await supabase.from('user_devices').update({ revoked_at: new Date().toISOString(), trusted: false, updated_at: new Date().toISOString() }).eq('id', deviceId);
    await fetchSecurityData();
    showToast(true, 'Dispositivo removido da lista autorizada.');
  };

  const exportData = async () => {
    if (!profile) return;
    const payload = {
      exported_at: new Date().toISOString(),
      profile,
      documents,
      loginHistory,
      devices,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ik-finance-dados-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !profile) {
    return (
      <div className="space-y-4 max-w-5xl animate-pulse">
        {[1, 2, 3].map((item) => <div key={item} className="h-28 bg-gray-900 rounded-2xl border border-gray-800" />)}
      </div>
    );
  }

  const socialLinks = profile.social_links ?? {};
  const completion = Number.isFinite(profile.profile_completion) ? profile.profile_completion : 0;
  const plan = PLAN_INFO[profile.plan] ?? PLAN_INFO.free;
  const PlanIcon = plan.icon;
  const daysLeft = getTrialDaysLeft(profile);
  const trialExpired = isTrialExpired(profile);
  const avatarSrc = avatarPreview ?? profile.avatar_url;
  const primaryDocument = documents[0];

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
          <p className="text-gray-400 text-sm mt-0.5">Centro completo de identidade, privacidade, segurança e recuperação da sua conta IK Finance.</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 min-w-[240px]">
          <div className="flex justify-between text-xs text-emerald-200 mb-2"><span>Perfil preenchido</span><span>{completion}%</span></div>
          <div className="h-2 bg-black/20 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${completion}%` }} /></div>
          <p className="text-[11px] text-emerald-100/70 mt-2">{completionHints.length > 0 ? `Faltam: ${completionHints.slice(0, 3).join(', ')}` : 'Perfil completo e preparado para recuperação segura.'}</p>
        </div>
      </div>

      {toast && <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>{toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.msg}</div>}

      <div className="grid xl:grid-cols-[1.7fr_1fr] gap-5">
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-emerald-900/60 to-teal-900/40" />
            <div className="px-6 pb-6">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 -mt-10 mb-4">
                <div className="flex items-end gap-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl border-4 border-gray-900 overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      {avatarSrc ? <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-white font-bold text-3xl">{(profile.full_name ?? profile.nome)?.[0]?.toUpperCase() ?? 'U'}</span>}
                      {avatarUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
                    </div>
                    {profile.verified && <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-gray-900"><CheckCircle size={13} className="text-white" /></div>}
                    <div className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center gap-1" onClick={() => fileInputRef.current?.click()}><Camera size={14} className="text-white" /><span className="text-white text-[10px] font-semibold">Alterar</span></div>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1"><h2 className="text-xl font-bold text-white">{profile.full_name ?? profile.nome}</h2><span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">{ACCOUNT_TYPE_LABELS[profile.account_type] ?? profile.account_type}</span><span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">{ROLE_LABELS[profile.role] ?? profile.role}</span></div>
                    <p className="text-emerald-400 text-sm font-medium">@{profile.username ?? 'sem-username'}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2"><span className="flex items-center gap-1"><Globe size={12} />{profile.country}{profile.city ? ` · ${profile.city}` : ''}</span>{profile.phone && <span className="flex items-center gap-1"><Phone size={12} />{profile.phone}</span>}{profile.last_login_at && <span className="flex items-center gap-1"><Clock size={12} />Último acesso {new Date(profile.last_login_at).toLocaleString('pt-AO')}</span>}</div>
                    <p className="text-gray-400 text-sm mt-3 max-w-2xl">{profile.public_bio || profile.bio || 'Adicione uma biografia, dados públicos e contexto profissional para reforçar a sua identidade.'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {profile.avatar_url && <button onClick={removeAvatar} disabled={avatarUploading} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors" title={t('perfil.fotoRemovida')}><Trash2 size={14} /></button>}
                  <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading} className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-xl text-xs font-medium transition-colors"><Upload size={12} /> Foto</button>
                  <button onClick={editing ? save : startEdit} disabled={saving} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${editing ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600'}`}>{editing ? <><Save size={14} /> {saving ? t('perfil.salvando') : t('perfil.salvar')}</> : <><Camera size={14} /> Editar perfil</>}</button>
                </div>
              </div>

              {editing ? (
                <div className="space-y-5">
                  <div className="grid lg:grid-cols-2 gap-4">
                    <div><label className="text-xs text-gray-500 mb-1 block">Nome completo</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Nome público</label><input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">@username</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/^@/, '') })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">E-mail</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Telefone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Tipo de conta</label><select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500">{Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Data de nascimento</label><input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Sexo</label><input value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">País</label><select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500">{COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}</select></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Província / Estado</label><input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Cidade</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Código postal</label><input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div className="lg:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Morada</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div className="lg:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Biografia pública</label><textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none" /></div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-4 rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
                    <div><label className="text-xs text-gray-500 mb-1 block">Visibilidade do perfil</label><select value={form.profile_visibility} onChange={(e) => setForm({ ...form, profile_visibility: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"><option value="publico">Público</option><option value="misto">Misto</option><option value="privado">Privado</option></select></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Nível de segurança</label><select value={form.security_level} onChange={(e) => setForm({ ...form, security_level: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"><option value="standard">Standard</option><option value="elevated">Elevado</option><option value="strict">Estrito</option></select></div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-4 rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
                    <div><label className="text-xs text-gray-500 mb-1 block">Tipo de documento</label><select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"><option value="bi">Bilhete de Identidade</option><option value="passaporte">Passaporte</option><option value="carta">Carta</option><option value="nif">NIF</option><option value="outro">Outro</option></select></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Número do documento</label><input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">País emissor</label><input value={form.issuer_country} onChange={(e) => setForm({ ...form, issuer_country: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Validade</label><input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                    <div className="lg:col-span-2 flex items-center gap-3"><button type="button" onClick={() => documentInputRef.current?.click()} disabled={documentUploading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-200 hover:text-white hover:border-gray-600"><Upload size={14} /> {documentUploading ? 'Enviando...' : 'Enviar documento privado'}</button><input ref={documentInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadIdentityDocument(file); }} />{primaryDocument?.document_url && <span className="text-xs text-emerald-400">Documento armazenado em cofre privado</span>}</div>
                  </div>

                  {['empresa', 'fornecedor', 'vendedor', 'criador', 'profissional'].includes(form.account_type) && (
                    <div className="grid lg:grid-cols-2 gap-4 rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
                      <div><label className="text-xs text-gray-500 mb-1 block">Nome da empresa / marca</label><input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Categoria</label><input value={form.company_category} onChange={(e) => setForm({ ...form, company_category: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Website</label><input value={form.company_website} onChange={(e) => setForm({ ...form, company_website: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Website pessoal</label><input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" /></div>
                      <div className="lg:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Descrição da empresa / atividade</label><textarea value={form.company_description} onChange={(e) => setForm({ ...form, company_description: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none" /></div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-gray-500 mb-2 block font-semibold uppercase tracking-wider">Perguntas de segurança</label>
                    <div className="grid lg:grid-cols-2 gap-3">
                      {securityQuestions.map((item, index) => (
                        <div key={index} className="space-y-2 rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
                          <input value={item.question} onChange={(e) => setSecurityQuestions((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, question: e.target.value } : entry))} placeholder={`Pergunta ${index + 1}`} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
                          <input value={item.answer} onChange={(e) => setSecurityQuestions((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, answer: e.target.value } : entry))} placeholder="Resposta secreta" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-2 block font-semibold uppercase tracking-wider">Redes sociais</label>
                    <div className="space-y-2">
                      {SOCIAL_META.map(({ key, label, icon: Icon, color, placeholder }) => (
                        <div key={key} className="flex items-center gap-2.5">
                          <Icon size={15} className={`${color} shrink-0`} />
                          <input value={socialForm[key] ?? ''} onChange={(e) => setSocialForm({ ...socialForm, [key]: e.target.value })} placeholder={key === 'website' ? 'https://seusite.com' : placeholder} className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-600" />
                          {socialForm[key] && <button onClick={() => setSocialForm({ ...socialForm, [key]: '' })} className="text-gray-600 hover:text-gray-400 transition-colors"><X size={13} /></button>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Cancelar</button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-3">Dados públicos</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Nome</span><span className="text-white text-right">{profile.display_name ?? profile.full_name ?? profile.nome}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Usuário</span><span className="text-emerald-400 text-right">@{profile.username ?? 'sem-username'}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Bio</span><span className="text-gray-300 text-right">{profile.public_bio || 'Não definida'}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Localização</span><span className="text-gray-300 text-right">{profile.city ? `${profile.city}, ${profile.country}` : profile.country}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Perfil</span><span className="text-gray-300 text-right capitalize">{profile.profile_visibility}</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-3">Dados privados</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3"><span className="text-gray-500">E-mail</span><span className="text-white text-right">{profile.email ?? user?.email}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Telefone</span><span className="text-white text-right">{profile.phone || 'Não definido'}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Morada</span><span className="text-gray-300 text-right">{profile.address || 'Privado / não definido'}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Documento</span><span className="text-gray-300 text-right">{primaryDocument ? `${primaryDocument.document_type} · ${primaryDocument.verification_status}` : 'Não enviado'}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Idioma</span><span className="text-gray-300 text-right uppercase">{profile.preferred_language ?? profile.idioma ?? 'pt'}</span></div>
                    </div>
                  </div>

                  <div className="md:col-span-2 rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-3">Redes, loja e reputação</p>
                    <div className="flex flex-wrap gap-2">
                      {SOCIAL_META.filter((item) => !!socialLinks[item.key]).map(({ key, label, icon: Icon, color }) => {
                        const value = socialLinks[key]!;
                        const url = buildSocialUrl(key, value);
                        return <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl transition-colors group" title={label}><Icon size={13} className={color} /><span className="text-gray-400 group-hover:text-white text-xs transition-colors">{label}</span><ExternalLink size={10} className="text-gray-600 group-hover:text-gray-400 transition-colors" /></a>;
                      })}
                      {Object.keys(socialLinks).length === 0 && <span className="text-gray-500 text-sm">Adicione redes, contactos e links para fortalecer o seu perfil público.</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className={`border rounded-3xl p-5 ${plan.bg} ${plan.border}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center"><PlanIcon size={18} className={plan.color} /></div><div><p className="text-white font-semibold">Plano {plan.label}</p><p className={`text-xs ${plan.color} mt-0.5`}>{plan.desc}</p></div></div>
                {profile.plan_expires_at && <div className="text-right"><p className="text-gray-500 text-xs">{t('perfil.expiraEm')}</p><p className="text-gray-300 text-sm font-medium">{new Date(profile.plan_expires_at).toLocaleDateString('pt-AO')}</p></div>}
              </div>
              {profile.plan === 'free' && profile.trial_active && profile.trial_started_at && profile.trial_ends_at && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-xs mb-2"><span className="text-gray-400">{t('perfil.trialInicio')}</span><span className={trialExpired ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>{trialExpired ? t('perfil.trialExpiradoLabel') : t('perfil.diasRestantes', { n: `${daysLeft} dia${daysLeft !== 1 ? 's' : ''}` })}</span></div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">{(() => { const start = new Date(profile.trial_started_at).getTime(); const end = new Date(profile.trial_ends_at).getTime(); const now = Date.now(); const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)); return <div className={`h-full rounded-full transition-all ${trialExpired ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />; })()}</div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-center gap-2 mb-4"><Award size={16} className="text-blue-400" /><h3 className="font-semibold text-white text-sm">Verificação de conta</h3></div>
              {profile.verified ? (
                <div className="flex items-center gap-3 bg-blue-950/40 border border-blue-800/50 rounded-xl p-4"><CheckCircle size={20} className="text-blue-400 shrink-0" /><div><p className="text-white font-medium text-sm">{t('perfil.contaVerificada')}</p><p className="text-blue-300 text-xs mt-0.5">{t('perfil.tipoVerif', { type: profile.verification_type ?? '-' })}</p></div></div>
              ) : (
                <div className="space-y-3"><p className="text-gray-400 text-sm">{t('perfil.obterSelo')}</p><div className="grid grid-cols-2 gap-2">{(['user', 'creator', 'store', 'company'] as const).map((tipo) => { const icons = { user: User, creator: Star, store: Globe, company: Building2 }; const Icon = icons[tipo]; return <button key={tipo} onClick={() => { setVerifType(tipo); setShowVerifModal(true); }} className="flex flex-col items-center gap-2 p-3 bg-gray-800/60 hover:bg-gray-800 border border-gray-700 hover:border-blue-700 rounded-xl transition-colors group"><Icon size={16} className="text-gray-500 group-hover:text-blue-400 transition-colors" /><span className="text-gray-400 group-hover:text-white text-xs font-medium transition-colors capitalize">{tipo}</span></button>; })}</div></div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <PaymentMethodsManager ownerType="user" ownerUserId={user?.id} title="Pagamentos externos" subtitle="Configure contas bancárias, carteiras e métodos P2P externos para receber pagamentos e vendas." />

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center gap-2 mb-4"><Shield size={16} className="text-emerald-400" /><h3 className="text-white font-semibold">Centro de segurança</h3></div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-950/40 border border-gray-800 px-4 py-3"><span className="text-gray-400">2FA</span><span className={profile.two_factor_enabled ? 'text-emerald-400' : 'text-gray-500'}>{profile.two_factor_enabled ? 'Ativado' : 'Preparado para ativação'}</span></div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-950/40 border border-gray-800 px-4 py-3"><span className="text-gray-400">E-mail autenticado</span><span className={profile.email_verified ? 'text-emerald-400' : 'text-amber-400'}>{profile.email_verified ? 'Verificado' : 'Pendente / Supabase'}</span></div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-950/40 border border-gray-800 px-4 py-3"><span className="text-gray-400">SMS</span><span className={profile.sms_verified ? 'text-emerald-400' : 'text-gray-500'}>{profile.sms_verified ? 'Confirmado' : 'Não confirmado'}</span></div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-950/40 border border-gray-800 px-4 py-3"><span className="text-gray-400">Perguntas de segurança</span><span className={securityQuestionCount >= 2 ? 'text-emerald-400' : 'text-amber-400'}>{securityQuestionCount}/2 configuradas</span></div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-950/40 border border-gray-800 px-4 py-3"><span className="text-gray-400">Alertas suspeitos</span><span className={profile.suspicious_login_count > 0 ? 'text-amber-400' : 'text-emerald-400'}>{profile.suspicious_login_count}</span></div>
              <button onClick={exportData} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400"><Download size={15} /> Exportar meus dados</button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center gap-2 mb-4"><FileBadge size={16} className="text-emerald-400" /><h3 className="text-white font-semibold">Documento e recuperação</h3></div>
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl bg-gray-950/40 border border-gray-800 p-4"><p className="text-gray-500 text-xs uppercase tracking-[0.2em] mb-2">Documento principal</p><p className="text-white">{primaryDocument ? `${primaryDocument.document_type.toUpperCase()} · ${primaryDocument.document_number}` : 'Nenhum documento registado'}</p><p className="text-gray-400 text-xs mt-1">Status: {primaryDocument?.verification_status ?? 'pendente'}</p></div>
              <div className="rounded-2xl bg-gray-950/40 border border-gray-800 p-4"><p className="text-gray-500 text-xs uppercase tracking-[0.2em] mb-2">Canais de recuperação</p><div className="space-y-1 text-gray-300"><p>Email: {profile.email ?? user?.email ?? 'não definido'}</p><p>Telefone: {profile.phone || 'não definido'}</p><p>Nome de utilizador: @{profile.username ?? 'não definido'}</p></div></div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center gap-2 mb-4"><Smartphone size={16} className="text-emerald-400" /><h3 className="text-white font-semibold">Dispositivos conectados</h3></div>
            <div className="space-y-3">{devices.length === 0 && <p className="text-sm text-gray-500">Nenhum dispositivo registado ainda.</p>}{devices.map((device) => <div key={device.id} className="rounded-2xl bg-gray-950/40 border border-gray-800 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-white text-sm font-medium">{device.device_name || 'Dispositivo web'}</p><p className="text-gray-400 text-xs mt-1">{device.browser || 'Navegador'} · {device.platform || 'Web'} · {device.last_location || 'Sem localização'}</p><p className="text-gray-500 text-xs mt-1">Último acesso {new Date(device.last_seen_at).toLocaleString('pt-AO')}</p></div><button onClick={() => revokeDevice(device.id)} disabled={Boolean(device.revoked_at)} className="px-3 py-2 rounded-xl border border-red-800 text-red-300 hover:bg-red-950/30 disabled:opacity-40">{device.revoked_at ? 'Revogado' : 'Remover'}</button></div></div>)}</div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center gap-2 mb-4"><ShieldAlert size={16} className="text-emerald-400" /><h3 className="text-white font-semibold">Histórico de login</h3></div>
            <div className="space-y-3">{loginHistory.length === 0 && <p className="text-sm text-gray-500">Sem histórico recente.</p>}{loginHistory.map((entry) => <div key={entry.id} className="rounded-2xl bg-gray-950/40 border border-gray-800 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-white text-sm font-medium">{entry.device_name || 'Acesso web'} · {entry.auth_method}</p><p className="text-gray-400 text-xs mt-1 flex items-center gap-1"><MapPin size={11} /> {entry.location_label || 'Localização aproximada indisponível'} {entry.timezone ? `· ${entry.timezone}` : ''}</p></div><div className="text-right"><p className={`text-xs font-semibold ${entry.suspicious ? 'text-amber-400' : 'text-emerald-400'}`}>{entry.suspicious ? 'Suspeito' : 'Normal'}</p><p className="text-gray-500 text-xs mt-1">{new Date(entry.created_at).toLocaleString('pt-AO')}</p></div></div></div>)}</div>
          </div>
        </div>
      </div>

      {showVerifModal && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowVerifModal(false)}><div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}><h3 className="text-white font-semibold mb-2">{t('perfil.solicitarVerif')}</h3><p className="text-gray-400 text-sm mb-4">Tipo: <span className="text-white font-medium capitalize">{verifType}</span><br />{t('perfil.analisaremos')}</p><div className="flex gap-3"><button onClick={() => setShowVerifModal(false)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">{t('perfil.cancelar')}</button><button onClick={requestVerification} disabled={verifLoading} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">{verifLoading ? t('perfil.enviando') : t('perfil.solicitar')}</button></div></div></div>}
    </div>
  );
}