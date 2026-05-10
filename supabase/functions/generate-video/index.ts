// Generates a 4-scene visual storyboard (treated as a "video" preview).
// True video generation requires a long-running queue not available here.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function aiJSON(prompt: string) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You write short geography lesson storyboards aligned with the GES syllabus. Reply with strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`storyboard gen failed ${r.status}`);
  const d = await r.json();
  return JSON.parse(d.choices[0].message.content);
}

async function aiImage(prompt: string): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { prompt } = await req.json();
    if (!prompt) throw new Error("prompt required");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const story = await aiJSON(
      `Create a 4-scene storyboard for a short geography explainer video about: "${prompt}". Reply with JSON {"title": string, "scenes": [{"caption": string, "image_prompt": string}]} where each image_prompt is a vivid educational illustration description.`
    );

    const scenes = await Promise.all(
      (story.scenes || []).slice(0, 4).map(async (s: any) => ({
        caption: s.caption,
        image_url: await aiImage(
          `Educational geography illustration: ${s.image_prompt}. Vivid, clean, classroom-ready.`
        ),
      }))
    );

    return new Response(
      JSON.stringify({
        title: story.title || prompt,
        scenes,
        poster_url: scenes[0]?.image_url ?? null,
      }),
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
