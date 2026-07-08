import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseUrl = rawSupabaseUrl?.trim() ?? '';
const supabaseAnonKey = rawSupabaseAnonKey?.trim() ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Keep the app renderable in preview environments where .env is not set.
const fallbackSupabaseUrl = 'https://preview-placeholder.supabase.co';
const fallbackSupabaseAnonKey = 'preview-placeholder-anon-key';

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[IK] Supabase env vars are missing. Running in preview-safe mode until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.'
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : fallbackSupabaseUrl,
  isSupabaseConfigured ? supabaseAnonKey : fallbackSupabaseAnonKey
);

export type Cofre = {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  saldo: number;
  cor: string;
  icone: string;
  meta: number | null;
  created_at: string;
};

export type Negocio = {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  receita_mensal: number;
  despesa_mensal: number;
  ativo: boolean;
  created_at: string;
};

export type PatrimonioItem = {
  id: string; user_id: string; nome: string; categoria: string;
  valor_aquisicao: number; valor_atual: number;
  data_aquisicao: string | null; descricao: string | null; created_at: string;
  localizacao: string | null; imagem_url: string | null; status: string;
  // Imóvel / Aluguel
  imovel_tipo: string | null; imovel_area_m2: number | null; imovel_quartos: number | null;
  imovel_arrendado: boolean; renda_mensal: number | null; despesa_mensal: number | null;
  inquilino_nome: string | null; contrato_inicio: string | null; contrato_fim: string | null;
  // Veículo
  veiculo_tipo: string | null; veiculo_marca: string | null; veiculo_modelo: string | null;
  veiculo_ano: number | null; veiculo_matricula: string | null; veiculo_km: number | null;
  veiculo_combustivel: string | null; veiculo_gera_renda: boolean; veiculo_renda_diaria: number | null;
  // Estúdio
  studio_tipo: string | null; studio_capacidade: number | null; studio_equipamentos: string | null;
  studio_disponivel: boolean; studio_preco_hora: number | null;
};

export type Transacao = {
  id: string;
  user_id: string;
  cofre_id: string | null;
  negocio_id: string | null;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  categoria: string;
  data_transacao: string;
  created_at: string;
};

export type GoalItem = {
  id: string;
  cofre_id: string | null;
  nome: string;
  categoria: string | null;
  descricao: string | null;
  quantidade: number;
  preco_unitario: number;
  moeda: string;
  metadata?: any;
  created_at: string;
  updated_at?: string;
};

export type GoalItemQuote = {
  id: string;
  item_id: string;
  fornecedor?: string | null;
  preco_unitario: number;
  moeda: string;
  frete?: any;
  seguro?: number | null;
  seguro_moeda?: string | null;
  iva_percent?: number | null;
  taxas_alfandega?: any;
  outras_despesas?: any;
  total_cached?: number | null;
  created_at: string;
  updated_at?: string;
  recommended?: boolean | null;
};

export type ExchangeRate = {
  id: number;
  base_currency: string;
  currency: string;
  rate: number;
  fetched_at: string;
};

export type Alert = {
  id: string;
  user_id?: string | null;
  cofre_id?: string | null;
  tipo: string;
  titulo: string;
  corpo?: string | null;
  lida?: boolean;
  created_at?: string;
};

export type NotificationPreferences = {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  on_transaction: boolean;
  on_cofre: boolean;
  on_negocio: boolean;
  on_patrimonio: boolean;
  on_meta_reached: boolean;
  on_marketplace_purchase: boolean;
  on_marketplace_message: boolean;
  on_marketplace_payment: boolean;
  on_marketplace_download: boolean;
  on_marketplace_review: boolean;
  daily_summary: boolean;
  created_at: string;
  updated_at: string;
};

export type NotificationLog = {
  id: string;
  user_id: string;
  tipo: 'push' | 'email' | 'in_app';
  titulo: string;
  corpo: string;
  lida: boolean;
  created_at: string;
};

export type Deal = {
  id: string;
  from_id: string | null;
  to_id: string | null;
  title: string | null;
  description: string | null;
  amount: number | null;
  currency: string | null;
  status: 'proposed' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  metadata?: any;
  created_at: string;
  updated_at?: string;
};

// VAPID public key — safe to embed in client
export const VAPID_PUBLIC_KEY = 'QSx5wDY7pYa_6lUk938nJ8LM8y_qh_O4lrzph2lfaauyre85qBNJklOE-FZV9zvqmDr2bJqYREOVKGjVVzswWw';
