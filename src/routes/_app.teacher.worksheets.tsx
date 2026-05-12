import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { TeacherGuard } from "@/components/TeacherGuard";

export const Route = createFileRoute("/_app/teacher/worksheets")({ component: () => <TeacherGuard><Worksheets /></TeacherGuard> });

function Worksheets() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["worksheets", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("worksheets").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const generate = async () => {
    if (!topic.trim() || !user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-worksheet", { body: { topic: topic.trim() } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const { error: insErr } = await supabase.from("worksheets").insert({
        teacher_id: user.id, title: data.title || topic, topic: topic.trim(), content: data.content || "",
      });
      if (insErr) throw insErr;
      setTopic("");
      qc.invalidateQueries({ queryKey: ["worksheets"] });
      toast.success("Worksheet ready");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete worksheet?")) return;
    await supabase.from("worksheets").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["worksheets"] });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="font-display text-3xl font-semibold mb-6">Worksheets</h1>
      <div className="rounded-xl border border-border bg-card p-4 mb-8 flex gap-2">
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic, e.g. Vegetation zones of Ghana" />
        <Button onClick={generate} disabled={busy || !topic.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Generate</>}
        </Button>
      </div>

      <div className="space-y-2">
        {(items ?? []).map((w: any) => (
          <div key={w.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <Link to="/teacher/worksheets/$id" params={{ id: w.id }} className="flex-1 font-semibold hover:underline">{w.title}</Link>
            <Button variant="ghost" size="sm" onClick={() => del(w.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {!items?.length && <div className="text-sm text-muted-foreground">No worksheets yet.</div>}
      </div>
    </div>
  );
}
