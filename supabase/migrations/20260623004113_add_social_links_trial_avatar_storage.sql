-- Add social_links JSONB to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}';

-- Add trial tracking fields
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at    timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_active     boolean     NOT NULL DEFAULT false;

-- Backfill trial for existing users: trial = created_at to created_at + 3 months
UPDATE user_profiles
SET
  trial_started_at = created_at,
  trial_ends_at    = created_at + interval '3 months',
  trial_active     = true,
  plan_expires_at  = COALESCE(plan_expires_at, created_at + interval '3 months')
WHERE trial_started_at IS NULL;

-- Storage bucket for avatars (public read, owner write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
CREATE POLICY "avatar_select_public" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatar_insert_own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
