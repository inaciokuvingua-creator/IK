-- =============================================================
-- IK FINANCE — Lojas e Empresas: personalização e página pública
-- Executar no Supabase: Dashboard → SQL Editor → colar → Run
-- Pode ser re-executada sem erro (usa IF NOT EXISTS / OR REPLACE)
-- =============================================================

-- =========================================================
-- 1. STORES — campos de personalização
-- =========================================================

alter table public.stores add column if not exists is_published boolean not null default false;
alter table public.stores add column if not exists published_slug text;
alter table public.stores add column if not exists cover_url text;
alter table public.stores add column if not exists brand_color text not null default '#10b981';
alter table public.stores add column if not exists accent_color text not null default '#0ea5e9';
alter table public.stores add column if not exists bg_color text not null default '#0f172a';
alter table public.stores add column if not exists theme_mode text not null default 'dark';
alter table public.stores add column if not exists layout text not null default 'grid';
alter table public.stores add column if not exists font_family text not null default 'inter';
alter table public.stores add column if not exists slogan text;
alter table public.stores add column if not exists hero_title text;
alter table public.stores add column if not exists hero_subtitle text;
alter table public.stores add column if not exists gallery_urls jsonb not null default '[]'::jsonb;
alter table public.stores add column if not exists highlights text[] default '{}';
alter table public.stores add column if not exists faq jsonb not null default '[]'::jsonb;
alter table public.stores add column if not exists hours jsonb not null default '{}'::jsonb;
alter table public.stores add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.stores add column if not exists meta_title text;
alter table public.stores add column if not exists meta_description text;
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
alter table public.companies add column if not exists published_slug text;
alter table public.companies add column if not exists cover_url text;
alter table public.companies add column if not exists brand_color text not null default '#3b82f6';
alter table public.companies add column if not exists accent_color text not null default '#8b5cf6';
alter table public.companies add column if not exists bg_color text not null default '#0f172a';
alter table public.companies add column if not exists theme_mode text not null default 'dark';
alter table public.companies add column if not exists layout text not null default 'grid';
alter table public.companies add column if not exists font_family text not null default 'inter';
alter table public.companies add column if not exists slogan text;
alter table public.companies add column if not exists hero_title text;
alter table public.companies add column if not exists hero_subtitle text;
alter table public.companies add column if not exists gallery_urls jsonb not null default '[]'::jsonb;
alter table public.companies add column if not exists highlights text[] default '{}';
alter table public.companies add column if not exists showcase text[] default '{}';
alter table public.companies add column if not exists faq jsonb not null default '[]'::jsonb;
alter table public.companies add column if not exists hours jsonb not null default '{}'::jsonb;
alter table public.companies add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.companies add column if not exists meta_title text;
alter table public.companies add column if not exists meta_description text;
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
-- 4. STORAGE — bucket para galerias e capas
-- =========================================================

insert into storage.buckets (id, name, public)
values ('entity-gallery', 'entity-gallery', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

do $$ begin
  create policy "gallery_upload" on storage.objects
    for insert to authenticated
    with check (bucket_id in ('entity-gallery','brand-assets'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "gallery_read" on storage.objects
    for select to public
    using (bucket_id in ('entity-gallery','brand-assets'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "gallery_delete" on storage.objects
    for delete to authenticated
    using (bucket_id in ('entity-gallery','brand-assets') and owner = auth.uid());
exception when duplicate_object then null; end $$;

-- =========================================================
-- 5. Funções de publicação — STORES
-- =========================================================

create or replace function public.publish_store(
  p_store_id uuid,
  p_owner_id uuid,
  p_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_nome text;
  v_slug text;
begin
  select owner_id, nome into v_owner, v_nome from stores where id = p_store_id;
  if v_owner is null then
    return jsonb_build_object('action', 'not_found');
  end if;
  if v_owner <> p_owner_id then
    return jsonb_build_object('action', 'not_owner');
  end if;

  v_slug := coalesce(nullif(trim(p_slug), ''), regexp_replace(lower(unaccent(v_nome)), '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'loja-' || substr(p_store_id::text, 1, 8); end if;

  update stores
     set is_published = true,
         published_slug = v_slug,
         slug = coalesce(nullif(trim(slug), ''), v_slug)
   where id = p_store_id;

  return jsonb_build_object('action', 'published', 'slug', v_slug);
end;
$$;

grant execute on function public.publish_store(uuid, uuid, text) to authenticated;

create or replace function public.unpublish_store(p_store_id uuid, p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from stores where id = p_store_id;
  if v_owner is null then return jsonb_build_object('action', 'not_found'); end if;
  if v_owner <> p_owner_id then return jsonb_build_object('action', 'not_owner'); end if;
  update stores set is_published = false, published_slug = null where id = p_store_id;
  return jsonb_build_object('action', 'unpublished');
end;
$$;

grant execute on function public.unpublish_store(uuid, uuid) to authenticated;

-- =========================================================
-- 6. Funções de publicação — COMPANIES
-- =========================================================

create or replace function public.publish_company(
  p_company_id uuid,
  p_owner_id uuid,
  p_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_nome text;
  v_slug text;
begin
  select owner_id, nome into v_owner, v_nome from companies where id = p_company_id;
  if v_owner is null then return jsonb_build_object('action', 'not_found'); end if;
  if v_owner <> p_owner_id then return jsonb_build_object('action', 'not_owner'); end if;

  v_slug := coalesce(nullif(trim(p_slug), ''), regexp_replace(lower(unaccent(v_nome)), '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'empresa-' || substr(p_company_id::text, 1, 8); end if;

  update companies
     set is_published = true,
         published_slug = v_slug
   where id = p_company_id;

  return jsonb_build_object('action', 'published', 'slug', v_slug);
end;
$$;

grant execute on function public.publish_company(uuid, uuid, text) to authenticated;

create or replace function public.unpublish_company(p_company_id uuid, p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from companies where id = p_company_id;
  if v_owner is null then return jsonb_build_object('action', 'not_found'); end if;
  if v_owner <> p_owner_id then return jsonb_build_object('action', 'not_owner'); end if;
  update companies set is_published = false, published_slug = null where id = p_company_id;
  return jsonb_build_object('action', 'unpublished');
end;
$$;

grant execute on function public.unpublish_company(uuid, uuid) to authenticated;

-- =========================================================
-- 7. Funções de leitura pública
-- =========================================================

-- Buscar loja por slug publicado (público)
create or replace function public.get_store_by_slug(p_slug text)
returns setof public.stores
language sql
security definer
set search_path = public
as $$
  select * from stores
   where (published_slug = p_slug or slug = p_slug)
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

-- Buscar empresa por slug publicado (público)
create or replace function public.get_company_by_slug(p_slug text)
returns setof public.companies
language sql
security definer
set search_path = public
as $$
  select * from companies
   where published_slug = p_slug
     and is_published = true
     and ativo = true
   limit 1;
$$;

grant execute on function public.get_company_by_slug(text) to authenticated, anon;

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
