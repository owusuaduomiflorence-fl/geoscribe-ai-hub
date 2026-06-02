// Supports three modes:
//   - clip: single 10s motion video
//   - lesson: 3 motion clips played back-to-back (client-side)
//   - storyboard: 4 still images with captions (fallback)
import { corsHeaders, requireUser } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function aiJSON(prompt: string) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You write short geography lesson scripts aligned with the GES syllabus. Reply with strict JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`AI gen failed ${r.status}`);
  const d = await r.json();
  return JSON.parse(d.choices[0].message.content);
}

async function aiImage(prompt: string): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) throw new Error(`image gen failed ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? "";
}

async function aiVideo(prompt: string): Promise<string> {
  // Lovable AI Gateway video generation (Veo via Gemini route)
  const r = await fetch("https://ai.gateway.lovable.dev/v1/video/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/veo-3-fast",
      prompt,
      aspect_ratio: "16:9",
      duration_seconds: 8,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`video gen failed ${r.status}: ${t}`);
  }
  const d = await r.json();
  // Try common shapes
  const url = d.video_url || d.url || d.data?.[0]?.url || d.output?.[0] || d.videos?.[0]?.url;
  if (!url) throw new Error("video gen returned no URL");
  return url as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const { prompt, mode = "clip" } = await req.json();
    if (!prompt) throw new Error("prompt required");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (mode === "clip") {
      const url = await aiVideo(
        `Educational geography video for GES syllabus students: ${prompt}. Clear narration-friendly visuals, classroom-appropriate.`
      );
      return new Response(
        JSON.stringify({ kind: "clip", video_url: url, poster_url: null, clips: [{ url, caption: prompt }], scenes: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "lesson") {
      const story = await aiJSON(
        `Plan a short 3-scene geography lesson video about: "${prompt}". Reply with JSON {"title": string, "scenes": [{"caption": string, "video_prompt": string}]}. Each video_prompt is a vivid, motion-rich scene description for an 8-second educational clip.`
      );
      const scenes = (story.scenes || []).slice(0, 3);
      const clips = await Promise.all(
        scenes.map(async (s: any) => ({
          caption: s.caption,
          url: await aiVideo(`Educational geography lesson scene: ${s.video_prompt}. Vivid motion, classroom-friendly.`),
        }))
      );
      return new Response(
        JSON.stringify({ kind: "lesson", title: story.title || prompt, clips, poster_url: null, scenes: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // storyboard fallback
    const story = await aiJSON(
      `Create a 4-scene storyboard for a geography explainer about: "${prompt}". Reply with JSON {"title": string, "scenes": [{"caption": string, "image_prompt": string}]}.`
    );
    const scenes = await Promise.all(
      (story.scenes || []).slice(0, 4).map(async (s: any) => ({
        caption: s.caption,
        image_url: await aiImage(`Educational geography illustration: ${s.image_prompt}. Vivid, clean, classroom-ready.`),
      }))
    );
    return new Response(
      JSON.stringify({ kind: "storyboard", title: story.title || prompt, scenes, poster_url: scenes[0]?.image_url ?? null, clips: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-video error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
