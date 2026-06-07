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

const AUTH_STORAGE_MARKERS = ["sb-", "supabase", "gotrue", "lovable", "oauth", "pkce"];

export function clearBrowserAuthStorage() {
  if (typeof window === "undefined") return;

  const shouldClear = (key: string) => {
    const normalized = key.toLowerCase();
    return AUTH_STORAGE_MARKERS.some((marker) => normalized.includes(marker));
  };

  try {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (const key of Object.keys(storage)) {
        if (shouldClear(key)) storage.removeItem(key);
      }
    }
  } catch {
    // ignore storage access errors
  }

  try {
    const hostParts = window.location.hostname.split(".");
    const domains = new Set<string | undefined>([undefined, window.location.hostname]);
    if (hostParts.length > 1) domains.add(`.${window.location.hostname}`);

    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (!name || !shouldClear(name)) continue;
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ""}`;
      }
    }
  } catch {
    // ignore cookie cleanup errors
  }
}

async function clearSupabaseClientSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // ignore missing/expired local sessions
  } finally {
    clearBrowserAuthStorage();
  }
}

async function waitForSignOut() {
  await Promise.race([
    supabase.auth.signOut({ scope: "global" }).catch(() => null),
    new Promise((resolve) => window.setTimeout(resolve, 2500)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) setRoles([]);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      clearBrowserAuthStorage();
      setSession(null);
      setUser(null);
      setRoles([]);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
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

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    await clearSupabaseClientSession();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      await clearSupabaseClientSession();
      const message = error.message.toLowerCase().includes("invalid login credentials")
        ? "Invalid login credentials. If this account was created with Google, use Continue with Google or reset the password first."
        : error.message;
      return { error: message };
    }

    const activeSession = data.session ?? (await supabase.auth.getSession()).data.session;
    if (!activeSession) return { error: "Sign-in did not return a valid session. Please try again." };
    setSession(activeSession);
    setUser(activeSession.user);
    return { error: null };
  };

  const signUp: AuthCtx["signUp"] = async (email, password, displayName, role) => {
    await clearSupabaseClientSession();
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
    await clearSupabaseClientSession();
    const { lovable } = await import("@/integrations/lovable");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) throw result.error;
  };

  const signOut = async () => {
    // Clear local state immediately so the UI updates even if the
    // server-side revocation request fails (e.g. expired token).
    setSession(null);
    setUser(null);
    setRoles([]);
    await waitForSignOut();
    await clearSupabaseClientSession();
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
