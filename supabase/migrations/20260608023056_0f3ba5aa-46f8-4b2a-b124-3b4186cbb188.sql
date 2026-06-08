CREATE OR REPLACE FUNCTION public.protect_student_submission_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.student_id THEN
    IF OLD.status = 'graded' THEN
      RAISE EXCEPTION 'Graded submissions cannot be changed by students';
    END IF;

    NEW.id := OLD.id;
    NEW.assignment_id := OLD.assignment_id;
    NEW.student_id := OLD.student_id;
    NEW.auto_score := OLD.auto_score;
    NEW.manual_score := OLD.manual_score;
    NEW.total_score := OLD.total_score;
    NEW.max_score := OLD.max_score;
    NEW.status := OLD.status;
    NEW.graded_at := OLD.graded_at;
    NEW.manual_breakdown := OLD.manual_breakdown;
    NEW.submitted_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_student_submission_update ON public.submissions;
CREATE TRIGGER protect_student_submission_update
BEFORE UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.protect_student_submission_update();

DROP POLICY IF EXISTS sub_student_update ON public.submissions;
CREATE POLICY sub_student_update
ON public.submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id AND status <> 'graded')
WITH CHECK (
  auth.uid() = student_id
  AND status <> 'graded'
  AND auto_score = 0
  AND manual_score = 0
  AND total_score = 0
  AND COALESCE(max_score, 0) = 0
  AND graded_at IS NULL
  AND manual_breakdown = '{}'::jsonb
);

COMMENT ON TABLE public.class_members IS 'Direct inserts are intentionally blocked by RLS. Students join classes only through SECURITY DEFINER functions join_class_with_code or accept_class_invite.';

DROP POLICY IF EXISTS quiz_assigned_student_select ON public.quizzes;
CREATE POLICY quiz_assigned_student_select
ON public.quizzes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    JOIN public.class_members cm ON cm.class_id = a.class_id
    WHERE a.type = 'quiz'
      AND a.ref_id = quizzes.id
      AND cm.student_id = auth.uid()
  )
);

DROP POLICY IF EXISTS ws_assigned_student_select ON public.worksheets;
CREATE POLICY ws_assigned_student_select
ON public.worksheets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    JOIN public.class_members cm ON cm.class_id = a.class_id
    WHERE a.type = 'worksheet'
      AND a.ref_id = worksheets.id
      AND cm.student_id = auth.uid()
  )
);