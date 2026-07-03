
-- Storage bucket for product images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Storage bucket for product files (private, any type, 100MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-files', 'product-files', false,
  104857600,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Storage bucket for store assets (logos, banners — public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-assets', 'store-assets', true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Storage bucket for company assets (logos — public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets', 'company-assets', true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- ── product-images RLS ──────────────────────────────────────────────────────
CREATE POLICY "product_images_select_public" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_insert_auth" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "product_images_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "product_images_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── product-files RLS ───────────────────────────────────────────────────────
CREATE POLICY "product_files_select_auth" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "product_files_insert_auth" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "product_files_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "product_files_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── store-assets RLS ────────────────────────────────────────────────────────
CREATE POLICY "store_assets_select_public" ON storage.objects FOR SELECT
  USING (bucket_id = 'store-assets');

CREATE POLICY "store_assets_insert_auth" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "store_assets_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "store_assets_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── company-assets RLS ──────────────────────────────────────────────────────
CREATE POLICY "company_assets_select_public" ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "company_assets_insert_auth" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "company_assets_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "company_assets_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Ensure products table has arquivo_url column
ALTER TABLE products ADD COLUMN IF NOT EXISTS arquivo_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS imagem_url text;

-- Ensure companies table has logo_url
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;
-- Ensure stores table has logo_url
ALTER TABLE stores ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS banner_url text;
