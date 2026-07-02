/*
# IK Finance Ecosystem Expansion

## Resumo
Adiciona as tabelas para o ecossistema expandido: perfis de usuários com papéis/planos,
empresas com membros/departamentos, convites, lojas, produtos, pedidos, pagamentos,
chat/mensagens, verificações e sistema de planos/assinaturas.

## 1. user_profiles
Perfil público estendido de cada usuário auth.
- user_id (uuid, PK, FK → auth.users)
- nome (text)
- bio (text, nullable)
- avatar_url (text, nullable)
- role (text) — 'user' | 'moderator' | 'admin_ops' | 'super_admin'
- plan (text) — 'free' | 'premium' | 'business' | 'enterprise'
- plan_expires_at (timestamptz, nullable)
- verified (bool) — verificação oficial
- verification_type (text, nullable) — 'user' | 'creator' | 'store' | 'company'
- country (text, default 'AO')
- phone (text, nullable)
- website (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

## 2. companies
Empresas criadas por usuários.
- id, owner_id, nome, cnpj/nif, setor, descricao, logo_url, website
- plan, verified, ativo, created_at

## 3. company_members
Membros de uma empresa.
- id, company_id, user_id, role ('owner'|'admin'|'manager'|'employee'), department, cargo
- status ('active'|'invited'|'suspended'), invited_by, created_at

## 4. company_invites
Convites por e-mail para entrar em empresa.
- id, company_id, email, role, token (unique), accepted, expires_at, created_at

## 5. departments
Departamentos de empresa.
- id, company_id, nome, descricao, manager_id, created_at

## 6. stores
Lojas do marketplace.
- id, owner_id, slug (unique), nome, descricao, logo_url, banner_url
- categoria, verified, ativo, rating, total_sales, plan, created_at

## 7. products
Produtos do marketplace.
- id, store_id, owner_id, nome, descricao, preco (AOA), moeda, tipo ('digital'|'physical')
- categoria, imagem_url, arquivo_url (digital), estoque (physical), ativo, destaque
- total_vendas, created_at

## 8. orders
Pedidos de compra.
- id, buyer_id, store_id, product_id, quantidade, preco_unitario, total, moeda
- status ('pending'|'paid'|'delivered'|'cancelled'|'refunded')
- payment_method, payment_ref, endereco_entrega, created_at, updated_at

## 9. plan_subscriptions
Assinaturas de planos.
- id, user_id, plan ('free'|'premium'|'business'|'enterprise'), preco, moeda
- status ('active'|'cancelled'|'expired'), starts_at, expires_at, payment_ref, created_at

## 10. messages
Sistema de mensagens privadas.
- id, from_id, to_id, conteudo, lida, created_at

## 11. message_groups
Grupos de chat.
- id, nome, criado_por, tipo ('private'|'group'|'company'), company_id (nullable), created_at

## 12. group_members
Membros de grupos.
- id, group_id, user_id, role ('admin'|'member'), created_at

## 13. group_messages
Mensagens em grupos.
- id, group_id, from_id, conteudo, lida_por (uuid[]), created_at

## 14. verifications
Pedidos de verificação.
- id, user_id, tipo ('user'|'creator'|'store'|'company'), documento_url, status
- reviewed_by, reviewed_at, notas, created_at

## 15. audit_log
Auditoria de ações de usuários comuns (não admin).
- id, user_id, acao, entidade, entidade_id, detalhes, created_at

## Segurança
- RLS em todas as tabelas
- Políticas por owner / membership
*/

-- ─── user_profiles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             text NOT NULL DEFAULT '',
  bio              text,
  avatar_url       text,
  role             text NOT NULL DEFAULT 'user' CHECK (role IN ('user','moderator','admin_ops','super_admin')),
  plan             text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','premium','business','enterprise')),
  plan_expires_at  timestamptz,
  verified         boolean NOT NULL DEFAULT false,
  verification_type text CHECK (verification_type IN ('user','creator','store','company')),
  country          text NOT NULL DEFAULT 'AO',
  phone            text,
  website          text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_profiles" ON user_profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "service_profiles" ON user_profiles;
CREATE POLICY "select_profiles" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_profiles" ON user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── companies ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  nif         text,
  setor       text NOT NULL DEFAULT 'outros',
  descricao   text,
  logo_url    text,
  website     text,
  plan        text NOT NULL DEFAULT 'free',
  verified    boolean NOT NULL DEFAULT false,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_companies" ON companies;
DROP POLICY IF EXISTS "insert_companies" ON companies;
DROP POLICY IF EXISTS "update_own_company" ON companies;
DROP POLICY IF EXISTS "delete_own_company" ON companies;
DROP POLICY IF EXISTS "service_companies" ON companies;
CREATE POLICY "select_companies" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_companies" ON companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_company" ON companies FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_own_company" ON companies FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "service_companies" ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── company_members ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'employee' CHECK (role IN ('owner','admin','manager','employee')),
  department  text,
  cargo       text,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','suspended')),
  invited_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (company_id, user_id)
);
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_members" ON company_members;
DROP POLICY IF EXISTS "insert_members" ON company_members;
DROP POLICY IF EXISTS "update_members" ON company_members;
DROP POLICY IF EXISTS "delete_members" ON company_members;
CREATE POLICY "select_members" ON company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "insert_members" ON company_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "update_members" ON company_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "delete_members" ON company_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));

-- ─── company_invites ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'employee',
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted    boolean NOT NULL DEFAULT false,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_invites" ON company_invites;
DROP POLICY IF EXISTS "insert_invites" ON company_invites;
DROP POLICY IF EXISTS "service_invites" ON company_invites;
CREATE POLICY "select_invites" ON company_invites FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "insert_invites" ON company_invites FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "service_invites" ON company_invites FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── departments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  descricao   text,
  manager_id  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_departments" ON departments;
DROP POLICY IF EXISTS "insert_departments" ON departments;
DROP POLICY IF EXISTS "update_departments" ON departments;
DROP POLICY IF EXISTS "delete_departments" ON departments;
CREATE POLICY "select_departments" ON departments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM company_members WHERE company_id = departments.company_id AND user_id = auth.uid() AND status = 'active')
      OR EXISTS (SELECT 1 FROM companies WHERE id = departments.company_id AND owner_id = auth.uid()));
CREATE POLICY "insert_departments" ON departments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "update_departments" ON departments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));
CREATE POLICY "delete_departments" ON departments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid()));

-- ─── stores ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  slug        text NOT NULL UNIQUE,
  nome        text NOT NULL,
  descricao   text,
  logo_url    text,
  banner_url  text,
  categoria   text NOT NULL DEFAULT 'geral',
  verified    boolean NOT NULL DEFAULT false,
  ativo       boolean NOT NULL DEFAULT true,
  rating      numeric(3,2) DEFAULT 0,
  total_sales integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_stores" ON stores;
DROP POLICY IF EXISTS "insert_stores" ON stores;
DROP POLICY IF EXISTS "update_own_store" ON stores;
DROP POLICY IF EXISTS "delete_own_store" ON stores;
DROP POLICY IF EXISTS "service_stores" ON stores;
CREATE POLICY "select_stores" ON stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_stores" ON stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_store" ON stores FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_own_store" ON stores FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "service_stores" ON stores FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  owner_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  descricao    text,
  preco        numeric(15,2) NOT NULL DEFAULT 0,
  moeda        text NOT NULL DEFAULT 'AOA',
  tipo         text NOT NULL DEFAULT 'digital' CHECK (tipo IN ('digital','physical')),
  categoria    text NOT NULL DEFAULT 'outros',
  imagem_url   text,
  arquivo_url  text,
  estoque      integer,
  ativo        boolean NOT NULL DEFAULT true,
  destaque     boolean NOT NULL DEFAULT false,
  total_vendas integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_products" ON products;
DROP POLICY IF EXISTS "insert_products" ON products;
DROP POLICY IF EXISTS "update_own_products" ON products;
DROP POLICY IF EXISTS "delete_own_products" ON products;
DROP POLICY IF EXISTS "service_products" ON products;
CREATE POLICY "select_products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_products" ON products FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_products" ON products FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "delete_own_products" ON products FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "service_products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id         uuid NOT NULL REFERENCES stores(id),
  product_id       uuid NOT NULL REFERENCES products(id),
  quantidade       integer NOT NULL DEFAULT 1,
  preco_unitario   numeric(15,2) NOT NULL,
  total            numeric(15,2) NOT NULL,
  moeda            text NOT NULL DEFAULT 'AOA',
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','delivered','cancelled','refunded')),
  payment_method   text,
  payment_ref      text,
  endereco_entrega jsonb,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_orders" ON orders;
DROP POLICY IF EXISTS "insert_own_orders" ON orders;
DROP POLICY IF EXISTS "update_own_orders" ON orders;
DROP POLICY IF EXISTS "service_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()));
CREATE POLICY "insert_own_orders" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "update_own_orders" ON orders FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()));
CREATE POLICY "service_orders" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── plan_subscriptions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan        text NOT NULL CHECK (plan IN ('free','premium','business','enterprise')),
  preco       numeric(10,2) NOT NULL DEFAULT 0,
  moeda       text NOT NULL DEFAULT 'AOA',
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  starts_at   timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  payment_ref text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE plan_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_subs" ON plan_subscriptions;
DROP POLICY IF EXISTS "insert_own_subs" ON plan_subscriptions;
DROP POLICY IF EXISTS "service_subs" ON plan_subscriptions;
CREATE POLICY "select_own_subs" ON plan_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_subs" ON plan_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_subs" ON plan_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  to_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conteudo   text NOT NULL,
  lida       boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_msgs" ON messages;
DROP POLICY IF EXISTS "insert_own_msgs" ON messages;
DROP POLICY IF EXISTS "update_own_msgs" ON messages;
CREATE POLICY "select_own_msgs" ON messages FOR SELECT TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());
CREATE POLICY "insert_own_msgs" ON messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_id);
CREATE POLICY "update_own_msgs" ON messages FOR UPDATE TO authenticated
  USING (to_id = auth.uid());

-- ─── verifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo         text NOT NULL CHECK (tipo IN ('user','creator','store','company')),
  documento_url text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by  uuid REFERENCES auth.users(id),
  reviewed_at  timestamptz,
  notas        text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_verif" ON verifications;
DROP POLICY IF EXISTS "insert_own_verif" ON verifications;
DROP POLICY IF EXISTS "service_verif" ON verifications;
CREATE POLICY "select_own_verif" ON verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_verif" ON verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_verif" ON verifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── Realtime on new tables ───────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
