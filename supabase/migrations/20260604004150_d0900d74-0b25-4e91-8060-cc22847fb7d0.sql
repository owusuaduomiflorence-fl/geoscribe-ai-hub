GRANT EXECUTE ON FUNCTION public.is_class_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_class_with_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_class_invite(text) TO authenticated;

DROP POLICY IF EXISTS sub_student_insert ON public.submissions;
CREATE POLICY sub_student_insert
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS sub_student_update ON public.submissions;
CREATE POLICY sub_student_update
ON public.submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id AND status <> 'graded')
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS sub_teacher_update ON public.submissions;
CREATE POLICY sub_teacher_update
ON public.submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = submissions.assignment_id
      AND a.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = submissions.assignment_id
      AND a.teacher_id = auth.uid()
  )
);