import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, Printer, Save } from "lucide-react";
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

  const downloadPdf = () => {
    // Split worksheet markdown on "## Answer Key" (or similar) so the answer key gets its own page.
    const splitRegex = /^#+\s*answer\s*key/im;
    const m = content.match(splitRegex);
    const questionsBody = m ? content.slice(0, m.index!).trim() : content.trim();
    const answersBody = m ? content.slice(m.index!).replace(splitRegex, "").trim() : "";

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;

    const renderPage = (heading: string, body: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(heading, margin, margin);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      // Strip basic markdown for clean PDF text
      const clean = body
        .replace(/^#+\s*/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1");
      const lines = doc.splitTextToSize(clean, maxWidth);
      let y = margin + 28;
      const lh = 15;
      for (const line of lines) {
        if (y > pageHeight - margin) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += lh;
      }
    };

    renderPage(title || "Worksheet", questionsBody);
    if (answersBody) {
      doc.addPage();
      renderPage("Answer Key — " + (title || "Worksheet"), answersBody);
    }

    const safe = (title || "worksheet").replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
    doc.save(`${safe}.pdf`);
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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
          <Button variant="outline" onClick={downloadPdf}><Download className="h-4 w-4 mr-1" /> Download PDF (with answer key)</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: the PDF puts questions on page 1 and the answer key on page 2. To trigger the split, include a heading like <code>## Answer Key</code> in your content.
        </p>
      </div>

      {/* Print-only view */}
      <div className="hidden print:block prose max-w-none text-black">
        <h1>{title}</h1>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
