import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Q = { type: "mcq" | "short"; question: string; options?: string[]; correct_answer: string; points: number };

export const Route = createFileRoute("/_app/assignments/$id")({ component: Take });

function Take() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: s }] = await Promise.all([
        supabase.from("assignments").select("*").eq("id", id).single(),
        supabase.from("submissions").select("*").eq("assignment_id", id).maybeSingle(),
      ]);
      setAssignment(a);
      setSubmission(s);
      if (s?.answers) setAnswers(s.answers as any);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!assignment) return <div className="p-10">Not found</div>;

  const isQuiz = assignment.type === "quiz";
  const questions: Q[] = (assignment.payload?.questions ?? []) as Q[];
  const content: string = assignment.payload?.content ?? "";
  const submitted = !!submission;

  const submit = async () => {
    if (!user) return;
    let auto = 0; let max = 0;
    if (isQuiz) {
      questions.forEach((q, i) => {
        max += q.points;
        if (q.type === "mcq" && answers[String(i)] === q.correct_answer) auto += q.points;
      });
    }
    const { error } = await supabase.from("submissions").upsert({
      assignment_id: id, student_id: user.id, answers,
      auto_score: auto, manual_score: 0, total_score: auto, max_score: max,
      status: questions.some((q) => q.type === "short") ? "submitted" : "graded",
      graded_at: questions.some((q) => q.type === "short") ? null : new Date().toISOString(),
    }, { onConflict: "assignment_id,student_id" });
    if (error) return toast.error(error.message);
    toast.success("Submitted");
    navigate({ to: "/assignments" });
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <button className="text-xs text-muted-foreground mb-4" onClick={() => navigate({ to: "/assignments" })}>← Back</button>
      <h1 className="font-display text-2xl font-semibold mb-2">{assignment.title}</h1>
      {submitted && (
        <div className="text-sm text-muted-foreground mb-4">
          {submission.status === "graded"
            ? <>Score: <b>{submission.total_score}</b> / {submission.max_score}</>
            : <>Submitted — awaiting teacher review of short answers.</>}
        </div>
      )}

      {!isQuiz && (
        <div className="prose prose-invert max-w-none rounded-xl border border-border bg-card p-4">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}

      {isQuiz && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="font-medium mb-2">Q{i + 1}. {q.question} <span className="text-xs text-muted-foreground">({q.points}pt)</span></div>
              {q.type === "mcq" ? (
                <div className="space-y-2">
                  {(q.options ?? []).map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio" name={`q${i}`}
                        disabled={submitted}
                        checked={answers[String(i)] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [String(i)]: opt }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <Textarea
                  value={answers[String(i)] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [String(i)]: e.target.value }))}
                  disabled={submitted}
                  rows={3}
                  placeholder="Your answer…"
                />
              )}
            </div>
          ))}
          {!submitted && <Button onClick={submit}>Submit answers</Button>}
        </div>
      )}
    </div>
  );
}
