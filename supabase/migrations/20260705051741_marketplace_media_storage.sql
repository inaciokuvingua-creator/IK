-- Storage policies for marketplace-media bucket
DROP POLICY IF EXISTS "mp_media_read"   ON storage.objects;
DROP POLICY IF EXISTS "mp_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "mp_media_update" ON storage.objects;
DROP POLICY IF EXISTS "mp_media_delete" ON storage.objects;

CREATE POLICY "mp_media_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'marketplace-media');

CREATE POLICY "mp_media_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketplace-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "mp_media_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'marketplace-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "mp_media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketplace-media' AND (storage.foldername(name))[1] = auth.uid()::text);
