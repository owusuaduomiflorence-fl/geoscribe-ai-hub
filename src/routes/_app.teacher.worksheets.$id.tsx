import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Printer, Save } from "lucide-react";
import { TeacherGuard } from "@/components/TeacherGuard";

export const Route = createFileRoute("/_app/teacher/worksheets/$id")({ component: () => <TeacherGuard><EditWS /></TeacherGuard> });

function EditWS() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("worksheets").select("*").eq("id", id).single();
      if (data) { setTitle(data.title); setContent(data.content || ""); }
      setLoading(false);
    })();
  }, [id]);

  const save = async () => {
    const { error } = await supabase.from("worksheets").update({ title, content }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto print:p-0 print:max-w-none">
      <div className="print:hidden">
        <button className="text-xs text-muted-foreground mb-4" onClick={() => navigate({ to: "/teacher/worksheets" })}>← Back</button>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-2xl font-semibold mb-4 h-auto py-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={20} className="font-mono text-xs" />
          <div className="rounded-xl border border-border bg-card p-4 prose prose-invert max-w-none text-sm overflow-y-auto" style={{ maxHeight: 600 }}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print / Save PDF</Button>
        </div>
      </div>

      {/* Print-only view */}
      <div className="hidden print:block prose max-w-none text-black">
        <h1>{title}</h1>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
