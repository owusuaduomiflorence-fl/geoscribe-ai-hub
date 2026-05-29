
-- Public bucket for lesson videos (uploads by teachers, embeddable URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lesson-videos', 'lesson-videos', true, 104857600, ARRAY['video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4','video/webm','video/quicktime'];

-- Anyone can read (public bucket)
CREATE POLICY "lesson_videos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-videos');

-- Authenticated users can upload to their own folder (first path segment = user id)
CREATE POLICY "lesson_videos_user_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lesson-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "lesson_videos_user_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lesson-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "lesson_videos_user_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lesson-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
