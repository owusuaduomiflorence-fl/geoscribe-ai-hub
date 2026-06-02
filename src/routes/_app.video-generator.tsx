import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Link2, Trash2, CheckCircle2, AlertCircle, Video as VideoIcon, Search, Play, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/video-generator")({
  component: VideoGen,
  head: () => ({
    meta: [
      { title: "Videos — Geoguide AI" },
      { name: "description", content: "Upload MP4 lesson videos or embed YouTube and Vimeo links. Plays directly in the browser with full audio." },
      { property: "og:title", content: "Videos — Geoguide AI" },
      { property: "og:description", content: "Upload or embed geography lesson videos." },
      { property: "og:url", content: "https://geoscribe-ai-hub.lovable.app/video-generator" },
    ],
    links: [{ rel: "canonical", href: "https://geoscribe-ai-hub.lovable.app/video-generator" }],
  }),
});

type Tab = "upload" | "embed";

// Convert YouTube / Vimeo URL → embed URL. Returns null if unrecognized.
function toEmbedUrl(raw: string): string | null {
  const url = raw.trim();
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

function VideoGen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("upload");

  const { data: history, isLoading } = useQuery({
    queryKey: ["videos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_videos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["videos"] });

  const del = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    const { error } = await supabase.from("generated_videos").delete().eq("id", id);
    if (error) return toast.error("Could not delete video");
    toast.success("Video deleted");
    refresh();
  };

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">Videos</h1>
      <p className="text-muted-foreground mt-2 max-w-2xl">
        Upload a lesson video (MP4/WebM/MOV) or paste a YouTube / Vimeo link. Videos play directly in the browser with full audio.
      </p>

      <div className="mt-6 inline-flex rounded-lg border border-border bg-card p-1 gap-1">
        <TabBtn active={tab === "upload"} onClick={() => setTab("upload")} icon={Upload} label="Upload MP4" />
        <TabBtn active={tab === "embed"} onClick={() => setTab("embed")} icon={Link2} label="YouTube / Vimeo" />
      </div>

      <div className="mt-4">
        {tab === "upload" && <UploadPanel onDone={refresh} />}
        {tab === "embed" && <EmbedPanel onDone={refresh} />}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your videos</h2>
          {history && history.length > 0 && (
            <span className="text-xs text-muted-foreground">{history.length} total</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your videos…
          </div>
        ) : !history || history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <VideoIcon className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No videos yet. Upload an MP4 or paste a YouTube link above to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {history.map((v: any) => (
              <div key={v.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{v.prompt}</h3>
                    <span className="text-xs text-muted-foreground">
                      {v.kind} · {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => del(v.id)} aria-label="Delete video">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {v.kind === "embed" && v.video_url && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={v.video_url}
                      title={v.prompt}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {(v.kind === "upload" || v.kind === "clip") && v.video_url && (
                  <video src={v.video_url} controls playsInline className="w-full aspect-video rounded-lg bg-black" />
                )}
                {v.kind === "storyboard" && Array.isArray(v.scenes) && (
                  <div className="grid grid-cols-2 gap-2">
                    {(v.scenes as any[]).map((s, i) => (
                      <div key={i} className="rounded-lg overflow-hidden border border-border">
                        <img src={s.image_url} alt={s.caption} className="w-full aspect-square object-cover" />
                        <div className="p-2 text-xs text-muted-foreground">{s.caption}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Upload; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ---------------- Upload ---------------- */
const MAX_MB = 100;
const ALLOWED = ["video/mp4", "video/webm", "video/quicktime"];

function UploadPanel({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = (f: File | null) => {
    setError(null);
    if (!f) { setFile(null); return; }
    if (!ALLOWED.includes(f.type) && !/\.(mp4|webm|mov)$/i.test(f.name)) {
      setError("Unsupported format. Use MP4, WebM or MOV.");
      setFile(null);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_MB}MB.`);
      setFile(null);
      return;
    }
    setFile(f);
  };

  const upload = async () => {
    setError(null);
    if (!user) return setError("You must be signed in to upload.");
    if (!title.trim()) return setError("Please add a title.");
    if (!file) return setError("Please choose a video file.");
    setBusy(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("lesson-videos").upload(path, file, {
        contentType: file.type || "video/mp4",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("lesson-videos").getPublicUrl(path);
      const { error: insErr } = await supabase.from("generated_videos").insert({
        user_id: user.id,
        prompt: title.trim(),
        kind: "upload",
        status: "completed",
        video_url: pub.publicUrl,
      });
      if (insErr) throw insErr;
      toast.success("Video uploaded — added to your library");
      setFile(null); setTitle("");
      const input = document.getElementById("video-file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-5 space-y-3">
      <div>
        <label className="text-sm font-medium block mb-1">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Water Cycle — JHS 2" />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Video file</label>
        <input
          id="video-file-input"
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
        />
        <p className="text-xs text-muted-foreground mt-1">MP4, WebM or MOV · up to {MAX_MB}MB. Audio is preserved.</p>
        {file && (
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB
          </p>
        )}
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <Button onClick={upload} disabled={busy || !file || !title.trim()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
        {busy ? "Uploading…" : "Upload video"}
      </Button>
    </div>
  );
}

/* ---------------- Embed ---------------- */
function EmbedPanel({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = toEmbedUrl(url);

  const save = async () => {
    setError(null);
    if (!user) return setError("You must be signed in.");
    if (!title.trim()) return setError("Please add a title.");
    if (!preview) return setError("Paste a valid YouTube or Vimeo URL.");
    setBusy(true);
    try {
      const { error: insErr } = await supabase.from("generated_videos").insert({
        user_id: user.id,
        prompt: desc.trim() ? `${title.trim()} — ${desc.trim()}` : title.trim(),
        kind: "embed",
        status: "completed",
        video_url: preview,
      });
      if (insErr) throw insErr;
      toast.success("Video added to your library");
      setUrl(""); setTitle(""); setDesc("");
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save video";
      setError(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-5 space-y-3">
      <div>
        <label className="text-sm font-medium block mb-1">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Description (optional)</label>
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" rows={2} />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">YouTube or Vimeo URL</label>
        <Input
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          placeholder="https://youtube.com/watch?v=… or https://vimeo.com/…"
        />
        {url && !preview && (
          <p className="mt-1 text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Not a recognised YouTube or Vimeo link.
          </p>
        )}
        {preview && (
          <div className="mt-3 aspect-video rounded-lg overflow-hidden bg-black">
            <iframe src={preview} title="Preview" className="w-full h-full" allowFullScreen />
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <Button onClick={save} disabled={busy || !preview || !title.trim()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
        {busy ? "Saving…" : "Add video"}
      </Button>
    </div>
  );
}
