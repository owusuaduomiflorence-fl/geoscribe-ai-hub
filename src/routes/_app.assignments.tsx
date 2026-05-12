import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_app/assignments")({ component: Asg });

function Asg() {
  const { data: assignments } = useQuery({
    queryKey: ["student-assignments"],
    queryFn: async () => (await supabase.from("assignments").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: subs } = useQuery({
    queryKey: ["my-subs"],
    queryFn: async () => (await supabase.from("submissions").select("*")).data ?? [],
  });
  const subMap = new Map((subs ?? []).map((s) => [s.assignment_id, s]));

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl font-semibold mb-6">My Assignments</h1>
      <div className="space-y-2">
        {(assignments ?? []).map((a: any) => {
          const s = subMap.get(a.id);
          return (
            <Link key={a.id} to="/assignments/$id" params={{ id: a.id }} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-card/80">
              <ClipboardList className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="font-semibold">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {a.type} {a.due_date ? `• due ${new Date(a.due_date).toLocaleDateString()}` : ""}
                </div>
              </div>
              <div className="text-xs">
                {s ? (
                  s.status === "graded" ? <span className="text-primary">Graded: {s.total_score}/{s.max_score}</span>
                  : <span className="text-muted-foreground">Submitted</span>
                ) : <span className="text-amber-400">Pending</span>}
              </div>
            </Link>
          );
        })}
        {!assignments?.length && <div className="text-sm text-muted-foreground">No assignments yet. Join a class to receive assignments.</div>}
      </div>
    </div>
  );
}
