import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { School, LogIn } from "lucide-react";

export const Route = createFileRoute("/_app/classes")({ component: StudentClasses });

function StudentClasses() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: classes } = useQuery({
    queryKey: ["my-classes"],
    queryFn: async () => {
      const { data: members } = await supabase.from("class_members").select("class_id, joined_at");
      const ids = (members ?? []).map((m) => m.class_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("classes").select("*").in("id", ids);
      return data ?? [];
    },
  });

  const join = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("join_class_with_code", { _code: code.trim().toUpperCase() });
      if (error) throw error;
      toast.success("Joined class");
      setCode("");
      qc.invalidateQueries({ queryKey: ["my-classes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl font-semibold mb-2">My Classes</h1>
      <p className="text-muted-foreground mb-6">Join a class with a code from your teacher.</p>

      <div className="rounded-xl border border-border bg-card p-4 flex gap-2 mb-8">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter 6-character class code"
          maxLength={6}
          className="font-mono tracking-widest uppercase"
        />
        <Button onClick={join} disabled={busy || !code.trim()}>
          <LogIn className="h-4 w-4 mr-1" /> Join
        </Button>
      </div>

      <div className="space-y-2">
        {(classes ?? []).map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <School className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-semibold">{c.name}</div>
              {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
            </div>
            <span className="text-xs font-mono text-muted-foreground">{c.join_code}</span>
          </div>
        ))}
        {!classes?.length && <div className="text-sm text-muted-foreground">You haven't joined any classes yet.</div>}
      </div>
    </div>
  );
}
