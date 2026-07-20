-- =============================================================
-- IK FINANCE — Lojas e Empresas personalizáveis, partilháveis e publicáveis
-- Executar no Supabase: Dashboard → SQL Editor → colar → Run
-- =============================================================

-- ── LOJAS ────────────────────────────────────────────────────
-- Personalização visual, temas, horários, redes sociais, visibilidade
alter table public.stores
  add column if not exists cover_url text,
  add column if not exists brand_color text default '#10b981',
  add column if not exists accent_color text default '#0ea5e9',
  add column if not exists theme_mode text default 'dark' check (theme_mode in ('dark','light','auto')),
  add column if not exists layout text default 'grid' check (layout in ('grid','list','magazine','hero')),
  add column if not exists font_family text default 'inter',
  add column if not exists slogan text,
  add column if not exists hours jsonb default '{}'::jsonb,
  add column if not exists social_links jsonb default '{}'::jsonb,
  add column if not exists is_published boolean default false,
  add column if not exists published_at timestamptz,
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists faq jsonb default '[]'::jsonb,
  add column if not exists highlights jsonb default '[]'::jsonb,
  add column if not exists custom_css text;

-- Garante que toda loja publicável tem slug único
create unique index if not exists stores_slug_unique_idx
  on public.stores(slug) where slug is not null and deleted_at is null;

-- ── EMPRESAS ────────────────────────────────────────────────
alter table public.companies
  add column if not exists cover_url text,
  add column if not exists brand_color text default '#10b981',
  add column if not exists accent_color text default '#0ea5e9',
  add column if not exists theme_mode text default 'dark' check (theme_mode in ('dark','light','auto')),
  add column if not exists slogan text,
  add column if not exists hours jsonb default '{}'::jsonb,
  add column if not exists social_links jsonb default '{}'::jsonb,
  add column if not exists slug text,
  add column if not exists is_published boolean default false,
  add column if not exists published_at timestamptz,
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists showcase jsonb default '[]'::jsonb;

create unique index if not exists companies_slug_unique_idx
  on public.companies(slug) where slug is not null;

-- ── Bucket para capas, logos e assets de marca ─────────────
insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

do $$ begin
  create policy "brand_assets_upload" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'brand-assets');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "brand_assets_read" on storage.objects
    for select to public
    using (bucket_id = 'brand-assets');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "brand_assets_update" on storage.objects
    for update to authenticated
    using (bucket_id = 'brand-assets');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "brand_assets_delete" on storage.objects
    for delete to authenticated
    using (bucket_id = 'brand-assets');
exception when duplicate_object then null; end $$;

-- ── Helper: gerar slug único para loja ─────────────────────
create or replace function public.generate_store_slug(p_name text, p_store_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_count int;
  v_i int := 0;
begin
  v_base := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  if v_base = '' then v_base := 'loja'; end if;

  v_slug := v_base;
  loop
    select count(*) into v_count from stores
     where slug = v_slug and deleted_at is null
       and (p_store_id is null or id <> p_store_id);
    if v_count = 0 then return v_slug; end if;
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  end loop;
end;
$$;

grant execute on function public.generate_store_slug(text, uuid) to authenticated;

-- ── Helper: gerar slug único para empresa ───────────────────
create or replace function public.generate_company_slug(p_name text, p_company_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_count int;
  v_i int := 0;
begin
  v_base := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  if v_base = '' then v_base := 'empresa'; end if;

  v_slug := v_base;
  loop
    select count(*) into v_count from companies
     where slug = v_slug
       and (p_company_id is null or id <> p_company_id);
    if v_count = 0 then return v_slug; end if;
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  end loop;
end;
$$;

grant execute on function public.generate_company_slug(text, uuid) to authenticated;

-- ── Publicar loja (define slug + is_published + published_at) ──
create or replace function public.publish_store(p_store_id uuid, p_owner_id uuid, p_slug text default null)
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
  if v_owner is null then return jsonb_build_object('action','not_found'); end if;
  if v_owner <> p_owner_id then return jsonb_build_object('action','not_owner'); end if;

  if p_slug is not null and btrim(p_slug) <> '' then
    v_slug := lower(regexp_replace(btrim(p_slug), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := btrim(v_slug, '-');
  else
    v_slug := public.generate_store_slug(v_nome, p_store_id);
  end if;

  update stores
     set is_published = true,
         published_at = now(),
         slug = v_slug
   where id = p_store_id;

  return jsonb_build_object('action','published','slug',v_slug);
end;
$$;

grant execute on function public.publish_store(uuid, uuid, text) to authenticated;

-- ── Despublicar loja ────────────────────────────────────────
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
  if v_owner is null then return jsonb_build_object('action','not_found'); end if;
  if v_owner <> p_owner_id then return jsonb_build_object('action','not_owner'); end if;
  update stores set is_published = false where id = p_store_id;
  return jsonb_build_object('action','unpublished');
end;
$$;

grant execute on function public.unpublish_store(uuid, uuid) to authenticated;

-- ── Publicar empresa ──────────────────────────────────────
create or replace function public.publish_company(p_company_id uuid, p_owner_id uuid, p_slug text default null)
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
  if v_owner is null then return jsonb_build_object('action','not_found'); end if;
  if v_owner <> p_owner_id then return jsonb_build_object('action','not_owner'); end if;

  if p_slug is not null and btrim(p_slug) <> '' then
    v_slug := lower(regexp_replace(btrim(p_slug), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := btrim(v_slug, '-');
  else
    v_slug := public.generate_company_slug(v_nome, p_company_id);
  end if;

  update companies
     set is_published = true,
         published_at = now(),
         slug = v_slug
   where id = p_company_id;

  return jsonb_build_object('action','published','slug',v_slug);
end;
$$;

grant execute on function public.publish_company(uuid, uuid, text) to authenticated;

-- ── Despublicar empresa ────────────────────────────────────
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
  if v_owner is null then return jsonb_build_object('action','not_found'); end if;
  if v_owner <> p_owner_id then return jsonb_build_object('action','not_owner'); end if;
  update companies set is_published = false where id = p_company_id;
  return jsonb_build_object('action','unpublished');
end;
$$;

grant execute on function public.unpublish_company(uuid, uuid) to authenticated;

-- ── Realtime para capas/publicação ─────────────────────────
alter publication supabase_realtime add table public.stores;
alter publication supabase_realtime add table public.companies;
