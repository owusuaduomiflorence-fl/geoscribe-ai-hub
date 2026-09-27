CREATE TABLE public.geosnap_discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_path text NOT NULL,
  feature text NOT NULL,
  category text,
  topic text,
  confidence numeric,
  level text NOT NULL DEFAULT 'school',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  approx_location text,
  quiz_score integer,
  quiz_total integer,
  xp_earned integer NOT NULL DEFAULT 0,
  xp_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.geosnap_discoveries TO authenticated;
GRANT ALL ON public.geosnap_discoveries TO service_role;
ALTER TABLE public.geosnap_discoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own discoveries select" ON public.geosnap_discoveries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own discoveries insert" ON public.geosnap_discoveries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own discoveries update" ON public.geosnap_discoveries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own discoveries delete" ON public.geosnap_discoveries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX geosnap_user_idx ON public.geosnap_discoveries(user_id, created_at DESC);

CREATE POLICY "geosnaps own read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'geosnaps' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "geosnaps own insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'geosnaps' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "geosnaps own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'geosnaps' AND auth.uid()::text = (storage.foldername(name))[1]);