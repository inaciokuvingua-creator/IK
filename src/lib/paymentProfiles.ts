export type PaymentMethodType = 'bank_account' | 'mobile_wallet' | 'crypto_wallet' | 'card_transfer' | 'external_p2p' | 'cash_agent';

export type PaymentProfile = {
  id: string;
  owner_user_id: string | null;
  store_id: string | null;
  owner_type: 'user' | 'store';
  label: string;
  method_type: PaymentMethodType;
  provider_name: string | null;
  account_name: string | null;
  account_number: string | null;
  iban: string | null;
  swift_code: string | null;
  wallet_network: string | null;
  wallet_address: string | null;
  phone_number: string | null;
  qr_code_url: string | null;
  currency_code: string | null;
  instructions: string | null;
  is_default: boolean;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethodType; label: string; helper: string }> = [
  { value: 'bank_account', label: 'Conta bancária', helper: 'Banco, IBAN, SWIFT e nome do titular.' },
  { value: 'mobile_wallet', label: 'Carteira móvel', helper: 'Número móvel, referência ou conta local.' },
  { value: 'crypto_wallet', label: 'Carteira cripto', helper: 'Rede, endereço e moeda suportada.' },
  { value: 'card_transfer', label: 'Transferência cartão-cartão', helper: 'Dados para transferência externa entre cartões.' },
  { value: 'external_p2p', label: 'Pagamento P2P externo', helper: 'Formato inspirado em Redotpay: conta externa com instruções livres.' },
  { value: 'cash_agent', label: 'Agente / dinheiro físico', helper: 'Coleta presencial, agente ou ponto local.' },
];

export function paymentMethodLabel(type: PaymentMethodType) {
  return PAYMENT_METHOD_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

export function formatPaymentProfileSummary(profile: Partial<PaymentProfile>) {
  const parts = [
    profile.provider_name,
    profile.account_name,
    profile.account_number,
    profile.phone_number,
    profile.wallet_network,
    profile.wallet_address,
    profile.currency_code,
  ].filter(Boolean);
  return parts.join(' · ');
}

export function buildPaymentInstructions(profiles: PaymentProfile[]) {
  if (profiles.length === 0) return 'Sem métodos de pagamento configurados.';
  return profiles.map((profile, index) => {
    const lines = [
      `${index + 1}. ${profile.label} (${paymentMethodLabel(profile.method_type)})`,
      profile.provider_name ? `Provedor: ${profile.provider_name}` : null,
      profile.account_name ? `Titular: ${profile.account_name}` : null,
      profile.account_number ? `Conta/Número: ${profile.account_number}` : null,
      profile.iban ? `IBAN: ${profile.iban}` : null,
      profile.swift_code ? `SWIFT: ${profile.swift_code}` : null,
      profile.phone_number ? `Telefone/Wallet: ${profile.phone_number}` : null,
      profile.wallet_network ? `Rede: ${profile.wallet_network}` : null,
      profile.wallet_address ? `Endereço: ${profile.wallet_address}` : null,
      profile.currency_code ? `Moeda: ${profile.currency_code}` : null,
      profile.instructions ? `Instruções: ${profile.instructions}` : null,
    ].filter(Boolean);
    return lines.join('\n');
  }).join('\n\n');
}