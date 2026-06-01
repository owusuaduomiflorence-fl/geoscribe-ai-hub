import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { displayNameFor } from "@/lib/display-name";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [{ title: "Your profile — Geoguide AI" }],
  }),
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pref, setPref] = useState<"full" | "first">("full");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setPref(profile.display_preference === "first" ? "first" : "full");
    }
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const display_name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null;
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        display_preference: pref,
        display_name,
      });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const preview = displayNameFor(
    { first_name: firstName, last_name: lastName, display_preference: pref },
    user?.email,
    "auto",
    "Friend",
  );

  if (isLoading) {
    return (
      <div className="p-10 text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <User className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Your profile</h1>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Tell us how you'd like to be greeted across Geoguide AI.
      </p>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <Label htmlFor="fn">First name</Label>
          <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Florence" />
        </div>
        <div>
          <Label htmlFor="ln">Last name</Label>
          <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Owusu" />
        </div>
        <div>
          <Label>Display name preference</Label>
          <div className="mt-2 flex gap-2">
            {(["full", "first"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPref(p)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  pref === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "full" ? "Full name" : "First name only"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <span className="text-muted-foreground">Preview:</span>{" "}
          <span className="font-semibold">{preview}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save changes
          </Button>
          <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
            Cancel
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Signed in as {user?.email}
      </p>
    </div>
  );
}
