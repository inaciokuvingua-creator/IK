# Assistente Evolucao - Recomendacoes do Primeiro Comando

Este documento consolida as recomendacoes do pedido original para evoluir o IK Finance AI como um copiloto financeiro e empresarial avancado, com aprendizado continuo seguro.

## Escopo (regra principal)

- Evoluir somente o Assistente IK Finance.
- Nao alterar Trading, Marketplace, Chat geral, Wallet e outras areas fora do necessario para o assistente.
- Reutilizar o que ja existe antes de criar novas estruturas.
- Nao quebrar funcionalidades existentes.

## 1) Auditoria obrigatoria antes de implementar

### O que ja existe no projeto

- Componente do assistente: `src/components/AIAssistant.tsx`
- Contexto e envio da IA: `src/context/AIContext.tsx`
- Motor principal (Edge Function): `supabase/functions/ik-ai/index.ts`
- Conversas e logs atuais:
  - `ai_conversations`
  - `ai_usage_log`
  - migracao base: `supabase/migrations/20260622022230_add_ai_system.sql`

### O que precisa ser auditado sempre

- Fluxo atual de pergunta -> resposta.
- Prompts de sistema.
- Tabelas de historico/conversa.
- RLS e policies relacionadas a IA.
- Dados financeiros que o assistente ja recebe.
- Possivel estrutura existente de conhecimento.

## 2) Arquitetura recomendada

Fluxo alvo:

1. Pergunta do utilizador.
2. Deteccao de intencao.
3. Busca em base de conhecimento.
4. Leitura de contexto/dados reais do utilizador (com RLS).
5. Raciocinio e resposta estruturada.
6. Coleta de feedback.
7. Fila de aprendizado.
8. Revisao e melhoria da base.

## 3) Base de conhecimento propria (estruturada e versionada)

### Tabela principal recomendada

`ik_ai_knowledge`

Campos-chave sugeridos:

- id
- category
- subcategory
- topic
- title
- content
- summary
- keywords
- examples
- formulas
- difficulty
- language
- country
- source
- source_type
- reference
- version
- status
- confidence
- created_at
- updated_at

### Regras de qualidade

- Conteudo com versionamento (v1, v2, v3...).
- Status claro (draft, active, archived).
- Confianca baseada em criterios objetivos (fonte, revisao, feedback, atualidade).
- Nao gravar automaticamente respostas do modelo como verdade oficial.

## 4) Feedback e aprendizado continuo seguro

### Tabelas recomendadas

1. `ik_ai_feedback`
- rating
- feedback_type
- comment
- question
- answer
- category
- conversation_id/message_id

2. `ik_ai_learning_queue`
- question
- answer
- feedback
- category
- issue_type
- suggested_improvement
- status: pending | reviewing | approved | rejected | implemented
- reviewed_by

### Regra de seguranca do aprendizado

- Feedback negativo entra em fila de revisao.
- So entra na base oficial apos validacao humana/admin.
- Proibido autoaprendizado cego.

## 5) Diferenciar conhecimento geral de dados do utilizador

- Pergunta de conceito: usar `ik_ai_knowledge`.
- Pergunta pessoal: usar dados reais do utilizador.
- Pergunta analitica: combinar conhecimento + dados + calculo.

Exemplos:

- "O que e margem liquida?" -> conhecimento.
- "Qual e minha margem liquida?" -> dados do utilizador.
- "Minha margem liquida esta boa?" -> dados + historico + conhecimento.

## 6) Realtime, perfil do utilizador e conexao mais humana

### Realtime no assistente

Acompanhar mudancas em tempo real de tabelas financeiras do utilizador autenticado, por exemplo:

- transacoes
- cofres
- negocios
- patrimonio

Usar atualizacao de contexto em tempo real para:

- ajustar analises continuamente;
- considerar historico recente;
- oferecer sugestoes e previsoes mais relevantes.

### Perfil inteligente do utilizador

Construir perfil comportamental seguro com:

- padroes de receita/despesa
- temas mais perguntados
- dificuldades recorrentes
- objetivos financeiros declarados
- historico de feedback

Objetivo: aumentar personalizacao sem violar privacidade.

### Resposta com estilo de parceiro real

O assistente deve responder com:

- Resumo
- Analise
- Calculo (quando aplicavel)
- Interpretacao
- Pontos de atencao
- Proximos passos

Sem inventar dados. Se faltar dado:

"Nao tenho dados suficientes para calcular isso."

## Categorias iniciais da base de conhecimento

- FINANCAS_PESSOAIS
- CONTABILIDADE
- GESTAO_FINANCEIRA
- EMPREENDEDORISMO
- GESTAO_EMPRESARIAL
- INDICADORES_FINANCEIROS
- MATEMATICA_FINANCEIRA
- IK_FINANCE

## Embeddings e busca semantica

Quando viavel no Supabase/PostgreSQL:

- adicionar suporte a vetores (pgvector);
- gerar embeddings para knowledge;
- buscar por similaridade semantica;
- combinar resultado semantico com filtros (idioma, categoria, status).

## Seguranca e privacidade

- Sempre usar identidade autenticada do Supabase.
- Nunca confiar em `user_id` vindo do frontend para autorizacao.
- RLS obrigatoria em tabelas de IA.
- Nao expor keys/tokens/secrets.
- Separar historico de conversa de memoria de longo prazo.

## Metricas obrigatorias para evolucao

- total_questions
- answered_questions
- unanswered_questions
- positive_feedback
- negative_feedback
- knowledge_hits
- knowledge_misses
- tool_calls
- tool_failures
- average_response_time
- top_perguntas
- top_assuntos
- top_perguntas_sem_resposta
- top_respostas_negativas

## Painel administrativo recomendado (IK AI Knowledge Center)

Capacidades minimas:

- gerir conhecimento (CRUD)
- categorias e topicos
- feedback recebido
- learning queue
- versoes e historico de revisao
- estatisticas e lacunas de conhecimento

## Plano de execucao em 6 passos (1 a 6)

1. Auditoria tecnica completa do que ja existe (assistente, edge function, tabelas, RLS, historico).
2. Desenho final da arquitetura alvo com separacao: conhecimento, dados do utilizador, analise.
3. Criacao/evolucao de schema: `ik_ai_knowledge`, `ik_ai_feedback`, `ik_ai_learning_queue`, e estruturas de insights.
4. Integracao no motor `ik-ai`: intencao, busca conhecimento, uso de dados reais, resposta estruturada, log de metricas.
5. UX no chat: feedback util/nao util, motivo do negativo, e contexto realtime para analise continua.
6. Validacao: testes funcionais, seguranca (RLS), regressao do assistente e checklist anti-alucinacao.

## Resultado esperado

Um IK Finance AI que:

- entende perguntas;
- encontra conhecimento certo;
- consulta dados reais do utilizador;
- calcula e analisa;
- responde com qualidade;
- aprende com feedback de forma controlada;
- identifica lacunas;
- melhora continuamente com governanca e seguranca.
