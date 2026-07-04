-- Create chat-media storage bucket with RLS policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media', 'chat-media', true, 104857600,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','audio/mpeg','audio/ogg','audio/wav','audio/webm','video/mp4','video/webm','video/ogg','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip','text/plain']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_media_read"   ON storage.objects;
DROP POLICY IF EXISTS "chat_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "chat_media_delete" ON storage.objects;

CREATE POLICY "chat_media_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media');

CREATE POLICY "chat_media_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "chat_media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
