import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { clearBrowserAuthStorage } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset password — Geoguide AI" },
      { name: "description", content: "Create a new Geoguide AI password after using a secure password reset link." },
    ],
    links: [{ rel: "canonical", href: "https://geoscribe-ai-hub.lovable.app/reset-password" }],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setReady(Boolean(data.session));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    const confirm = String(fd.get("confirm"));

    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" }).catch(() => null);
    clearBrowserAuthStorage();
    toast.success("Password updated. Sign in with your new password.");
    navigate({ to: "/auth" });
  };

  return (
    <main className="min-h-screen grid place-items-center bg-hero px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center">
            <Globe2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-xl">Geoguide AI</span>
        </Link>
        <h1 className="text-center text-2xl font-display font-semibold mb-6">Reset your password</h1>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          {ready ? (
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" name="password" type="password" minLength={6} required autoComplete="new-password" />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input id="confirm-password" name="confirm" type="password" minLength={6} required autoComplete="new-password" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Updating..." : "Update password"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Open this page from the password reset link sent to your email.</p>
              <Button asChild className="w-full">
                <Link to="/auth">Back to sign in</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}