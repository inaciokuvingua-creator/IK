# Guia Completo de Configuração do Supabase - IK Finance

Este documento contém **todos os requisitos, esquemas, buckets de armazenamento, Edge Functions, políticas RLS, variáveis de ambiente e ativações de Realtime** necessários para que a plataforma **IK Finance** funcione a 100% no Supabase.

---

## 1. Configurações de Autenticação (Auth)

no painel do Supabase (**Authentication -> Settings**):

* **Site URL:** `https://seu-dominio.com` (ou a URL de Produção)
* **Redirect URLs adicionais:**
  * `http://localhost:3000/*`
  * `https://*.run.app/*`
* **Provedores de Login Ativos:**
  1. **Email / Password:** Ativado (com confirmação de e-mail opcional de acordo com a sua preferência).
  2. **Google OAuth (Opcional):** Ativar com *Client ID* e *Client Secret* da Google Cloud Console.

---

## 2. Tabelas da Base de Dados (Database Schemas)

Execute os ficheiros SQL de migração localizados na pasta `supabase/migrations/` (ou pelo Supabase CLI via `supabase db push`). As tabelas cruciais do ecossistema dividem-se em 6 módulos:

### 2.1. Núcleo Financeiro
* `user_profiles` – Perfis de utilizadores (idioma, avatar, estatutos, trial).
* `transacoes` – Entradas, saídas e transferências categorizadas.
* `cofres` – Poupanças inteligentes, metas e itens de cotação.
* `patrimonio_itens` – Imóveis, veículos, investimentos e ativos líquidos.
* `negocios` – Micro/médias empresas, receitas e despesas operacionais.
* `centros_custo` – Alocação de custos por departamento ou centro.

### 2.2. Marketplace & Trade
* `stores` – Lojas virtuais personalizáveis.
* `products` – Produtos físicos/digitais com catálogo e preços em AOA.
* `store_follows` – Lojas seguidas por utilizadores.
* `deals` & `deal_bids` – Propostas e trocas diretas.
* `trading_assets` & `trading_positions` – Ativos de trade, histórico e simulações.

### 2.3. Comunidade, Chat & Social
* `chat_rooms` & `chat_members` – Salas de conversa privadas e em grupo.
* `chat_messages` – Mensagens em tempo real (texto, imagens, vídeos, documentos).
* `posts` & `comments` – Feed da comunidade, fórum e interações.
* `social_relations` – Seguidores e conexões.

### 2.4. Painel de Administração & Empresa Interna
* `admin_users` – Gestores com privilégios.
* `admin_roles` – Perfis e permissões (`super_admin`, `admin`, `suporte`).
* `admin_logs` – Auditoria e registos de ações administrativas.
* `company_info`, `company_departments`, `company_projects`, `company_documents` – Estrutura corporativa interna da IK Finance.
* `plan_requests` – Gestão de solicitações manuais dos planos Pro, Business e Enterprise.

### 2.5. IA, Notificações & Câmbio
* `ai_conversations` & `ai_messages` – Histórico de conversas com a IK AI.
* `notifications` – Sistema central de notificações e alertas.
* `exchange_rates_history` – Histórico e cotações de moedas (AOA, USD, EUR, etc.).

---

## 3. Buckets de Armazenamento (Supabase Storage)

Vá a **Storage -> New Bucket** no painel do Supabase e crie os seguintes buckets com acesso **Público** (Public):

| Nome do Bucket | Acesso Público | Descrição / Uso |
| :--- | :---: | :--- |
| `avatars` | **Público** | Fotos de perfil dos utilizadores |
| `chat-media` | **Público** | Imagens, áudios e vídeos enviados no Chat |
| `marketplace-media` | **Público** | Fotos de produtos, banners de lojas e banners de empresas |
| `product-files` | **Privado / Público** | Ficheiros digitais de produtos vendidos |
| `documents` | **Público** | Documentos internos corporativos |

### Políticas de Armazenamento (Storage RLS Policies):
* **Leitura:** Permitida a qualquer utilizador (`SELECT` público).
* **Inserção/Atualização:** Permitida a utilizadores autenticados (`auth.uid() IS NOT NULL`).

---

## 4. Habilitação de Tempo Real (Realtime)

No painel do Supabase (**Database -> Replication / Realtime**), ative a replicação de **Realtime** para as seguintes tabelas:

1. `chat_messages` (Para mensagens instantâneas no chat)
2. `notifications` (Para alertas em tempo real no topo da página)
3. `transacoes` (Para atualização instantânea do saldo)
4. `posts` & `comments` (Para o feed colaborativo da comunidade)
5. `exchange_rates_history` (Para cotações em tempo real)

---

## 5. Supabase Edge Functions (Servidores sem Servidor)

Implante as Edge Functions localizadas em `supabase/functions/` utilizando a CLI do Supabase:
`supabase functions deploy <nome-da-function>`

1. **`ik-ai`** – Motor de Inteligência Artificial Gemini para análise financeira.
2. **`ik-trading-ai`** – Análise técnica de mercado e simuladores de trading.
3. **`admin-api`** – API segura para o Painel Administrativo.
4. **`fetch-exchange-rates`** – Atualização periódica e automática das taxas de câmbio (AOA, USD, EUR).
5. **`check-rate-alerts`** – Verificação de alertas de variação cambial solicitados pelos utilizadores.
6. **`market-sync`** – Sincronização automática dos dados de mercado.
7. **`send-notification`** – Disparo de notificações Push / Email.
8. **`stripe-checkout`** & **`stripe-webhook`** – Processamento de pagamentos para os planos de subscrição.

---

## 6. Variáveis de Ambiente Necessárias (Secrets)

Defina as seguintes variáveis na plataforma (ou em `.env` e no Supabase Secrets `supabase secrets set VAR=VAL`):

```env
# Chaves Públicas do Supabase (Client & App)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui

# Chaves de Serviço do Supabase (Apenas Servidor/Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Inteligência Artificial
GEMINI_API_KEY=sua-chave-gemini-api

# Pagamentos Stripe (Opcional se usar pagamentos manuais/transferência)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 7. Instruções de Migração Rápida (Passo a Passo)

1. **Criar o Projeto no Supabase:** Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
2. **Executar as Migrações:** Vá ao **SQL Editor** do Supabase, copie o conteúdo acumulado de `supabase/migrations/` e execute o script.
3. **Criar Buckets:** Crie os 5 buckets listados na Secção 3.
4. **Ativar Realtime:** Ative a replicação de Realtime para `chat_messages` e `notifications`.
5. **Implantar Edge Functions:** Execute `supabase functions deploy` para conectar os recursos de IA e API de administração.
6. **Configurar Variáveis:** Insira as suas chaves nas variáveis de ambiente do projeto.

---
*Documentação gerada oficialmente para o ecossistema IK Finance.*
