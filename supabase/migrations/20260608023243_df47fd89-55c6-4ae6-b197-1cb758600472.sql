REVOKE ALL ON FUNCTION public.protect_student_submission_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_student_submission_update() FROM anon;
REVOKE ALL ON FUNCTION public.protect_student_submission_update() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.protect_student_submission_update() TO service_role;