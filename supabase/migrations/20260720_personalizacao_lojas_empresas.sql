-- =============================================================
-- IK FINANCE — Lojas e Empresas: personalização e página pública
-- Executar no Supabase: Dashboard → SQL Editor → colar → Run
-- =============================================================

-- =========================================================
-- 1. STORES — campos de personalização
-- =========================================================

alter table public.stores add column if not exists is_published boolean not null default false;
alter table public.stores add column if not exists theme_color text not null default '#10b981';
alter table public.stores add column if not exists accent_color text not null default '#34d399';
alter table public.stores add column if not exists bg_color text not null default '#0f172a';
alter table public.stores add column if not exists layout text not null default 'modern';
alter table public.stores add column if not exists hero_title text;
alter table public.stores add column if not exists hero_subtitle text;
alter table public.stores add column if not exists gallery_urls jsonb not null default '[]'::jsonb;
alter table public.stores add column if not exists faq jsonb not null default '[]'::jsonb;
alter table public.stores add column if not exists opening_hours jsonb not null default '{}'::jsonb;
alter table public.stores add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.stores add column if not exists custom_css text;

-- RLS para leitura pública (lojas publicadas)
drop policy if exists "stores_public_read" on public.stores;
create policy "stores_public_read" on public.stores
  for select to public
  using (is_published = true and deleted_at is null);

-- =========================================================
-- 2. COMPANIES — campos de personalização
-- =========================================================

alter table public.companies add column if not exists is_published boolean not null default false;
alter table public.companies add column if not exists theme_color text not null default '#3b82f6';
alter table public.companies add column if not exists accent_color text not null default '#60a5fa';
alter table public.companies add column if not exists bg_color text not null default '#0f172a';
alter table public.companies add column if not exists layout text not null default 'modern';
alter table public.companies add column if not exists hero_title text;
alter table public.companies add column if not exists hero_subtitle text;
alter table public.companies add column if not exists gallery_urls jsonb not null default '[]'::jsonb;
alter table public.companies add column if not exists faq jsonb not null default '[]'::jsonb;
alter table public.companies add column if not exists opening_hours jsonb not null default '{}'::jsonb;
alter table public.companies add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.companies add column if not exists custom_css text;

-- RLS para leitura pública (empresas publicadas)
drop policy if exists "companies_public_read" on public.companies;
create policy "companies_public_read" on public.companies
  for select to public
  using (is_published = true and ativo = true);

-- =========================================================
-- 3. PRODUCTS — leitura pública (para a página da loja)
-- =========================================================

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select to public
  using (ativo = true and deleted_at is null);

-- =========================================================
-- 4. STORAGE — bucket para galerias (reutiliza marketplace-media)
-- =========================================================

insert into storage.buckets (id, name, public)
values ('entity-gallery', 'entity-gallery', true)
on conflict (id) do nothing;

do $$ begin
  create policy "gallery_upload" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'entity-gallery');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "gallery_read" on storage.objects
    for select to public
    using (bucket_id = 'entity-gallery');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "gallery_delete" on storage.objects
    for delete to authenticated
    using (bucket_id = 'entity-gallery' and owner = auth.uid());
exception when duplicate_object then null; end $$;

-- =========================================================
-- 5. Funções utilitárias
-- =========================================================

-- Buscar loja por slug (público)
create or replace function public.get_store_by_slug(p_slug text)
returns setof public.stores
language sql
security definer
set search_path = public
as $$
  select * from stores
   where slug = p_slug
     and is_published = true
     and deleted_at is null
   limit 1;
$$;

grant execute on function public.get_store_by_slug(text) to authenticated, anon;

-- Buscar produtos públicos de uma loja
create or replace function public.get_store_products(p_store_id uuid)
returns setof public.products
language sql
security definer
set search_path = public
as $$
  select * from products
   where store_id = p_store_id
     and ativo = true
     and deleted_at is null
   order by destaque desc, created_at desc;
$$;

grant execute on function public.get_store_products(uuid) to authenticated, anon;

-- Buscar empresa por id (público)
create or replace function public.get_company_public(p_company_id uuid)
returns setof public.companies
language sql
security definer
set search_path = public
as $$
  select * from companies
   where id = p_company_id
     and is_published = true
     and ativo = true
   limit 1;
$$;

grant execute on function public.get_company_public(uuid) to authenticated, anon;
