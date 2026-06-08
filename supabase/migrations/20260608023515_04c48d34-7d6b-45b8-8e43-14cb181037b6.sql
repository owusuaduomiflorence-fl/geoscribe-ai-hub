DROP POLICY IF EXISTS sub_student_update ON public.submissions;
CREATE POLICY sub_student_update
ON public.submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id AND status = 'submitted')
WITH CHECK (
  auth.uid() = student_id
  AND status = 'submitted'
  AND auto_score = 0
  AND manual_score = 0
  AND total_score = 0
  AND COALESCE(max_score, 0) = 0
  AND graded_at IS NULL
  AND manual_breakdown = '{}'::jsonb
);