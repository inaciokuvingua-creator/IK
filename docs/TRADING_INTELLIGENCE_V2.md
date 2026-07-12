# IK AI Trading Intelligence V2

## Objetivo

A plataforma organiza dados de mercado, mede incerteza e apresenta cenários condicionais. Nunca afirma prever o futuro com certeza nem promete lucros.

## Dados reais

Configure os segredos no Supabase, sem os expor no frontend:

- `TWELVE_DATA_API_KEY`
- `ALPHA_VANTAGE_API_KEY`
- `MASSIVE_API_KEY`
- `FINNHUB_API_KEY`

O backend deve normalizar OHLCV para `market_candles`, identificar fornecedor, atraso e horário em UTC, aplicar cache e nunca substituir falhas por preços inventados.

## Cenários

Cada execução deve guardar em `trading_prediction_runs`:

- snapshot completo das entradas;
- versão do modelo;
- horizonte;
- cenários otimista, neutro e pessimista;
- probabilidades que totalizam 1;
- faixa, confiança, explicação, riscos e condições de invalidação;
- qualidade e atualidade dos dados;
- motivo de abstenção, quando aplicável.

Após o horizonte, grave o resultado em `trading_prediction_outcomes`. Não altere a previsão original.

## Regras obrigatórias da IA

- Usar linguagem probabilística e condicional.
- Separar fatos, inferências e incertezas.
- Não inventar notícias, preços, eventos ou indicadores.
- Reduzir confiança com dados incompletos, antigos ou contraditórios.
- Abster-se quando não houver evidência suficiente.
- Nunca usar expressões como "lucro garantido", "compre agora" ou "o preço vai subir".

## Entrega

A migration deve ser aplicada ao projeto Supabase antes da publicação. As APIs externas precisam de chaves e licenças compatíveis com o uso e a redistribuição pretendidos.
