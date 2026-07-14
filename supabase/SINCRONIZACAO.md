# Sincronização Supabase — Guia de Correção (Auditoria 2026-07-14)

**Situação encontrada:** o projeto Supabase ativo (`supabase-bole-leaf`, ref `xzbuewmkejhpmfxzwwhb`, criado a 2026-07-12 via integração Vercel) está **vazio** — 0 tabelas e 0 Edge Functions — enquanto este repositório contém **35 migrações SQL** e **9 Edge Functions**. Sem isto aplicado, o site corre em "preview-safe mode" (ver `src/lib/supabase.ts`): autenticação, cofres, transações, marketplace, chat e notificações não funcionam nem aparecem com dados reais.

## 1. Aplicar as migrações (tabelas, RLS, buckets, triggers)

```bash
npm i -g supabase
supabase login
supabase link --project-ref xzbuewmkejhpmfxzwwhb
supabase db push
```

Alternativa sem CLI: abrir o **SQL Editor** no painel Supabase e executar os ficheiros de `supabase/migrations/` por ordem cronológica (do mais antigo para o mais recente).

## 2. Deploy das Edge Functions

```bash
supabase functions deploy admin-api
supabase functions deploy check-rate-alerts
supabase functions deploy fetch-exchange-rates
supabase functions deploy ik-ai
supabase functions deploy ik-trading-ai
supabase functions deploy market-sync
supabase functions deploy send-notification
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
```

Definir os segredos necessários antes de testar:

```bash
supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... OPENAI_API_KEY=...
```

## 3. Variáveis de ambiente no Vercel

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://xzbuewmkejhpmfxzwwhb.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key em *Project Settings → API* |

Fazer **redeploy** no Vercel depois de gravar (as variáveis `VITE_*` entram no build).

## 4. Limpeza pendente no repositório

- `supabase/migrations/public.deals` — não é um ficheiro `.sql` válido; é ignorado pelo `db push`. Comparar com `20260707_create_deals.sql` e apagar ou renomear para `<timestamp>_nome.sql`.

## 5. Verificação final

1. Painel Supabase → **Table Editor**: devem aparecer `cofres`, `transacoes`, `negocios`, `patrimonio`, tabelas de chat, marketplace, notificações e admin.
2. Painel Supabase → **Edge Functions**: as 9 funções listadas acima.
3. No site: criar conta, criar um cofre e uma transação — os valores devem persistir e refletir-se no dashboard após refresh.
