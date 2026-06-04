ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS grade_level text NOT NULL DEFAULT 'JHS',
  ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT 'Geography';

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS manual_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'submissions_assignment_student_unique'
      AND conrelid = 'public.submissions'::regclass
  ) THEN
    ALTER TABLE public.submissions
      ADD CONSTRAINT submissions_assignment_student_unique UNIQUE (assignment_id, student_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  rating integer NOT NULL,
  title text NOT NULL,
  comment text NOT NULL,
  role_label text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are publicly readable" ON public.reviews;
CREATE POLICY "Reviews are publicly readable"
ON public.reviews
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Anyone can submit a valid review" ON public.reviews;
CREATE POLICY "Anyone can submit a valid review"
ON public.reviews
FOR INSERT
TO public
WITH CHECK (
  rating BETWEEN 1 AND 5
  AND length(trim(title)) BETWEEN 1 AND 120
  AND length(trim(comment)) BETWEEN 1 AND 2000
  AND (role_label IS NULL OR role_label IN ('Teacher', 'Student'))
  AND (user_id IS NULL OR auth.uid() = user_id)
);

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 5);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS touch_reviews_updated_at ON public.reviews;
CREATE TRIGGER touch_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "teachers_select_class_student_profiles" ON public.profiles;
CREATE POLICY "teachers_select_class_student_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = profiles.id
      AND c.teacher_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.ensure_user_profile(_display_name text DEFAULT NULL, _role public.app_role DEFAULT 'student')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (id, display_name)
  VALUES (_uid, NULLIF(trim(_display_name), ''))
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, COALESCE(_role, 'student'::public.app_role));
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile(text, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(text, public.app_role) TO service_role;