import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/video-generator")({ component: VideoGen });

type Scene = { caption: string; image_url: string };

function VideoGen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
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
        body: { prompt: prompt.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.from("generated_videos").insert({
        user_id: user.id,
        prompt: prompt.trim(),
        scenes: data.scenes,
        poster_url: data.poster_url,
        status: "completed",
      });
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Storyboard ready");
      setPrompt("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">Video Storyboards</h1>
      <p className="text-muted-foreground mt-2 max-w-2xl">
        Generate a 4-scene visual storyboard for any geography lesson — perfect for revising or
        teaching. (True full-motion video can be added later via an external service.)
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-gradient-card p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. The water cycle explained for JHS students"
            className="flex-1 rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={generate} disabled={busy || !prompt.trim()} size="lg">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Generate</>}
          </Button>
        </div>
      </div>

      <div className="mt-10 space-y-8">
        {(history ?? []).map((v) => (
          <div key={v.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{v.prompt}</h3>
              <span className="text-xs text-muted-foreground">
                {new Date(v.created_at).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {((v.scenes as Scene[]) ?? []).map((s, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-border">
                  <img src={s.image_url} alt={s.caption} className="w-full aspect-square object-cover" />
                  <div className="p-2 text-xs text-muted-foreground">{s.caption}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!history || history.length === 0) && (
          <div className="text-sm text-muted-foreground">No storyboards yet.</div>
        )}
      </div>
    </div>
  );
}
