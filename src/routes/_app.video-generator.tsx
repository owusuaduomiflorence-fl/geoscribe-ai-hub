import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Film, Image as ImageIcon, Layers, Upload, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LessonPlayer } from "@/components/LessonPlayer";

export const Route = createFileRoute("/_app/video-generator")({
  component: VideoGen,
  head: () => ({
    meta: [
      { title: "Videos — Geoguide AI" },
      { name: "description", content: "Upload MP4 lesson videos, embed YouTube or Vimeo, or generate AI motion videos for any geography topic." },
      { property: "og:title", content: "Videos — Geoguide AI" },
      { property: "og:description", content: "Upload, embed, or AI-generate geography lesson videos." },
      { property: "og:url", content: "https://geoscribe-ai-hub.lovable.app/video-generator" },
    ],
    links: [{ rel: "canonical", href: "https://geoscribe-ai-hub.lovable.app/video-generator" }],
  }),
});

type Tab = "upload" | "embed" | "ai";
type AiMode = "clip" | "lesson" | "storyboard";

// Convert YouTube / Vimeo URL → embed URL. Returns null if unrecognized.
function toEmbedUrl(raw: string): string | null {
  const url = raw.trim();
  // YouTube
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

function VideoGen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("upload");

  const { data: history } = useQuery({
    queryKey: ["videos", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_videos")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const del = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    await supabase.from("generated_videos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["videos"] });
  };

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">Videos</h1>
      <p className="text-muted-foreground mt-2 max-w-2xl">
        Upload your own lesson videos, embed from YouTube or Vimeo, or generate motion videos with AI.
      </p>

      <div className="mt-6 inline-flex rounded-lg border border-border bg-card p-1 gap-1">
        <TabBtn active={tab === "upload"} onClick={() => setTab("upload")} icon={Upload} label="Upload MP4" />
        <TabBtn active={tab === "embed"} onClick={() => setTab("embed")} icon={Link2} label="YouTube / Vimeo" />
        <TabBtn active={tab === "ai"} onClick={() => setTab("ai")} icon={Sparkles} label="AI generate" />
      </div>

      <div className="mt-4">
        {tab === "upload" && <UploadPanel onDone={() => qc.invalidateQueries({ queryKey: ["videos"] })} />}
        {tab === "embed" && <EmbedPanel onDone={() => qc.invalidateQueries({ queryKey: ["videos"] })} />}
        {tab === "ai" && <AiPanel onDone={() => qc.invalidateQueries({ queryKey: ["videos"] })} />}
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
        {(history ?? []).map((v: any) => (
          <div key={v.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{v.prompt}</h3>
                <span className="text-xs text-muted-foreground">
                  {v.kind} · {new Date(v.created_at).toLocaleDateString()}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => del(v.id)}>
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
            {v.kind === "lesson" && Array.isArray(v.clips) && <LessonPlayer clips={v.clips as any} />}
            {(v.kind === "storyboard" || (!v.kind && v.scenes)) && Array.isArray(v.scenes) && (
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
        {(!history || history.length === 0) && (
          <div className="text-sm text-muted-foreground">No videos yet.</div>
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
function UploadPanel({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!user || !file || !title.trim()) return toast.error("Pick a file and add a title");
    if (file.size > 100 * 1024 * 1024) return toast.error("Max 100MB");
    setBusy(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("lesson-videos").upload(path, file, {
        contentType: file.type || "video/mp4",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("lesson-videos").getPublicUrl(path);
      const { error } = await supabase.from("generated_videos").insert({
        user_id: user.id,
        prompt: title.trim(),
        kind: "upload",
        status: "completed",
        video_url: pub.publicUrl,
      });
      if (error) throw error;
      toast.success("Video uploaded");
      setFile(null); setTitle("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-5 space-y-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Video title (e.g. The Water Cycle — JHS 2)" />
      <input
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
      />
      <p className="text-xs text-muted-foreground">MP4, WebM or MOV · up to 100MB. Audio is preserved.</p>
      <Button onClick={upload} disabled={busy || !file || !title.trim()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
        Upload video
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

  const save = async () => {
    if (!user) return;
    const embed = toEmbedUrl(url);
    if (!embed) return toast.error("Paste a YouTube or Vimeo URL");
    if (!title.trim()) return toast.error("Add a title");
    setBusy(true);
    try {
      const { error } = await supabase.from("generated_videos").insert({
        user_id: user.id,
        prompt: desc.trim() ? `${title.trim()} — ${desc.trim()}` : title.trim(),
        kind: "embed",
        status: "completed",
        video_url: embed,
      });
      if (error) throw error;
      toast.success("Video added");
      setUrl(""); setTitle(""); setDesc("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-5 space-y-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description (optional)" rows={2} />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=… or https://vimeo.com/…" />
      <Button onClick={save} disabled={busy || !url.trim() || !title.trim()}>
        <Link2 className="h-4 w-4 mr-1" /> Add video
      </Button>
    </div>
  );
}

/* ---------------- AI generate ---------------- */
function AiPanel({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<AiMode>("clip");
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!user || !prompt.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-video", { body: { prompt: prompt.trim(), mode } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const insertRow: Record<string, unknown> = { user_id: user.id, prompt: prompt.trim(), kind: data.kind, status: "completed" };
      if (data.kind === "storyboard") { insertRow.scenes = data.scenes; insertRow.poster_url = data.poster_url; }
      else if (data.kind === "clip") { insertRow.video_url = data.video_url; insertRow.clips = data.clips; }
      else if (data.kind === "lesson") { insertRow.clips = data.clips; }
      const { error: insErr } = await supabase.from("generated_videos").insert(insertRow as never);
      if (insErr) throw insErr;
      toast.success(mode === "storyboard" ? "Storyboard ready" : "Video ready");
      setPrompt("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ModeCard active={mode === "clip"} onClick={() => setMode("clip")} icon={Film} title="Single clip" desc="One ~8s motion video." />
        <ModeCard active={mode === "lesson"} onClick={() => setMode("lesson")} icon={Layers} title="Multi-clip lesson" desc="3 motion clips back-to-back." />
        <ModeCard active={mode === "storyboard"} onClick={() => setMode("storyboard")} icon={ImageIcon} title="Storyboard" desc="4 still images with captions." />
      </div>
      <div className="rounded-2xl border border-border bg-gradient-card p-5 flex flex-col md:flex-row gap-3">
        <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. The water cycle explained for JHS students" className="flex-1" />
        <Button onClick={generate} disabled={busy || !prompt.trim()} size="lg">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Generate</>}
        </Button>
      </div>
      {mode !== "storyboard" && <p className="text-xs text-muted-foreground">Motion video can take 30–90 seconds.</p>}
    </div>
  );
}

function ModeCard({ active, onClick, icon: Icon, title, desc }: { active: boolean; onClick: () => void; icon: typeof Film; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-card/80"}`}
    >
      <Icon className="h-5 w-5 mb-2 text-primary" />
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}
