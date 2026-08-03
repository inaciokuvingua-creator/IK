ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'cliente'
    CHECK (account_type IN ('cliente','vendedor','empresa','fornecedor','criador','profissional','administrador')),
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'publico'
    CHECK (profile_visibility IN ('publico','privado','misto')),
  ADD COLUMN IF NOT EXISTS profile_completion integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS sex text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS public_bio text,
  ADD COLUMN IF NOT EXISTS location_label text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_category text,
  ADD COLUMN IF NOT EXISTS company_description text,
  ADD COLUMN IF NOT EXISTS company_logo_url text,
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS company_socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS company_contacts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS company_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS associated_companies jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stores_created jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS published_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS offered_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_preferences jsonb NOT NULL DEFAULT '{"email":true,"phone":false,"show_location":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS public_profile jsonb NOT NULL DEFAULT '{"show_bio":true,"show_reviews":true,"show_products":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS private_profile jsonb NOT NULL DEFAULT '{"hide_document":true,"hide_address":true,"hide_financial":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS security_level text NOT NULL DEFAULT 'standard'
    CHECK (security_level IN ('standard','elevated','strict')),
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_ip text,
  ADD COLUMN IF NOT EXISTS last_login_location text,
  ADD COLUMN IF NOT EXISTS suspicious_login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consent_version text,
  ADD COLUMN IF NOT EXISTS consented_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE user_profiles
SET
  email = COALESCE(user_profiles.email, au.email),
  username = COALESCE(
    user_profiles.username,
    split_part(
      COALESCE(au.email, user_profiles.nome, 'utilizador'),
      '@',
      1
    ) || '_' || substr(user_profiles.user_id::text, 1, 6)
  ),
  preferred_language = COALESCE(user_profiles.preferred_language, user_profiles.idioma, 'pt'),
  full_name = COALESCE(user_profiles.full_name, NULLIF(user_profiles.nome, '')),
  display_name = COALESCE(user_profiles.display_name, NULLIF(user_profiles.nome, '')),
  public_bio = COALESCE(user_profiles.public_bio, user_profiles.bio),
  profile_completion = GREATEST(
    user_profiles.profile_completion,
    (CASE WHEN COALESCE(user_profiles.nome, '') <> '' THEN 15 ELSE 0 END) +
    (CASE WHEN COALESCE(user_profiles.phone, '') <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(user_profiles.country, '') <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(user_profiles.avatar_url, '') <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(user_profiles.bio, '') <> '' THEN 10 ELSE 0 END)
  )
FROM auth.users au
WHERE au.id = user_profiles.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_unique_idx
  ON user_profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_unique_idx
  ON user_profiles (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_identity_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('bi','passaporte','carta','nif','outro')),
  document_number text NOT NULL,
  issuer_country text NOT NULL,
  issued_at date,
  expires_at date,
  document_url text,
  verification_status text NOT NULL DEFAULT 'pendente'
    CHECK (verification_status IN ('pendente','verificado','rejeitado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_identity_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_identity_documents" ON user_identity_documents;
DROP POLICY IF EXISTS "insert_own_identity_documents" ON user_identity_documents;
DROP POLICY IF EXISTS "update_own_identity_documents" ON user_identity_documents;
DROP POLICY IF EXISTS "service_identity_documents" ON user_identity_documents;
CREATE POLICY "select_own_identity_documents" ON user_identity_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_identity_documents" ON user_identity_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_identity_documents" ON user_identity_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_identity_documents" ON user_identity_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_security_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_security_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_security_questions" ON user_security_questions;
DROP POLICY IF EXISTS "insert_own_security_questions" ON user_security_questions;
DROP POLICY IF EXISTS "delete_own_security_questions" ON user_security_questions;
DROP POLICY IF EXISTS "service_security_questions" ON user_security_questions;
CREATE POLICY "select_own_security_questions" ON user_security_questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_security_questions" ON user_security_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_security_questions" ON user_security_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "service_security_questions" ON user_security_questions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_method text NOT NULL DEFAULT 'password',
  device_name text,
  device_id text,
  user_agent text,
  ip_address text,
  location_label text,
  country text,
  timezone text,
  success boolean NOT NULL DEFAULT true,
  suspicious boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_login_history" ON user_login_history;
DROP POLICY IF EXISTS "insert_own_login_history" ON user_login_history;
DROP POLICY IF EXISTS "service_login_history" ON user_login_history;
CREATE POLICY "select_own_login_history" ON user_login_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_login_history" ON user_login_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_login_history" ON user_login_history FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_name text,
  platform text,
  browser text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_ip text,
  last_location text,
  trusted boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_devices" ON user_devices;
DROP POLICY IF EXISTS "insert_own_devices" ON user_devices;
DROP POLICY IF EXISTS "update_own_devices" ON user_devices;
DROP POLICY IF EXISTS "service_devices" ON user_devices;
CREATE POLICY "select_own_devices" ON user_devices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_devices" ON user_devices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_devices" ON user_devices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_devices" ON user_devices FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS account_recovery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  identifier text,
  recovery_type text NOT NULL,
  matched_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','aprovado','suspeito','bloqueado','concluido')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE account_recovery_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insert_recovery_attempts" ON account_recovery_attempts;
DROP POLICY IF EXISTS "select_own_recovery_attempts" ON account_recovery_attempts;
DROP POLICY IF EXISTS "service_recovery_attempts" ON account_recovery_attempts;
CREATE POLICY "insert_recovery_attempts" ON account_recovery_attempts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "select_own_recovery_attempts" ON account_recovery_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "service_recovery_attempts" ON account_recovery_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS profile_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  previous_value text,
  next_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profile_change_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile_logs" ON profile_change_logs;
DROP POLICY IF EXISTS "insert_own_profile_logs" ON profile_change_logs;
DROP POLICY IF EXISTS "service_profile_logs" ON profile_change_logs;
CREATE POLICY "select_own_profile_logs" ON profile_change_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_profile_logs" ON profile_change_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_profile_logs" ON profile_change_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'identity-documents',
  'identity-documents',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "identity_documents_owner_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "identity_documents_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "identity_documents_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "identity_documents_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.resolve_login_identifier(input_identifier text)
RETURNS TABLE (user_id uuid, email text, username text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.user_id, up.email, up.username
  FROM user_profiles up
  LEFT JOIN user_identity_documents uid ON uid.user_id = up.user_id
  WHERE lower(COALESCE(up.email, '')) = lower(trim(input_identifier))
     OR lower(COALESCE(up.username, '')) = lower(trim(both '@' from input_identifier))
     OR COALESCE(up.phone, '') = trim(input_identifier)
     OR COALESCE(uid.document_number, '') = trim(input_identifier)
  ORDER BY uid.created_at DESC NULLS LAST
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.recover_account_identity(
  input_identifier text DEFAULT NULL,
  input_full_name text DEFAULT NULL,
  input_birth_date date DEFAULT NULL,
  input_country text DEFAULT NULL,
  input_city text DEFAULT NULL,
  input_phone text DEFAULT NULL,
  input_email text DEFAULT NULL,
  input_document_number text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  username text,
  masked_email text,
  masked_phone text,
  score integer,
  allow_reset boolean,
  suspicious boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate RECORD;
  match_score integer;
BEGIN
  FOR candidate IN
    SELECT
      up.user_id,
      up.username,
      up.email,
      up.phone,
      up.full_name,
      up.birth_date,
      up.country,
      up.city,
      uid.document_number
    FROM user_profiles up
    LEFT JOIN user_identity_documents uid ON uid.user_id = up.user_id
    WHERE (
      input_identifier IS NOT NULL AND (
        lower(COALESCE(up.email, '')) = lower(trim(input_identifier)) OR
        lower(COALESCE(up.username, '')) = lower(trim(both '@' from input_identifier)) OR
        COALESCE(up.phone, '') = trim(input_identifier) OR
        COALESCE(uid.document_number, '') = trim(input_identifier)
      )
    ) OR (
      input_identifier IS NULL AND (
        (input_full_name IS NOT NULL AND lower(COALESCE(up.full_name, '')) = lower(trim(input_full_name))) OR
        (input_document_number IS NOT NULL AND COALESCE(uid.document_number, '') = trim(input_document_number))
      )
    )
    LIMIT 5
  LOOP
    match_score := 0;
    IF input_full_name IS NOT NULL AND lower(COALESCE(candidate.full_name, '')) = lower(trim(input_full_name)) THEN match_score := match_score + 20; END IF;
    IF input_birth_date IS NOT NULL AND candidate.birth_date = input_birth_date THEN match_score := match_score + 15; END IF;
    IF input_country IS NOT NULL AND lower(COALESCE(candidate.country, '')) = lower(trim(input_country)) THEN match_score := match_score + 10; END IF;
    IF input_city IS NOT NULL AND lower(COALESCE(candidate.city, '')) = lower(trim(input_city)) THEN match_score := match_score + 10; END IF;
    IF input_phone IS NOT NULL AND COALESCE(candidate.phone, '') = trim(input_phone) THEN match_score := match_score + 20; END IF;
    IF input_email IS NOT NULL AND lower(COALESCE(candidate.email, '')) = lower(trim(input_email)) THEN match_score := match_score + 15; END IF;
    IF input_document_number IS NOT NULL AND COALESCE(candidate.document_number, '') = trim(input_document_number) THEN match_score := match_score + 25; END IF;
    IF input_identifier IS NOT NULL THEN match_score := match_score + 10; END IF;

    INSERT INTO account_recovery_attempts (user_id, identifier, recovery_type, score, status)
    VALUES (
      candidate.user_id,
      input_identifier,
      CASE WHEN input_identifier IS NOT NULL THEN 'identifier' ELSE 'identity_match' END,
      match_score,
      CASE WHEN match_score >= 60 THEN 'aprovado' WHEN match_score >= 35 THEN 'suspeito' ELSE 'bloqueado' END
    );

    RETURN QUERY SELECT
      candidate.user_id,
      candidate.username,
      CASE
        WHEN candidate.email IS NULL THEN NULL
        ELSE left(candidate.email, 2) || '***' || substring(candidate.email from position('@' in candidate.email))
      END,
      CASE
        WHEN candidate.phone IS NULL OR length(candidate.phone) < 4 THEN NULL
        ELSE repeat('*', GREATEST(length(candidate.phone) - 4, 0)) || right(candidate.phone, 4)
      END,
      match_score,
      match_score >= 60,
      match_score BETWEEN 35 AND 59;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recover_account_identity(text, text, date, text, text, text, text, text) TO anon, authenticated;
