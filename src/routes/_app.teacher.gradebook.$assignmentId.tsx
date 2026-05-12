import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { TeacherGuard } from "@/components/TeacherGuard";

export const Route = createFileRoute("/_app/teacher/gradebook/$assignmentId")({
  component: () => <TeacherGuard><GB /></TeacherGuard>,
});

function GB() {
  const { assignmentId } = Route.useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from("assignments").select("*").eq("id", assignmentId).single(),
      supabase.from("submissions").select("*").eq("assignment_id", assignmentId),
    ]);
    setAssignment(a); setSubs(s ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, [assignmentId]);

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!assignment) return <div className="p-10">Not found</div>;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <button className="text-xs text-muted-foreground mb-4" onClick={() => navigate({ to: "/teacher/assignments" })}>← Back</button>
      <h1 className="font-display text-2xl font-semibold mb-2">{assignment.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">{subs.length} submission(s)</p>

      <div className="space-y-2">
        {subs.map((s) => (
          <SubRow key={s.id} sub={s} assignment={assignment} onChanged={load} />
        ))}
        {!subs.length && <div className="text-sm text-muted-foreground">No submissions yet.</div>}
      </div>
    </div>
  );
}

function SubRow({ sub, assignment, onChanged }: { sub: any; assignment: any; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState<Record<number, number>>({});
  const questions = (assignment.payload?.questions ?? []) as any[];
  const answers = (sub.answers ?? {}) as Record<string, string>;

  const shortQs = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q.type === "short");

  useEffect(() => {
    const init: Record<number, number> = {};
    shortQs.forEach(({ i }) => { init[i] = sub.manual_breakdown?.[i] ?? 0; });
    setManual(init);
  }, [sub.id]);

  const saveScore = async () => {
    const manualSum = Object.values(manual).reduce((a, b) => a + (b || 0), 0);
    const total = (sub.auto_score || 0) + manualSum;
    const { error } = await supabase
      .from("submissions")
      .update({ manual_score: manualSum, total_score: total, status: "graded", graded_at: new Date().toISOString() })
      .eq("id", sub.id);
    if (error) return toast.error(error.message);
    toast.success("Graded");
    onChanged();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-muted-foreground">Student {sub.student_id.slice(0, 8)}</div>
          <div className="text-sm">
            Auto: <b>{sub.auto_score ?? 0}</b> + Manual: <b>{sub.manual_score ?? 0}</b> = <b>{sub.total_score ?? 0}</b> / {sub.max_score ?? 0}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>{open ? "Hide" : "Review"}</Button>
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="text-sm border-t border-border pt-3">
              <div className="font-medium">Q{i + 1}. {q.question}</div>
              <div className="text-muted-foreground">Answer: {answers[String(i)] || <i>blank</i>}</div>
              {q.type === "mcq" ? (
                <div className="text-xs">Correct: {q.correct_answer} {answers[String(i)] === q.correct_answer ? "✅" : "❌"}</div>
              ) : (
                <div className="flex items-center gap-2 text-xs mt-1">
                  Sample: <i>{q.correct_answer}</i> • Score:
                  <Input
                    type="number" min={0} max={q.points} className="w-20 h-7"
                    value={manual[i] ?? 0}
                    onChange={(e) => setManual((m) => ({ ...m, [i]: Math.max(0, Math.min(q.points, Number(e.target.value) || 0)) }))}
                  />
                  / {q.points}
                </div>
              )}
            </div>
          ))}
          <Button size="sm" onClick={saveScore}><Save className="h-4 w-4 mr-1" /> Save grade</Button>
        </div>
      )}
    </div>
  );
}
