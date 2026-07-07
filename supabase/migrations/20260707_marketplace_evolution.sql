ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allow_download boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS restore_until timestamptz;

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS restore_until timestamptz;

UPDATE products
SET slug = COALESCE(slug, regexp_replace(lower(nome), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL;

UPDATE products
SET restore_until = COALESCE(restore_until, deleted_at + interval '30 days')
WHERE deleted_at IS NOT NULL AND restore_until IS NULL;

UPDATE stores
SET restore_until = COALESCE(restore_until, deleted_at + interval '30 days')
WHERE deleted_at IS NOT NULL AND restore_until IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug_unique ON products(slug) WHERE slug IS NOT NULL;

ALTER TABLE store_reviews
  ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seller_reply text,
  ADD COLUMN IF NOT EXISTS seller_reply_at timestamptz;

CREATE TABLE IF NOT EXISTS product_review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

ALTER TABLE product_review_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prl_select" ON product_review_likes;
DROP POLICY IF EXISTS "prl_insert" ON product_review_likes;
DROP POLICY IF EXISTS "prl_delete" ON product_review_likes;
CREATE POLICY "prl_select" ON product_review_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "prl_insert" ON product_review_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "prl_delete" ON product_review_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS store_review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES store_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

ALTER TABLE store_review_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "srl_select" ON store_review_likes;
DROP POLICY IF EXISTS "srl_insert" ON store_review_likes;
DROP POLICY IF EXISTS "srl_delete" ON store_review_likes;
CREATE POLICY "srl_select" ON store_review_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "srl_insert" ON store_review_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "srl_delete" ON store_review_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS download_token_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  download_token_id uuid NOT NULL REFERENCES download_tokens(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  device_label text,
  user_agent text,
  downloaded_at timestamptz DEFAULT now()
);

ALTER TABLE download_token_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dtl_select" ON download_token_logs;
DROP POLICY IF EXISTS "dtl_insert" ON download_token_logs;
CREATE POLICY "dtl_select" ON download_token_logs FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid() OR EXISTS(
      SELECT 1
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.id = download_token_logs.order_id AND s.owner_id = auth.uid()
    )
  );
CREATE POLICY "dtl_insert" ON download_token_logs FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_download_token_logs_token ON download_token_logs(download_token_id, downloaded_at DESC);