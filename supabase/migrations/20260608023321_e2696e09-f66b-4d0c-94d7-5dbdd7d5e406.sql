REVOKE ALL ON FUNCTION public.join_class_with_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_class_with_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.join_class_with_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_class_with_code(text) TO service_role;

REVOKE ALL ON FUNCTION public.accept_class_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_class_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_class_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_class_invite(text) TO service_role;