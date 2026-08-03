CREATE TABLE IF NOT EXISTS payment_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  owner_type text NOT NULL CHECK (owner_type IN ('user','store')),
  label text NOT NULL,
  method_type text NOT NULL CHECK (method_type IN ('bank_account','mobile_wallet','crypto_wallet','card_transfer','external_p2p','cash_agent')),
  provider_name text,
  account_name text,
  account_number text,
  iban text,
  swift_code text,
  wallet_network text,
  wallet_address text,
  phone_number text,
  qr_code_url text,
  currency_code text DEFAULT 'USD',
  instructions text,
  is_default boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK ((owner_type = 'user' AND owner_user_id IS NOT NULL AND store_id IS NULL) OR (owner_type = 'store' AND store_id IS NOT NULL))
);

ALTER TABLE payment_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pp_select" ON payment_profiles;
DROP POLICY IF EXISTS "pp_insert" ON payment_profiles;
DROP POLICY IF EXISTS "pp_update" ON payment_profiles;
DROP POLICY IF EXISTS "pp_delete" ON payment_profiles;
DROP POLICY IF EXISTS "pp_service" ON payment_profiles;

CREATE POLICY "pp_select" ON payment_profiles FOR SELECT TO authenticated
  USING (
    (owner_type = 'user' AND owner_user_id = auth.uid()) OR
    (owner_type = 'store' AND EXISTS (SELECT 1 FROM stores WHERE id = payment_profiles.store_id AND owner_id = auth.uid())) OR
    (owner_type = 'store' AND is_public = true AND is_active = true)
  );

CREATE POLICY "pp_insert" ON payment_profiles FOR INSERT TO authenticated
  WITH CHECK (
    (owner_type = 'user' AND owner_user_id = auth.uid()) OR
    (owner_type = 'store' AND EXISTS (SELECT 1 FROM stores WHERE id = payment_profiles.store_id AND owner_id = auth.uid()))
  );

CREATE POLICY "pp_update" ON payment_profiles FOR UPDATE TO authenticated
  USING (
    (owner_type = 'user' AND owner_user_id = auth.uid()) OR
    (owner_type = 'store' AND EXISTS (SELECT 1 FROM stores WHERE id = payment_profiles.store_id AND owner_id = auth.uid()))
  )
  WITH CHECK (
    (owner_type = 'user' AND owner_user_id = auth.uid()) OR
    (owner_type = 'store' AND EXISTS (SELECT 1 FROM stores WHERE id = payment_profiles.store_id AND owner_id = auth.uid()))
  );

CREATE POLICY "pp_delete" ON payment_profiles FOR DELETE TO authenticated
  USING (
    (owner_type = 'user' AND owner_user_id = auth.uid()) OR
    (owner_type = 'store' AND EXISTS (SELECT 1 FROM stores WHERE id = payment_profiles.store_id AND owner_id = auth.uid()))
  );

CREATE POLICY "pp_service" ON payment_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_payment_profiles_user ON payment_profiles(owner_user_id) WHERE owner_type = 'user';
CREATE INDEX IF NOT EXISTS idx_payment_profiles_store ON payment_profiles(store_id) WHERE owner_type = 'store';