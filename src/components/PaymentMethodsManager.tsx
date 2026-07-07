import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, CreditCard, Plus, Save, Trash2, Wallet } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { PAYMENT_METHOD_OPTIONS, paymentMethodLabel, type PaymentMethodType, type PaymentProfile } from '../lib/paymentProfiles';

type Props = {
  ownerType: 'user' | 'store';
  ownerUserId?: string;
  storeId?: string;
  title: string;
  subtitle: string;
};

type FormState = {
  label: string;
  method_type: PaymentMethodType;
  provider_name: string;
  account_name: string;
  account_number: string;
  iban: string;
  swift_code: string;
  wallet_network: string;
  wallet_address: string;
  phone_number: string;
  qr_code_url: string;
  currency_code: string;
  instructions: string;
  is_default: boolean;
  is_public: boolean;
  is_active: boolean;
};

const INITIAL_FORM: FormState = {
  label: '',
  method_type: 'external_p2p',
  provider_name: '',
  account_name: '',
  account_number: '',
  iban: '',
  swift_code: '',
  wallet_network: '',
  wallet_address: '',
  phone_number: '',
  qr_code_url: '',
  currency_code: 'USD',
  instructions: '',
  is_default: false,
  is_public: true,
  is_active: true,
};

export default function PaymentMethodsManager({ ownerType, ownerUserId, storeId, title, subtitle }: Props) {
  const [profiles, setProfiles] = useState<PaymentProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const scopeFilter = useMemo(() => ownerType === 'user' ? { owner_user_id: ownerUserId } : { store_id: storeId }, [ownerType, ownerUserId, storeId]);

  const load = async () => {
    const query = supabase.from('payment_profiles').select('*').eq('owner_type', ownerType).order('is_default', { ascending: false }).order('created_at', { ascending: false });
    if (ownerType === 'user' && ownerUserId) query.eq('owner_user_id', ownerUserId);
    if (ownerType === 'store' && storeId) query.eq('store_id', storeId);
    const { data } = await query;
    setProfiles((data ?? []) as PaymentProfile[]);
  };

  useEffect(() => {
    if ((ownerType === 'user' && ownerUserId) || (ownerType === 'store' && storeId)) load();
  }, [ownerType, ownerUserId, storeId]);

  const startCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const startEdit = (profile: PaymentProfile) => {
    setEditingId(profile.id);
    setForm({
      label: profile.label,
      method_type: profile.method_type,
      provider_name: profile.provider_name ?? '',
      account_name: profile.account_name ?? '',
      account_number: profile.account_number ?? '',
      iban: profile.iban ?? '',
      swift_code: profile.swift_code ?? '',
      wallet_network: profile.wallet_network ?? '',
      wallet_address: profile.wallet_address ?? '',
      phone_number: profile.phone_number ?? '',
      qr_code_url: profile.qr_code_url ?? '',
      currency_code: profile.currency_code ?? 'USD',
      instructions: profile.instructions ?? '',
      is_default: profile.is_default,
      is_public: profile.is_public,
      is_active: profile.is_active,
    });
  };

  const save = async () => {
    if (!form.label.trim()) return;
    setSaving(true);
    if (form.is_default) {
      const clearQuery = supabase.from('payment_profiles').update({ is_default: false }).eq('owner_type', ownerType);
      if (ownerType === 'user' && ownerUserId) clearQuery.eq('owner_user_id', ownerUserId);
      if (ownerType === 'store' && storeId) clearQuery.eq('store_id', storeId);
      await clearQuery;
    }
    const payload = {
      ...scopeFilter,
      owner_type: ownerType,
      ...form,
      label: form.label.trim(),
      provider_name: form.provider_name || null,
      account_name: form.account_name || null,
      account_number: form.account_number || null,
      iban: form.iban || null,
      swift_code: form.swift_code || null,
      wallet_network: form.wallet_network || null,
      wallet_address: form.wallet_address || null,
      phone_number: form.phone_number || null,
      qr_code_url: form.qr_code_url || null,
      instructions: form.instructions || null,
      updated_at: new Date().toISOString(),
    };
    if (editingId) await supabase.from('payment_profiles').update(payload).eq('id', editingId);
    else await supabase.from('payment_profiles').insert(payload);
    setSaving(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
    await load();
  };

  const remove = async (id: string) => {
    await supabase.from('payment_profiles').delete().eq('id', id);
    await load();
  };

  return (
    <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold">{title}</h3>
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        </div>
        <button onClick={startCreate} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold">
          <Plus size={14} /> Novo método
        </button>
      </div>

      <div className="space-y-3">
        {profiles.length === 0 && <p className="text-gray-500 text-sm">Nenhum método configurado ainda.</p>}
        {profiles.map((profile) => (
          <div key={profile.id} className="rounded-2xl bg-gray-950/40 border border-gray-800 p-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-medium text-sm">{profile.label}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">{paymentMethodLabel(profile.method_type)}</span>
                {profile.is_default && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 inline-flex items-center gap-1"><CheckCircle size={10} /> Padrão</span>}
              </div>
              <p className="text-gray-400 text-xs mt-1">{[profile.provider_name, profile.account_name, profile.account_number, profile.phone_number, profile.wallet_network, profile.currency_code].filter(Boolean).join(' · ')}</p>
              {profile.instructions && <p className="text-gray-500 text-xs mt-2 whitespace-pre-wrap">{profile.instructions}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => startEdit(profile)} className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center">
                {profile.method_type === 'bank_account' ? <CreditCard size={14} /> : <Wallet size={14} />}
              </button>
              <button onClick={() => remove(profile.id)} className="w-9 h-9 rounded-xl bg-red-950/30 hover:bg-red-950/50 text-red-300 flex items-center justify-center">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3 rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Rótulo</label>
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: RedotPay P2P USD" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Tipo</label>
          <select value={form.method_type} onChange={(e) => setForm({ ...form, method_type: e.target.value as PaymentMethodType })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500">
            {PAYMENT_METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Provedor / banco / carteira</label>
          <input value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} placeholder="RedotPay, banco, M-Pesa..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Titular</label>
          <input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="Nome do titular" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Conta / número / ID</label>
          <input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} placeholder="Número externo" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Telefone / wallet móvel</label>
          <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+244..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">IBAN</label>
          <input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">SWIFT</label>
          <input value={form.swift_code} onChange={(e) => setForm({ ...form, swift_code: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Rede</label>
          <input value={form.wallet_network} onChange={(e) => setForm({ ...form, wallet_network: e.target.value })} placeholder="TRC20, ERC20, Visa P2P..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Endereço da carteira</label>
          <input value={form.wallet_address} onChange={(e) => setForm({ ...form, wallet_address: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">QR code (URL)</label>
          <input value={form.qr_code_url} onChange={(e) => setForm({ ...form, qr_code_url: e.target.value })} placeholder="https://..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Moeda</label>
          <input value={form.currency_code} onChange={(e) => setForm({ ...form, currency_code: e.target.value.toUpperCase() })} placeholder="USD" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 block mb-1.5">Instruções</label>
          <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={3} placeholder="Informe como o comprador deve pagar, confirmar e identificar a transferência." className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none" />
        </div>
        <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-gray-300">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Método padrão</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} /> Visível no marketplace</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Ativo</label>
        </div>
        <div className="md:col-span-2">
          <button onClick={save} disabled={saving || !form.label.trim()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold disabled:opacity-50">
            <Save size={14} /> {saving ? 'Salvando...' : editingId ? 'Atualizar método' : 'Adicionar método'}
          </button>
        </div>
      </div>
    </div>
  );
}