/*
# Financial Management App Schema

## Overview
Creates the full schema for a personal/business financial management app in Portuguese.

## Tables

### cofres (Safes/Wallets)
Represents financial accounts/safes where money is stored.
- id: uuid primary key
- user_id: owner reference
- nome: safe name
- descricao: optional description
- saldo: current balance
- cor: display color hex
- icone: icon identifier
- created_at

### negocios (Businesses)
Represents businesses or income/expense sources.
- id: uuid primary key
- user_id: owner reference
- nome: business name
- descricao: description
- categoria: category
- receita_mensal: monthly revenue estimate
- despesa_mensal: monthly expense estimate
- ativo: active status
- created_at

### patrimonio (Assets/Wealth)
Represents tangible or intangible assets.
- id: uuid primary key
- user_id: owner reference
- nome: asset name
- categoria: category (imovel, veiculo, investimento, outros)
- valor_aquisicao: acquisition value
- valor_atual: current value
- data_aquisicao: acquisition date
- descricao: optional description
- created_at

### transacoes (Transactions)
Financial transactions tied to cofres.
- id: uuid primary key
- user_id: owner reference
- cofire_id: which safe
- negocio_id: optional business link
- tipo: entrada | saida
- valor: amount
- descricao: description
- categoria: category
- data_transacao: transaction date
- created_at

## Security
- RLS enabled on all tables
- Owner-scoped CRUD policies for authenticated users
- DEFAULT auth.uid() on all user_id columns
*/

-- COFRES
CREATE TABLE IF NOT EXISTS cofres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  saldo numeric(15,2) NOT NULL DEFAULT 0,
  cor text NOT NULL DEFAULT '#3B82F6',
  icone text NOT NULL DEFAULT 'vault',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cofres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cofres" ON cofres;
CREATE POLICY "select_own_cofres" ON cofres FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_cofres" ON cofres;
CREATE POLICY "insert_own_cofres" ON cofres FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_cofres" ON cofres;
CREATE POLICY "update_own_cofres" ON cofres FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_cofres" ON cofres;
CREATE POLICY "delete_own_cofres" ON cofres FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- NEGOCIOS
CREATE TABLE IF NOT EXISTS negocios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  categoria text NOT NULL DEFAULT 'outros',
  receita_mensal numeric(15,2) NOT NULL DEFAULT 0,
  despesa_mensal numeric(15,2) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_negocios" ON negocios;
CREATE POLICY "select_own_negocios" ON negocios FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_negocios" ON negocios;
CREATE POLICY "insert_own_negocios" ON negocios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_negocios" ON negocios;
CREATE POLICY "update_own_negocios" ON negocios FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_negocios" ON negocios;
CREATE POLICY "delete_own_negocios" ON negocios FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PATRIMONIO
CREATE TABLE IF NOT EXISTS patrimonio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'outros',
  valor_aquisicao numeric(15,2) NOT NULL DEFAULT 0,
  valor_atual numeric(15,2) NOT NULL DEFAULT 0,
  data_aquisicao date,
  descricao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patrimonio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_patrimonio" ON patrimonio;
CREATE POLICY "select_own_patrimonio" ON patrimonio FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_patrimonio" ON patrimonio;
CREATE POLICY "insert_own_patrimonio" ON patrimonio FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_patrimonio" ON patrimonio;
CREATE POLICY "update_own_patrimonio" ON patrimonio FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_patrimonio" ON patrimonio;
CREATE POLICY "delete_own_patrimonio" ON patrimonio FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- TRANSACOES
CREATE TABLE IF NOT EXISTS transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cofre_id uuid REFERENCES cofres(id) ON DELETE SET NULL,
  negocio_id uuid REFERENCES negocios(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor numeric(15,2) NOT NULL,
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'outros',
  data_transacao date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transacoes" ON transacoes;
CREATE POLICY "select_own_transacoes" ON transacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_transacoes" ON transacoes;
CREATE POLICY "insert_own_transacoes" ON transacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_transacoes" ON transacoes;
CREATE POLICY "update_own_transacoes" ON transacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_transacoes" ON transacoes;
CREATE POLICY "delete_own_transacoes" ON transacoes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_transacoes_user_id ON transacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_cofre_id ON transacoes(cofre_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data_transacao);
CREATE INDEX IF NOT EXISTS idx_cofres_user_id ON cofres(user_id);
CREATE INDEX IF NOT EXISTS idx_negocios_user_id ON negocios(user_id);
CREATE INDEX IF NOT EXISTS idx_patrimonio_user_id ON patrimonio(user_id);
