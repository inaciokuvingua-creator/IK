import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  id: string;
  user_id: string;
  nome: string;
  categoria: string;
  valor_aquisicao: number;
  valor_atual: number;
  data_aquisicao: string | null;
  descricao: string | null;
  created_at: string;
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

// VAPID public key — safe to embed in client
export const VAPID_PUBLIC_KEY = 'QSx5wDY7pYa_6lUk938nJ8LM8y_qh_O4lrzph2lfaauyre85qBNJklOE-FZV9zvqmDr2bJqYREOVKGjVVzswWw';
