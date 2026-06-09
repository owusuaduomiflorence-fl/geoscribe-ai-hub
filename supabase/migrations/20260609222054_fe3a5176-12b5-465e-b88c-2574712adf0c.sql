
DROP POLICY IF EXISTS sub_student_insert ON public.submissions;
CREATE POLICY sub_student_insert ON public.submissions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND auto_score = 0
  AND manual_score = 0
  AND total_score = 0
  AND COALESCE(max_score, 0) = 0
  AND graded_at IS NULL
  AND manual_breakdown = '{}'::jsonb
);

DROP POLICY IF EXISTS "Anyone can submit a valid review" ON public.reviews;
CREATE POLICY "Authenticated users can submit a valid review" ON public.reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND rating BETWEEN 1 AND 5
  AND length(trim(title)) BETWEEN 1 AND 120
  AND length(trim(comment)) BETWEEN 1 AND 2000
  AND (role_label IS NULL OR role_label = ANY (ARRAY['Teacher'::text,'Student'::text]))
);
