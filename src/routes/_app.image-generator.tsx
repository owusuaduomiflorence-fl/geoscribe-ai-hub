import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/image-generator")({
  component: ImageGen,
  head: () => ({
    meta: [
      { title: "Image Generator — Geoguide AI" },
      { name: "description", content: "Generate vivid, classroom-ready geography illustrations on demand with the Geoguide AI image generator." },
      { property: "og:title", content: "Image Generator — Geoguide AI" },
      { property: "og:description", content: "On-demand geography illustrations." },
      { property: "og:url", content: "https://geoscribe-ai-hub.lovable.app/image-generator" },
    ],
    links: [{ rel: "canonical", href: "https://geoscribe-ai-hub.lovable.app/image-generator" }],
  }),
});

function ImageGen() {
  const { user, session } = useAuth();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState<string | null>(null);

  const { data: history } = useQuery({
    queryKey: ["images", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(24);
      return data ?? [];
    },
  });

  const generate = async () => {
    if (!prompt.trim() || !user || !session) return;
    setBusy(true);
    setLatest(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: prompt.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const url = data.imageUrl as string;
      setLatest(url);
      await supabase
        .from("generated_images")
        .insert({ user_id: user.id, prompt: prompt.trim(), image_url: url });
      qc.invalidateQueries({ queryKey: ["images"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Image generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">Image Generator</h1>
      <p className="text-muted-foreground mt-2">
        Generate vivid, classroom-ready illustrations for any geography concept.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-gradient-card p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Cross-section of a volcano with labelled magma chamber"
            aria-label="Image prompt"
            className="flex-1 rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={generate} disabled={busy || !prompt.trim()} size="lg" aria-label="Generate image">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Generate</>}
          </Button>
        </div>
      </div>

      {latest && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <img src={latest} alt={prompt} className="w-full rounded-lg" />
        </div>
      )}

      <h2 className="mt-12 text-xl font-semibold">Your gallery</h2>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(history ?? []).map((img) => (
          <div key={img.id} className="rounded-xl overflow-hidden border border-border bg-card group">
            <img src={img.image_url} alt={img.prompt} className="w-full aspect-square object-cover" />
            <div className="p-3 text-xs text-muted-foreground line-clamp-2">{img.prompt}</div>
          </div>
        ))}
        {(!history || history.length === 0) && (
          <div className="col-span-full text-sm text-muted-foreground">
            No images yet — generate your first one above.
          </div>
        )}
      </div>
    </div>
  );
}
