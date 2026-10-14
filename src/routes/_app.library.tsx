import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addKnowledgeDoc } from "@/lib/rag.functions";

export const Route = createFileRoute("/_app/library")({
  head: () => ({
    meta: [
      { title: "Study Library — Geoguide AI" },
      { name: "description", content: "Upload geography notes so GeoGuide's chat, coach and GeoSnap answer from your own materials." },
      { property: "og:title", content: "Study Library — Geoguide AI" },
      { property: "og:description", content: "Add notes and syllabus documents for AI answers with sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

async function readFile(f: File): Promise<string> {
  if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const c = await (await doc.getPage(i)).getTextContent();
      pages.push(c.items.map((it: any) => it.str).join(" "));
    }
    return pages.join("\n\n");
  }
  return f.text();
}

function LibraryPage() {
  const add = useServerFn(addKnowledgeDoc);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      setText(await readFile(f));
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    } catch {
      toast.error("Could not read that file.");
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const r = await add({ data: { title, text, shared } });
      toast.success(`Added to library (${r.chunks} sections)`);
      setTitle(""); setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <header>
        <h1 className="font-display text-3xl font-bold">📚 Study Library</h1>
        <p className="text-muted-foreground">Add notes, syllabus PDFs or textbook pages. The chatbot, coach and GeoSnap will look here first and show their sources. Built-in Ghana notes and your snaps are included automatically.</p>
      </header>
      <section className="space-y-3 rounded-2xl border bg-card p-4 md:p-6">
        <input type="file" accept=".pdf,.txt,.md" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. SHS 1 Climate notes)" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder="…or paste your notes here" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Share with all students (teachers only)
        </label>
        <Button onClick={save} disabled={busy || !title.trim() || text.trim().length < 20}>{busy ? "Adding…" : "Add to library"}</Button>
      </section>
    </div>
  );
}
