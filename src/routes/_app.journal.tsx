import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/journal")({
  component: Journal,
  head: () => ({
    meta: [
      { title: "Journal — Geoguide AI" },
      { name: "description", content: "Save and revisit personal study notes from your geography lessons in your Geoguide AI journal." },
      { property: "og:title", content: "Journal — Geoguide AI" },
      { property: "og:description", content: "Personal geography study notes." },
      { property: "og:url", content: "https://geoscribe-ai-hub.lovable.app/journal" },
    ],
    links: [{ rel: "canonical", href: "https://geoscribe-ai-hub.lovable.app/journal" }],
  }),
});

function Journal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id?: string; title: string; content: string; tags: string } | null>(null);
  const [search, setSearch] = useState("");

  const { data: entries } = useQuery({
    queryKey: ["journal", user?.id, search],
    queryFn: async () => {
      let q = supabase
        .from("journal_entries")
        .select("*")
        .order("created_at", { ascending: false });
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const save = async () => {
    if (!editing || !user) return;
    const tags = editing.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (editing.id) {
      const { error } = await supabase
        .from("journal_entries")
        .update({
          title: editing.title,
          content: editing.content,
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("journal_entries").insert({
        user_id: user.id,
        title: editing.title || "Untitled",
        content: editing.content,
        tags,
      });
      if (error) return toast.error(error.message);
    }
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["journal"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    toast.success("Saved");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("journal_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["journal"] });
    toast.success("Deleted");
  };

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Journal</h1>
          <p className="text-muted-foreground mt-2">Save notes from your lessons.</p>
        </div>
        <Button
          onClick={() => setEditing({ title: "", content: "", tags: "" })}
          className="shadow-glow"
        >
          <Plus className="h-4 w-4 mr-1" /> New entry
        </Button>
      </div>

      <div className="mt-6 relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entries..."
          aria-label="Search journal entries"
          className="w-full pl-9 rounded-lg bg-card border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(entries ?? []).map((e) => (
          <div key={e.id} className="rounded-xl border border-border bg-card p-5 group">
            <div className="flex items-start justify-between gap-2">
              <button
                className="text-left flex-1"
                onClick={() => setEditing({ id: e.id, title: e.title, content: e.content, tags: (e.tags ?? []).join(", ") })}
              >
                <div className="font-semibold">{e.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(e.created_at).toLocaleDateString()}
                </div>
              </button>
              <button
                onClick={() => remove(e.id)}
                aria-label={`Delete entry ${e.title}`}
                className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
              {e.content}
            </p>
            {e.tags && e.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {e.tags.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-accent/30 text-accent-foreground">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {(!entries || entries.length === 0) && (
          <div className="col-span-full text-sm text-muted-foreground">No entries yet.</div>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-lg">{editing.id ? "Edit entry" : "New entry"}</h2>
            <input
              autoFocus
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="Title"
              aria-label="Entry title"
              className="mt-4 w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder="Write your notes..."
              aria-label="Entry content"
              rows={10}
              className="mt-3 w-full rounded-lg bg-background border border-border px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={editing.tags}
              onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
              placeholder="Tags (comma separated)"
              aria-label="Tags"
              className="mt-3 w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
