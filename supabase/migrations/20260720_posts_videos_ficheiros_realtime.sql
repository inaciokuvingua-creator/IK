-- =============================================================
-- IK FINANCE — Posts: vídeos, ficheiros e feed em tempo real
-- =============================================================

alter table public.posts add column if not exists video_urls jsonb not null default '[]'::jsonb;
alter table public.posts add column if not exists file_urls jsonb not null default '[]'::jsonb;

-- Realtime na tabela posts (para feed live)
alter publication supabase_realtime add table public.posts;
