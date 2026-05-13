import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Film, Image as ImageIcon, Layers } from "lucide-react";
import { toast } from "sonner";
import { LessonPlayer } from "@/components/LessonPlayer";

export const Route = createFileRoute("/_app/video-generator")({
  component: VideoGen,
  head: () => ({
    meta: [
      { title: "Video Generator — Geoguide AI" },
      { name: "description", content: "Generate motion video lessons, multi-clip explainers, or storyboards for any geography topic with Geoguide AI." },
      { property: "og:title", content: "Video Generator — Geoguide AI" },
      { property: "og:description", content: "Motion video lessons for geography." },
      { property: "og:url", content: "https://geoscribe-ai-hub.lovable.app/video-generator" },
    ],
    links: [{ rel: "canonical", href: "https://geoscribe-ai-hub.lovable.app/video-generator" }],
  }),
});

type Mode = "clip" | "lesson" | "storyboard";

function VideoGen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<Mode>("clip");
  const [busy, setBusy] = useState(false);

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

  const generate = async () => {
    if (!prompt.trim() || !user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: { prompt: prompt.trim(), mode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const insertRow: Record<string, unknown> = {
        user_id: user.id,
        prompt: prompt.trim(),
        kind: data.kind,
        status: "completed",
      };
      if (data.kind === "storyboard") {
        insertRow.scenes = data.scenes;
        insertRow.poster_url = data.poster_url;
      } else if (data.kind === "clip") {
        insertRow.video_url = data.video_url;
        insertRow.clips = data.clips;
      } else if (data.kind === "lesson") {
        insertRow.clips = data.clips;
      }
      const { error: insErr } = await supabase.from("generated_videos").insert(insertRow as never);
      if (insErr) throw insErr;
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(mode === "storyboard" ? "Storyboard ready" : "Video ready");
      setPrompt("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">Video Generator</h1>
      <p className="text-muted-foreground mt-2 max-w-2xl">
        Generate real motion videos for any geography lesson. Choose a mode that matches your need.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <ModeCard
          active={mode === "clip"}
          onClick={() => setMode("clip")}
          icon={Film}
          title="Single clip"
          desc="One ~8s motion video. Fast."
        />
        <ModeCard
          active={mode === "lesson"}
          onClick={() => setMode("lesson")}
          icon={Layers}
          title="Multi-clip lesson"
          desc="3 motion clips played back-to-back."
        />
        <ModeCard
          active={mode === "storyboard"}
          onClick={() => setMode("storyboard")}
          icon={ImageIcon}
          title="Storyboard"
          desc="4 still images with captions. Cheapest."
        />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-gradient-card p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. The water cycle explained for JHS students"
            aria-label="Video prompt"
            className="flex-1 rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={generate} disabled={busy || !prompt.trim()} size="lg" aria-label="Generate video">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Generate</>}
          </Button>
        </div>
        {mode !== "storyboard" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Motion video can take 30–90 seconds. Hang tight.
          </p>
        )}
      </div>

      <div className="mt-10 space-y-8">
        {(history ?? []).map((v: any) => (
          <div key={v.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{v.prompt}</h3>
              <span className="text-xs text-muted-foreground">
                {new Date(v.created_at).toLocaleString()}
              </span>
            </div>

            {v.kind === "clip" && v.video_url && (
              <video src={v.video_url} controls className="w-full aspect-video rounded-lg bg-black" />
            )}
            {v.kind === "lesson" && Array.isArray(v.clips) && (
              <LessonPlayer clips={v.clips as any} />
            )}
            {(v.kind === "storyboard" || (!v.kind && v.scenes)) && Array.isArray(v.scenes) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

function ModeCard({
  active, onClick, icon: Icon, title, desc,
}: { active: boolean; onClick: () => void; icon: typeof Film; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-colors ${
        active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-card/80"
      }`}
    >
      <Icon className="h-5 w-5 mb-2 text-primary" />
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}
