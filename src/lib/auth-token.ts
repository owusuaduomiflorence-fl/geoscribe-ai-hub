import { supabase } from "@/integrations/supabase/client";

export async function getRequiredAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (error || !token) {
    throw new Error("Your sign-in session is missing. Please sign out and sign in again.");
  }

  return token;
}

export async function invokeAuthenticatedFunction<T = any>(
  name: string,
  body: Record<string, unknown>,
) {
  const token = await getRequiredAccessToken();
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) throw error;
  return data;
}