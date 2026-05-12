import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { TeacherGuard } from "@/components/TeacherGuard";

export const Route = createFileRoute("/_app/teacher/assignments")({ component: () => <TeacherGuard><Asg /></TeacherGuard> });

function Asg() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [type, setType] = useState<"quiz" | "worksheet">("quiz");
  const [refId, setRefId] = useState("");
  const [due, setDue] = useState("");

  const { data: classes } = useQuery({
    queryKey: ["t-classes", user?.id],
    queryFn: async () => (await supabase.from("classes").select("id,name")).data ?? [],
  });
  const { data: quizzes } = useQuery({
    queryKey: ["t-quizzes", user?.id],
    queryFn: async () => (await supabase.from("quizzes").select("id,title,questions")).data ?? [],
  });
  const { data: worksheets } = useQuery({
    queryKey: ["t-worksheets", user?.id],
    queryFn: async () => (await supabase.from("worksheets").select("id,title,content")).data ?? [],
  });
  const { data: assignments } = useQuery({
    queryKey: ["t-assignments", user?.id],
    queryFn: async () => (await supabase.from("assignments").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const refList = type === "quiz" ? quizzes : worksheets;

  const create = async () => {
    if (!user || !title || !classId || !refId) return toast.error("Fill all fields");
    let payload: any = null;
    if (type === "quiz") {
      const q = quizzes?.find((x: any) => x.id === refId);
      payload = { questions: q?.questions };
    } else {
      const w = worksheets?.find((x: any) => x.id === refId);
      payload = { content: w?.content };
    }
    const { error } = await supabase.from("assignments").insert({
      teacher_id: user.id, class_id: classId, type, ref_id: refId, title,
      due_date: due ? new Date(due).toISOString() : null, payload,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setRefId(""); setDue("");
    qc.invalidateQueries({ queryKey: ["t-assignments"] });
    toast.success("Assigned");
  };

  const del = async (id: string) => {
    if (!confirm("Delete assignment?")) return;
    await supabase.from("assignments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["t-assignments"] });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="font-display text-3xl font-semibold mb-6">Assignments</h1>

      <div className="rounded-xl border border-border bg-card p-4 mb-8 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title" />
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="bg-background border border-border rounded px-3 py-2 text-sm">
          <option value="">Select class…</option>
          {(classes ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={type} onChange={(e) => { setType(e.target.value as any); setRefId(""); }} className="bg-background border border-border rounded px-3 py-2 text-sm">
          <option value="quiz">Quiz</option>
          <option value="worksheet">Worksheet</option>
        </select>
        <select value={refId} onChange={(e) => setRefId(e.target.value)} className="bg-background border border-border rounded px-3 py-2 text-sm">
          <option value="">Select {type}…</option>
          {(refList ?? []).map((r: any) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
        <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
        <Button onClick={create}><Plus className="h-4 w-4 mr-1" /> Create assignment</Button>
      </div>

      <div className="space-y-2">
        {(assignments ?? []).map((a: any) => {
          const cls = classes?.find((c: any) => c.id === a.class_id);
          return (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <div className="flex-1">
                <Link to="/teacher/gradebook/$assignmentId" params={{ assignmentId: a.id }} className="font-semibold hover:underline">{a.title}</Link>
                <div className="text-xs text-muted-foreground">{cls?.name} • {a.type} {a.due_date ? `• due ${new Date(a.due_date).toLocaleDateString()}` : ""}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => del(a.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          );
        })}
        {!assignments?.length && <div className="text-sm text-muted-foreground">No assignments yet.</div>}
      </div>
    </div>
  );
}
