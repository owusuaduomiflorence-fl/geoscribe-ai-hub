import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { TeacherGuard } from "@/components/TeacherGuard";

type Question = { type: "mcq" | "short"; question: string; options?: string[]; correct_answer: string; points: number };

export const Route = createFileRoute("/_app/teacher/quizzes/$id")({ component: () => <TeacherGuard><EditQuiz /></TeacherGuard> });

function EditQuiz() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("id", id).single();
      if (data) {
        setTitle(data.title);
        setQuestions(((data.questions as any) ?? []) as Question[]);
      }
      setLoading(false);
    })();
  }, [id]);

  const save = async () => {
    const { error } = await supabase.from("quizzes").update({ title, questions: questions as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  const update = (i: number, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const remove = (i: number) => setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  const add = () =>
    setQuestions((qs) => [...qs, { type: "mcq", question: "", options: ["", "", "", ""], correct_answer: "", points: 1 }]);

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <button className="text-xs text-muted-foreground mb-4" onClick={() => navigate({ to: "/teacher/quizzes" })}>← Back</button>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-2xl font-semibold mb-6 h-auto py-3" />

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Q{i + 1}</span>
                <select
                  value={q.type}
                  onChange={(e) => update(i, { type: e.target.value as "mcq" | "short" })}
                  className="bg-background border border-border rounded px-2 py-1 text-xs"
                >
                  <option value="mcq">Multiple choice</option>
                  <option value="short">Short answer</option>
                </select>
                <input
                  type="number" min={1} value={q.points}
                  onChange={(e) => update(i, { points: Number(e.target.value) || 1 })}
                  className="w-16 bg-background border border-border rounded px-2 py-1 text-xs"
                /> pts
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Textarea value={q.question} onChange={(e) => update(i, { question: e.target.value })} placeholder="Question" rows={2} />
            {q.type === "mcq" ? (
              <div className="space-y-2">
                {(q.options ?? ["", "", "", ""]).map((opt, oi) => (
                  <div key={oi} className="flex gap-2 items-center">
                    <input
                      type="radio"
                      checked={q.correct_answer === opt && opt !== ""}
                      onChange={() => update(i, { correct_answer: opt })}
                    />
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const opts = [...(q.options ?? ["", "", "", ""])];
                        const oldVal = opts[oi];
                        opts[oi] = e.target.value;
                        update(i, { options: opts, correct_answer: q.correct_answer === oldVal ? e.target.value : q.correct_answer });
                      }}
                      placeholder={`Option ${oi + 1}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Input value={q.correct_answer} onChange={(e) => update(i, { correct_answer: e.target.value })} placeholder="Expected/sample answer" />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-6">
        <Button variant="outline" onClick={add}><Plus className="h-4 w-4 mr-1" /> Add question</Button>
        <Button onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
      </div>
    </div>
  );
}
