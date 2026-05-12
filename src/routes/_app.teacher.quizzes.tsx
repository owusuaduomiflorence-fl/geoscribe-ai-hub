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

export const Route = createFileRoute("/_app/teacher/quizzes")({ component: () => <TeacherGuard><Quizzes /></TeacherGuard> });

function Quizzes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: quizzes } = useQuery({
    queryKey: ["quizzes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const generate = async () => {
    if (!topic.trim() || !user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", { body: { topic: topic.trim(), count: 8 } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const { error: insErr } = await supabase.from("quizzes").insert({
        teacher_id: user.id, title: data.title || topic, topic: topic.trim(), questions: data.questions || [],
      });
      if (insErr) throw insErr;
      setTopic("");
      qc.invalidateQueries({ queryKey: ["quizzes"] });
      toast.success("Quiz generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete quiz?")) return;
    await supabase.from("quizzes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["quizzes"] });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="font-display text-3xl font-semibold mb-6">Quizzes</h1>
      <div className="rounded-xl border border-border bg-card p-4 mb-8 flex gap-2">
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic, e.g. Climate of West Africa" />
        <Button onClick={generate} disabled={busy || !topic.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Generate quiz</>}
        </Button>
      </div>

      <div className="space-y-2">
        {(quizzes ?? []).map((q: any) => (
          <div key={q.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex-1">
              <Link to="/teacher/quizzes/$id" params={{ id: q.id }} className="font-semibold hover:underline">{q.title}</Link>
              <div className="text-xs text-muted-foreground">{Array.isArray(q.questions) ? q.questions.length : 0} questions</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => del(q.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {!quizzes?.length && <div className="text-sm text-muted-foreground">No quizzes yet.</div>}
      </div>
    </div>
  );
}
