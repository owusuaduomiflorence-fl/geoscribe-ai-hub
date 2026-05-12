import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe2, GraduationCap, Users } from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { user, signIn, signUp, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("invite");
      (async () => {
        if (token) {
          const { error } = await supabase.rpc("accept_class_invite", { _token: token });
          if (error) toast.error(error.message);
          else toast.success("Joined class via invite");
        }
        navigate({ to: "/dashboard" });
      })();
    }
  }, [user, loading, navigate]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await signIn(String(fd.get("email")), String(fd.get("password")));
    setBusy(false);
    if (error) toast.error(error);
    else navigate({ to: "/dashboard" });
  };

  const [role, setRole] = useState<AppRole>("student");

  const onSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await signUp(
      String(fd.get("email")),
      String(fd.get("password")),
      String(fd.get("name")),
      role
    );
    setBusy(false);
    if (error) toast.error(error);
    else toast.success("Account created! Check your email to verify, then sign in.");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-hero px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center">
            <Globe2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-xl">Geoguide AI</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-5">
              <form onSubmit={onSignIn} className="space-y-3">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="si-pw">Password</Label>
                  <Input id="si-pw" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={onSignUp} className="space-y-3">
                <div>
                  <Label>I am a</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {(["student", "teacher"] as AppRole[]).map((r) => {
                      const Icon = r === "student" ? GraduationCap : Users;
                      const active = role === r;
                      return (
                        <button
                          type="button"
                          key={r}
                          onClick={() => setRole(r)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm capitalize transition-colors ${
                            active
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" /> {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label htmlFor="su-name">Name</Label>
                  <Input id="su-name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="su-pw">Password</Label>
                  <Input
                    id="su-pw"
                    name="password"
                    type="password"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
