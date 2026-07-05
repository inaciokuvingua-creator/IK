/*
# Marketplace Advanced Schema

Extends the existing marketplace with:
1. product_media — multiple images/videos/audio/docs per product
2. product_reviews — star ratings + comments + likes + seller replies
3. store_reviews — store-level ratings
4. download_tokens — secure per-buyer download tokens with expiry + IP log
5. order_proofs — payment proof uploads per order
6. product_favourites — buyer wishlist
7. product_views — view counter
8. marketplace_audit — audit log for all marketplace events

Alters existing tables: products (add fields), orders (add fields), stores (add fields).
*/

-- ── Extend products ────────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS subcategoria      text,
  ADD COLUMN IF NOT EXISTS marca             text,
  ADD COLUMN IF NOT EXISTS disponibilidade   text DEFAULT 'disponivel',
  ADD COLUMN IF NOT EXISTS localizacao       text,
  ADD COLUMN IF NOT EXISTS peso              numeric,
  ADD COLUMN IF NOT EXISTS dimensoes         jsonb,
  ADD COLUMN IF NOT EXISTS transportadora    text,
  ADD COLUMN IF NOT EXISTS tempo_entrega     text,
  ADD COLUMN IF NOT EXISTS formatos          text[],
  ADD COLUMN IF NOT EXISTS total_views       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_downloads   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at        timestamptz,
  ADD COLUMN IF NOT EXISTS tags              text[];

-- ── Extend stores ─────────────────────────────────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS localizacao       text,
  ADD COLUMN IF NOT EXISTS avg_rating        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at        timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp          text,
  ADD COLUMN IF NOT EXISTS email_contato     text;

-- ── Extend orders ─────────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS notes             text,
  ADD COLUMN IF NOT EXISTS proof_url         text,
  ADD COLUMN IF NOT EXISTS approved_at       timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS download_released boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS conversation_id   uuid REFERENCES chat_conversations(id) ON DELETE SET NULL;

-- ── Product media ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_media (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  owner_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  type         text NOT NULL CHECK (type IN ('image','video','audio','document')),
  url          text NOT NULL,
  mime         text,
  name         text,
  size         bigint,
  duration     int,
  sort_order   int DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pm_select" ON product_media;
CREATE POLICY "pm_select" ON product_media FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pm_insert" ON product_media;
CREATE POLICY "pm_insert" ON product_media FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "pm_update" ON product_media;
CREATE POLICY "pm_update" ON product_media FOR UPDATE TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "pm_delete" ON product_media;
CREATE POLICY "pm_delete" ON product_media FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ── Product reviews ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  reviewer_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  rating          int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         text,
  photo_urls      text[] DEFAULT '{}',
  likes           int DEFAULT 0,
  seller_reply    text,
  seller_reply_at timestamptz,
  verified_purchase boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(product_id, reviewer_id)
);
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pr_select" ON product_reviews;
CREATE POLICY "pr_select" ON product_reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pr_insert" ON product_reviews;
CREATE POLICY "pr_insert" ON product_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
DROP POLICY IF EXISTS "pr_update" ON product_reviews;
CREATE POLICY "pr_update" ON product_reviews FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid() OR EXISTS(SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "pr_delete" ON product_reviews;
CREATE POLICY "pr_delete" ON product_reviews FOR DELETE TO authenticated USING (reviewer_id = auth.uid());

-- ── Store reviews ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  reviewer_id  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  rating       int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      text,
  likes        int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(store_id, reviewer_id)
);
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_select" ON store_reviews;
CREATE POLICY "sr_select" ON store_reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sr_insert" ON store_reviews;
CREATE POLICY "sr_insert" ON store_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
DROP POLICY IF EXISTS "sr_update" ON store_reviews;
CREATE POLICY "sr_update" ON store_reviews FOR UPDATE TO authenticated USING (reviewer_id = auth.uid());
DROP POLICY IF EXISTS "sr_delete" ON store_reviews;
CREATE POLICY "sr_delete" ON store_reviews FOR DELETE TO authenticated USING (reviewer_id = auth.uid());

-- ── Download tokens ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS download_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token           text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      timestamptz,
  max_downloads   int DEFAULT 3,
  download_count  int DEFAULT 0,
  last_ip         text,
  last_device     text,
  last_download   timestamptz,
  revoked         boolean DEFAULT false,
  released_by     uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dt_select" ON download_tokens;
CREATE POLICY "dt_select" ON download_tokens FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS(SELECT 1 FROM stores s JOIN products p ON p.store_id=s.id WHERE p.id=product_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "dt_insert" ON download_tokens;
CREATE POLICY "dt_insert" ON download_tokens FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM stores s JOIN products p ON p.store_id=s.id WHERE p.id=product_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "dt_update" ON download_tokens;
CREATE POLICY "dt_update" ON download_tokens FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS(SELECT 1 FROM stores s JOIN products p ON p.store_id=s.id WHERE p.id=product_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "dt_delete" ON download_tokens;
CREATE POLICY "dt_delete" ON download_tokens FOR DELETE TO authenticated
  USING (EXISTS(SELECT 1 FROM stores s JOIN products p ON p.store_id=s.id WHERE p.id=product_id AND s.owner_id=auth.uid()));

-- ── Order proofs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_proofs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  uploader_id  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  url          text NOT NULL,
  mime         text,
  name         text,
  note         text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE order_proofs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "op_select" ON order_proofs;
CREATE POLICY "op_select" ON order_proofs FOR SELECT TO authenticated
  USING (uploader_id = auth.uid() OR EXISTS(SELECT 1 FROM orders o JOIN stores s ON s.id=o.store_id WHERE o.id=order_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "op_insert" ON order_proofs;
CREATE POLICY "op_insert" ON order_proofs FOR INSERT TO authenticated WITH CHECK (uploader_id = auth.uid());
DROP POLICY IF EXISTS "op_update" ON order_proofs;
CREATE POLICY "op_update" ON order_proofs FOR UPDATE TO authenticated USING (uploader_id = auth.uid());
DROP POLICY IF EXISTS "op_delete" ON order_proofs;
CREATE POLICY "op_delete" ON order_proofs FOR DELETE TO authenticated USING (uploader_id = auth.uid());

-- ── Product favourites ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_favourites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);
ALTER TABLE product_favourites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pf_select" ON product_favourites;
CREATE POLICY "pf_select" ON product_favourites FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "pf_insert" ON product_favourites;
CREATE POLICY "pf_insert" ON product_favourites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "pf_delete" ON product_favourites;
CREATE POLICY "pf_delete" ON product_favourites FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── Product views ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewer_id   uuid REFERENCES auth.users(id),
  viewed_at   timestamptz DEFAULT now()
);
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pv_select" ON product_views;
CREATE POLICY "pv_select" ON product_views FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pv_insert" ON product_views;
CREATE POLICY "pv_insert" ON product_views FOR INSERT TO authenticated WITH CHECK (true);

-- ── Marketplace audit log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_audit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  entity_type text NOT NULL,
  entity_id   uuid,
  action      text NOT NULL,
  details     jsonb,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE marketplace_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ma_select" ON marketplace_audit;
CREATE POLICY "ma_select" ON marketplace_audit FOR SELECT TO authenticated USING (actor_id = auth.uid());
DROP POLICY IF EXISTS "ma_insert" ON marketplace_audit;
CREATE POLICY "ma_insert" ON marketplace_audit FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_store      ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted    ON products(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_rating     ON products(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_prod_reviews_prod   ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_store ON store_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_dt_buyer            ON download_tokens(buyer_id);
CREATE INDEX IF NOT EXISTS idx_dt_token            ON download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_orders_buyer        ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_store        ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_pf_user             ON product_favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_product          ON product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_op_order            ON order_proofs(order_id);

-- ── Realtime (only new tables) ────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE download_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE order_proofs;
ALTER PUBLICATION supabase_realtime ADD TABLE product_reviews;
