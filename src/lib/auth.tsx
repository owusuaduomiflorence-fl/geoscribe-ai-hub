import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "teacher";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isTeacher: boolean;
  isStudent: boolean;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: AppRole
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) setRoles([]);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load roles whenever user changes
  useEffect(() => {
    if (!user) {
      setRoles([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      setRoles(((data ?? []).map((r) => r.role) as AppRole[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const clearLocalSupabaseStorage = () => {
    if (typeof window === "undefined") return;
    try {
      const keys = Object.keys(window.localStorage);
      for (const k of keys) {
        if (k.startsWith("sb-") || k.includes("supabase")) {
          window.localStorage.removeItem(k);
        }
      }
    } catch {
      // ignore storage access errors
    }
  };

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    // Ensure no stale session interferes with the new sign-in
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  };

  const signUp: AuthCtx["signUp"] = async (email, password, displayName, role) => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore
    }
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: displayName, role },
      },
    });
    return { error: error?.message ?? null };
  };

  const signInWithGoogle = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore
    }
    clearLocalSupabaseStorage();
    const { lovable } = await import("@/integrations/lovable");
    await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
      extraParams: { prompt: "select_account" },
    });
  };

  const signOut = async () => {
    // Clear local state immediately so the UI updates even if the
    // server-side revocation request fails (e.g. expired token).
    setSession(null);
    setUser(null);
    setRoles([]);
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore
    }
    clearLocalSupabaseStorage();
  };

  const hasRole = (r: AppRole) => roles.includes(r);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        roles,
        isTeacher: roles.includes("teacher"),
        isStudent: roles.includes("student"),
        hasRole,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
