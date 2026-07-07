Centro de Custos — Migrações e Deploy

Migrações adicionadas:
- 20260707_create_cost_center.sql -> cria `goal_items`, `goal_item_quotes`, `exchange_rates`.
- 20260707_add_recommended_and_alerts.sql -> adiciona flag `recommended` em `goal_item_quotes` e cria `alerts`.

Instalação / Deploy
1. Execute as migrações no seu projeto Supabase (psql ou `supabase db push`/`supabase migrate` conforme seu fluxo).
2. Crie a função serverless `fetch-exchange-rates` (arquivo em `supabase/functions/fetch-exchange-rates/index.ts`) e agende-a via cron (ex: Cloud Scheduler) para rodar periodicamente.
3. Garanta que a role usada tenha permissões de escrita em `exchange_rates`.

Endpoints e funções importantes
- `src/lib/exchangeRates.ts` — helpers para listar, upsert e buscar externamente.
- `src/lib/costEngine.ts` — motor de cálculo (conversões, cálculo de cotações, simulação).
- UI:
  - `src/pages/Cofres.tsx` — gerenciamento de itens de meta, cotações, simulador e alertas.
  - `src/pages/admin/ExchangeRates.tsx` — UI administrativa para taxas de câmbio.

Notas
- `goal_item_quotes` armazena cotações flexíveis em JSON para frete/outros; o motor converte para a moeda base (KZ) antes de agregar.
- As mudanças são retro-compatíveis: `imagem_url` e outros campos não foram alterados.

Testes e validação
- Recomenda-se rodar o simulador localmente apontando `VITE_SUPABASE_*` para um ambiente de teste e confirmar que `alerts` e `exchange_rates` são populados corretamente.

Próximos passos sugeridos
- Implementar testes automatizados do `costEngine` usando `vitest`.
- Melhorar painel financeiro com gráficos e export CSV.
