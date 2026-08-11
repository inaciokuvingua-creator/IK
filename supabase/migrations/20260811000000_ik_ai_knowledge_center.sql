create extension if not exists vector;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at_ik_ai()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.ik_ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  subcategory text,
  topic text not null,
  title text not null,
  content text not null,
  summary text,
  keywords text[] not null default '{}'::text[],
  examples jsonb not null default '[]'::jsonb,
  formulas text[] not null default '{}'::text[],
  difficulty text not null default 'beginner',
  language text not null default 'pt',
  country text,
  source text,
  source_type text not null default 'internal',
  reference text,
  version integer not null default 1,
  status text not null default 'active',
  confidence numeric(4,3) not null default 0.900,
  search_text text,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ik_ai_knowledge_unique_version_idx
  on public.ik_ai_knowledge (category, topic, language, version);

create index if not exists ik_ai_knowledge_status_idx
  on public.ik_ai_knowledge (status, language, category);

create index if not exists ik_ai_knowledge_search_trgm_idx
  on public.ik_ai_knowledge using gin (search_text gin_trgm_ops);

create index if not exists ik_ai_knowledge_search_tsv_idx
  on public.ik_ai_knowledge using gin (to_tsvector('simple', coalesce(search_text, '')));

drop trigger if exists set_updated_at_ik_ai_knowledge on public.ik_ai_knowledge;
create trigger set_updated_at_ik_ai_knowledge
before update on public.ik_ai_knowledge
for each row execute procedure public.set_updated_at_ik_ai();

create table if not exists public.ik_ai_feedback (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  message_id text,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null,
  feedback_type text,
  comment text,
  question text,
  answer text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ik_ai_feedback_user_idx on public.ik_ai_feedback (user_id, created_at desc);

drop trigger if exists set_updated_at_ik_ai_feedback on public.ik_ai_feedback;
create trigger set_updated_at_ik_ai_feedback
before update on public.ik_ai_feedback
for each row execute procedure public.set_updated_at_ik_ai();

create table if not exists public.ik_ai_learning_queue (
  id uuid primary key default gen_random_uuid(),
  question text,
  answer text,
  feedback text,
  category text,
  issue_type text,
  suggested_improvement text,
  status text not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ik_ai_learning_queue_status_idx on public.ik_ai_learning_queue (status, created_at desc);

drop trigger if exists set_updated_at_ik_ai_learning_queue on public.ik_ai_learning_queue;
create trigger set_updated_at_ik_ai_learning_queue
before update on public.ik_ai_learning_queue
for each row execute procedure public.set_updated_at_ik_ai();

create table if not exists public.ik_ai_user_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_snapshot jsonb not null default '{}'::jsonb,
  summary text,
  last_conversation_id uuid,
  last_realtime_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ik_ai_user_insights_user_idx on public.ik_ai_user_insights (user_id);

drop trigger if exists set_updated_at_ik_ai_user_insights on public.ik_ai_user_insights;
create trigger set_updated_at_ik_ai_user_insights
before update on public.ik_ai_user_insights
for each row execute procedure public.set_updated_at_ik_ai();

alter table public.ik_ai_knowledge enable row level security;
alter table public.ik_ai_feedback enable row level security;
alter table public.ik_ai_learning_queue enable row level security;
alter table public.ik_ai_user_insights enable row level security;

drop policy if exists ik_ai_knowledge_select_authenticated on public.ik_ai_knowledge;
drop policy if exists ik_ai_knowledge_service on public.ik_ai_knowledge;
create policy ik_ai_knowledge_select_authenticated on public.ik_ai_knowledge
  for select to authenticated using (true);
create policy ik_ai_knowledge_service on public.ik_ai_knowledge
  for all to service_role using (true) with check (true);

drop policy if exists ik_ai_feedback_select_own on public.ik_ai_feedback;
drop policy if exists ik_ai_feedback_insert_own on public.ik_ai_feedback;
drop policy if exists ik_ai_feedback_service on public.ik_ai_feedback;
create policy ik_ai_feedback_select_own on public.ik_ai_feedback
  for select to authenticated using (auth.uid() = user_id);
create policy ik_ai_feedback_insert_own on public.ik_ai_feedback
  for insert to authenticated with check (auth.uid() = user_id);
create policy ik_ai_feedback_service on public.ik_ai_feedback
  for all to service_role using (true) with check (true);

drop policy if exists ik_ai_learning_queue_service on public.ik_ai_learning_queue;
drop policy if exists ik_ai_learning_queue_insert_own on public.ik_ai_learning_queue;
create policy ik_ai_learning_queue_service on public.ik_ai_learning_queue
  for all to service_role using (true) with check (true);
create policy ik_ai_learning_queue_insert_own on public.ik_ai_learning_queue
  for insert to authenticated with check (true);

drop policy if exists ik_ai_user_insights_own on public.ik_ai_user_insights;
drop policy if exists ik_ai_user_insights_service on public.ik_ai_user_insights;
create policy ik_ai_user_insights_own on public.ik_ai_user_insights
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ik_ai_user_insights_service on public.ik_ai_user_insights
  for all to service_role using (true) with check (true);

insert into public.ik_ai_knowledge (
  category, subcategory, topic, title, content, summary, keywords, formulas, difficulty, language, country, source, source_type, reference, version, status, confidence, search_text, metadata
) values
('FINANCE', 'personal', 'budget', 'Orçamento pessoal', 'Um orçamento pessoal organiza receitas, despesas fixas, despesas variáveis e metas. A lógica é simples: controlar a entrada, planear as saídas e reservar parte da renda para prioridades e emergência.', 'Como organizar um orçamento pessoal com disciplina.', array['orçamento','receitas','despesas','poupança','reserva'], array['Receita - Despesa = Saldo'], 'beginner', 'pt', 'global', 'IK Finance', 'internal', 'base inicial de educação financeira', 1, 'active', 0.980, 'orcamento pessoal receitas despesas saldo poupanca', jsonb_build_object('area','financas pessoais')),
('FINANCE', 'personal', 'juros compostos', 'Juros compostos', 'Juros compostos são juros sobre juros. O valor cresce mais rápido ao longo do tempo porque cada período pode gerar ganhos sobre o valor acumulado.', 'Explicação prática de juros compostos.', array['juros','compostos','crescimento','investimento'], array['VF = VP * (1 + i)^n'], 'beginner', 'pt', 'global', 'IK Finance', 'internal', 'base inicial de educação financeira', 1, 'active', 0.975, 'juros compostos valor futuro valor presente crescimento', jsonb_build_object('area','financas pessoais')),
('FINANCE', 'analysis', 'margem liquida', 'Margem líquida', 'Margem líquida mede quanto sobra da receita depois de custos, despesas e impostos. É um indicador essencial para entender eficiência e lucratividade.', 'Como calcular e interpretar margem líquida.', array['margem','lucro','rentabilidade','resultado'], array['Margem líquida = Lucro líquido / Receita líquida'], 'intermediate', 'pt', 'global', 'IK Finance', 'internal', 'base inicial de indicadores', 1, 'active', 0.970, 'margem liquida lucro rentabilidade receita', jsonb_build_object('area','indicadores financeiros')),
('FINANCE', 'analysis', 'roi', 'ROI', 'ROI significa retorno sobre investimento. Mostra quanto um investimento rendeu em relação ao capital aplicado.', 'ROI com cálculo e interpretação.', array['roi','retorno','investimento','rentabilidade'], array['ROI = (Ganho - Investimento) / Investimento'], 'intermediate', 'pt', 'global', 'IK Finance', 'internal', 'base inicial de indicadores', 1, 'active', 0.970, 'roi retorno investimento rentabilidade', jsonb_build_object('area','indicadores financeiros')),
('ACCOUNTING', 'core', 'contabilidade por competencia', 'Contabilidade por competência', 'Na contabilidade por competência, receitas e despesas são reconhecidas quando ocorrem, não apenas quando o dinheiro entra ou sai.', 'Diferença entre regime de caixa e competência.', array['contabilidade','competência','caixa','receita','despesa'], array[]::text[], 'intermediate', 'pt', 'global', 'IK Finance', 'internal', 'base inicial de contabilidade', 1, 'active', 0.960, 'contabilidade por competencia caixa reconhecimento', jsonb_build_object('area','contabilidade')),
('ACCOUNTING', 'core', 'partidas dobradas', 'Partidas dobradas', 'O princípio das partidas dobradas afirma que todo débito tem um crédito correspondente. Isso mantém o equilíbrio contábil.', 'Fundamento da escrituração contábil.', array['débito','crédito','balanço','lançamento'], array[]::text[], 'beginner', 'pt', 'global', 'IK Finance', 'internal', 'base inicial de contabilidade', 1, 'active', 0.965, 'partidas dobradas debito credito lancamento', jsonb_build_object('area','contabilidade')),
('BUSINESS', 'management', 'fluxo de caixa', 'Fluxo de caixa empresarial', 'Fluxo de caixa mostra a entrada e saída de dinheiro ao longo do tempo. Ajuda a prever falta de caixa, planejar compras e sustentar crescimento.', 'Base para planeamento financeiro da empresa.', array['fluxo de caixa','caixa','previsão','liquidez'], array[]::text[], 'intermediate', 'pt', 'global', 'IK Finance', 'internal', 'base inicial de gestão financeira', 1, 'active', 0.970, 'fluxo de caixa empresarial liquidez previsao', jsonb_build_object('area','gestao financeira')),
('BUSINESS', 'analysis', 'break even', 'Ponto de equilíbrio', 'O ponto de equilíbrio é o nível de vendas em que receita total e custo total se igualam. A partir daí, o negócio começa a gerar lucro.', 'Como calcular o break-even.', array['break-even','ponto de equilíbrio','vendas','custo fixo'], array['Ponto de equilíbrio = Custos fixos / Margem de contribuição'], 'intermediate', 'pt', 'global', 'IK Finance', 'internal', 'base inicial de gestão financeira', 1, 'active', 0.965, 'break even ponto de equilibrio custo fixo margem contribuicao', jsonb_build_object('area','gestao financeira')),
('ENTREPRENEURSHIP', 'strategy', 'modelo de negocio', 'Modelo de negócio', 'O modelo de negócio descreve como a empresa cria, entrega e captura valor. Ele ajuda a validar se a ideia pode tornar-se sustentável.', 'Estrutura da proposta de valor e receita.', array['modelo de negócio','valor','receita','cliente'], array[]::text[], 'beginner', 'pt', 'global', 'IK Finance', 'internal', 'base inicial de empreendedorismo', 1, 'active', 0.955, 'modelo de negocio valor receita cliente', jsonb_build_object('area','empreendedorismo')),
('ENTREPRENEURSHIP', 'strategy', 'marketing', 'Marketing e aquisição de clientes', 'Marketing serve para atrair, converter e reter clientes. Para funcionar, precisa de proposta de valor, posicionamento e consistência na comunicação.', 'Marketing e aquisição explicados de forma prática.', array['marketing','clientes','aquisição','retenção'], array[]::text[], 'intermediate', 'pt', 'global', 'IK Finance', 'internal', 'base inicial de empreendedorismo', 1, 'active', 0.950, 'marketing aquisicao clientes retencao posicionamento', jsonb_build_object('area','empreendedorismo')),
('MANAGEMENT', 'operations', 'kpis', 'KPIs de gestão', 'KPIs são indicadores-chave de desempenho. Servem para acompanhar metas, produtividade, receita, custos e eficiência operacional.', 'Como usar KPIs em gestão empresarial.', array['kpi','indicadores','metas','desempenho'], array[]::text[], 'intermediate', 'pt', 'global', 'IK Finance', 'internal', 'base inicial de gestão empresarial', 1, 'active', 0.945, 'kpis indicadores metas desempenho produtividade', jsonb_build_object('area','gestao empresarial')),
('IK_FINANCE', 'platform', 'cofres', 'Como criar um cofre', 'Para criar um cofre, acesse Cofres, escolha nome, cor, ícone e meta opcional. Use o cofre para separar objetivos e controlar poupança.', 'Guia prático para cofres do IK Finance.', array['cofre','meta','poupança','objetivo'], array[]::text[], 'beginner', 'pt', 'global', 'IK Finance', 'internal', 'base do próprio sistema', 1, 'active', 0.990, 'como criar um cofre ik finance', jsonb_build_object('area','ik finance')),
('IK_FINANCE', 'platform', 'financeiro', 'Como registrar uma despesa', 'Para registrar uma despesa, vá em Financeiro, clique em nova transação, selecione saída, valor, categoria e data. Se necessário, associe a um cofre ou negócio.', 'Guia prático para despesas no IK Finance.', array['despesa','transação','saída','financeiro'], array[]::text[], 'beginner', 'pt', 'global', 'IK Finance', 'internal', 'base do próprio sistema', 1, 'active', 0.990, 'como registrar uma despesa ik finance', jsonb_build_object('area','ik finance')),
('IK_FINANCE', 'platform', 'relatorios', 'Como interpretar relatórios', 'Os relatórios mostram receitas, despesas, saldo, tendências e evolução do patrimônio. Eles servem para entender o desempenho e decidir melhor.', 'Guia de leitura de relatórios do IK Finance.', array['relatórios','análise','gráficos','desempenho'], array[]::text[], 'beginner', 'pt', 'global', 'IK Finance', 'internal', 'base do próprio sistema', 1, 'active', 0.990, 'como interpretar relatorios ik finance', jsonb_build_object('area','ik finance'))
on conflict do nothing;

insert into public.system_settings (chave, valor, descricao)
values
  ('ai_enabled', 'true', 'IA global ativa/inativa'),
  ('ai_name', 'IK Finance AI', 'Nome do assistente de IA'),
  ('ai_persona', 'Você é o IK Finance AI — Financial & Business Copilot. Seja inteligente, profissional, didático, analítico, objetivo, responsável, encorajador e prático. Responda em português, faça resumos, análises, cálculos, sugestões e previsões quando fizer sentido. Diferencie conhecimento geral de dados do utilizador, use dados reais quando disponíveis, não invente valores nem funcionalidades, e aprenda apenas por feedback validado.', 'Persona/instruções do assistente'),
  ('ai_model', 'gpt-4o-mini', 'Modelo de IA a usar'),
  ('ai_max_tokens', '1400', 'Máximo de tokens por resposta'),
  ('ai_daily_limit', '60', 'Mensagens por dia por usuário (plano free)'),
  ('ai_premium_limit', '700', 'Mensagens por dia (plano premium+)')
on conflict (chave) do update
set valor = excluded.valor,
    descricao = excluded.descricao,
    updated_at = now();