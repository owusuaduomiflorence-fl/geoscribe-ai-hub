import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SnapLevel = "simple" | "school" | "deep";

export type SnapResult = {
  certain: boolean;
  feature: string;
  category: string;
  topic: string;
  confidence: number; // 0-100
  candidates: { name: string; confidence: number; reason: string }[];
  what_is_it: string;
  geography_connection: string;
  where_found: { place: string; detail: string; lat: number | null; lng: number | null }[];
  why_it_matters: string;
  vocabulary: { term: string; definition: string }[];
  video: { title: string; search_query: string; segments: { heading: string; narration: string }[] };
  quiz: {
    type: "mcq" | "true_false" | "short";
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }[];
  learn_more: { title: string; url: string }[];
};

const LEVEL_GUIDE: Record<SnapLevel, string> = {
  simple: "Simple Explanation: for ages 9-11. Very short sentences, everyday words, friendly tone, 2-3 sentences per section.",
  school: "School Level: for Ghanaian JHS students (ages 12-15), aligned to the GES geography syllabus. Clear, 3-5 sentences per section, introduce key terms.",
  deep: "Deep Dive: for SHS students (ages 15-18). Detailed processes, formation mechanisms, human-environment interaction, 5-8 sentences per section, technical vocabulary.",
};

const SYSTEM = `You are GeoSnap, the camera-learning guide inside Geoguide AI, a geography app for Ghanaian students.
You look at a student's photo and identify the most educationally relevant geographical feature (mountains, hills, valleys, rivers, lakes, dams, coastlines, beaches, rocks, soil, vegetation, forests, savannah, farmland, urban/rural settlements, roads, transport, drainage, flooding, erosion, weather features, land use, buildings/settlement patterns).
Be honest: if the image is ambiguous, blurry, or not geographical, set "certain": false and give 2-4 candidates. Never fake certainty. confidence is 0-100.
Always prefer Ghanaian examples for "where_found" (e.g. Volta Lake, Akosombo Dam, Mount Afadja, Kakum Forest, Cape Coast, Ada Foah, Kwahu Plateau, Northern savannah, Accra, Kumasi) with approximate lat/lng; you may add one world example.
Never mention or infer the identity of people in the photo.
Return ONLY a JSON object with exactly these keys:
{"certain":bool,"feature":string,"category":string,"topic":string (GES geography topic),"confidence":number,
"candidates":[{"name":string,"confidence":number,"reason":string}],
"what_is_it":string,"geography_connection":string,
"where_found":[{"place":string,"detail":string,"lat":number|null,"lng":number|null}] (3-4 items),
"why_it_matters":string,
"vocabulary":[{"term":string,"definition":string}] (3-6 items),
"video":{"title":string (like "Understanding Ghana's Coastline in 60 Seconds"),"search_query":string (good YouTube search),"segments":[{"heading":string,"narration":string}] covering Location, Definition, Formation/process, Human interaction, Environmental importance, Ghanaian example, Summary},
"quiz":[{"type":"mcq"|"true_false"|"short","question":string,"options":string[] (4 for mcq, ["True","False"] for true_false, [] for short),"answer":string,"explanation":string}] (4 questions mixing all three types, based on the photo and explanation; short answers should be 1-3 words),
"learn_more":[{"title":string,"url":string}] (2-3 real, stable URLs from Wikipedia, National Geographic, Britannica or Khan Academy)}`;

const Input = z.object({
  image: z.string().startsWith("data:image/").max(8_000_000),
  level: z.enum(["simple", "school", "deep"]),
  chosenFeature: z.string().max(120).optional(),
});

export const analyzeSnap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<SnapResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const userText = data.chosenFeature
      ? `The student confirmed this photo shows: "${data.chosenFeature}". Treat it as certain (certain=true, confidence 100) and explain it. Level: ${LEVEL_GUIDE[data.level]}`
      : `Identify the geographical feature in this photo and teach it. Level: ${LEVEL_GUIDE[data.level]}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        Authorization: `Bearer ${key}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_object" } },
        instructions: SYSTEM,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: userText },
              { type: "input_image", image_url: data.image },
            ],
          },
        ],
      }),
    });

    if (!resp.ok || !resp.body) {
      const body = await resp.text().catch(() => "");
      console.error("GeoSnap AI error", resp.status, body);
      if (resp.status === 429) throw new Error("GeoSnap is busy right now. Please try again in a minute.");
      if (resp.status === 402) throw new Error("AI credits have run out. Please ask your teacher or admin to top up.");
      throw new Error(`Image analysis failed (${resp.status}).`);
    }

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          if (ev.type === "response.failed" || ev.type === "error") {
            console.error("GeoSnap stream error", payload);
            throw new Error("Image analysis failed. Please try again.");
          }
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Image analysis")) throw e;
        }
      }
    }

    if (!text.trim()) throw new Error("GeoSnap could not read this photo. Try another picture.");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const parsed = JSON.parse(text.slice(start, end + 1)) as SnapResult;
    parsed.candidates ??= [];
    parsed.quiz ??= [];
    parsed.vocabulary ??= [];
    parsed.where_found ??= [];
    parsed.learn_more ??= [];
    return parsed;
  });
