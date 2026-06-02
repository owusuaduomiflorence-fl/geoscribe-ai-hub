
-- 1) Fix submissions: students can INSERT + SELECT only; teachers update scores
DROP POLICY IF EXISTS "sub_student_all" ON public.submissions;

CREATE POLICY "sub_student_select" ON public.submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "sub_student_insert" ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND COALESCE(auto_score, 0) = 0
    AND COALESCE(manual_score, 0) = 0
    AND COALESCE(total_score, 0) = 0
    AND status = 'submitted'
    AND graded_at IS NULL
  );

-- 2) user_roles: lock writes to service_role only
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated, PUBLIC;
GRANT  INSERT, UPDATE, DELETE ON public.user_roles TO service_role;

-- 3) Fix touch_updated_at search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

-- 4) Revoke EXECUTE on internal SECURITY DEFINER helpers; keep user-callable ones
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_class_teacher(uuid, uuid)    FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_class_member(uuid, uuid)     FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.gen_join_code()                 FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()               FROM anon, authenticated, PUBLIC;

-- These are intended to be called by signed-in users:
GRANT EXECUTE ON FUNCTION public.join_class_with_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_class_invite(text)  TO authenticated;

-- 5) Restrict lesson-videos listing to the owning user's folder
DROP POLICY IF EXISTS "lesson_videos_public_read" ON storage.objects;

CREATE POLICY "lesson_videos_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'lesson-videos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
