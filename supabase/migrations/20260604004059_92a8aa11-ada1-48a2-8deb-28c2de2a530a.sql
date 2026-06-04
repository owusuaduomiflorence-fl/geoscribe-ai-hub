REVOKE ALL ON FUNCTION public.ensure_user_profile(text, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_user_profile(text, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(text, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(text, public.app_role) TO service_role;