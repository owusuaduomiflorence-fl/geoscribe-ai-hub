import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SNAP_SYSTEM, normalizeSnap, type ConfidenceLevel } from "./geosnap-prompt";

export type SnapLevel = "simple" | "school" | "deep";

export type SnapResult = {
  certain: boolean;
  feature: string;
  category: string;
  topic: string;
  confidence: number; // display score derived from confidence_level, not a probability
  confidence_level?: ConfidenceLevel;
  evidence?: string[];
  distinguishing?: string;
  uncertainty_note?: string;
  retake_tip?: string;
  followup_question?: { question: string; options: string[] } | null;
  interactive_question?: { question: string; options: string[]; answer: string; explanation: string } | null;
  candidates: { name: string; confidence: number; confidence_level?: ConfidenceLevel; reason: string }[];
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
  sources?: { title: string; type: string; snippet: string; similarity: number }[];
};

const LEVEL_GUIDE: Record<SnapLevel, string> = {
  simple: "Simple Explanation: for ages 9-11. Very short sentences, everyday words, friendly tone, 2-3 sentences per section.",
  school: "School Level: for Ghanaian JHS students (ages 12-15), aligned to the GES geography syllabus. Clear, 3-5 sentences per section, introduce key terms.",
  deep: "Deep Dive: for SHS students (ages 15-18). Detailed processes, formation mechanisms, human-environment interaction, 5-8 sentences per section, technical vocabulary.",
};

const Input = z.object({
  image: z.string().startsWith("data:image/").max(8_000_000),
  level: z.enum(["simple", "school", "deep"]),
  chosenFeature: z.string().max(120).optional(),
  hint: z.string().max(300).optional(),
});

export const analyzeSnap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<SnapResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const userText = data.chosenFeature
      ? `The student confirmed this photo shows: "${data.chosenFeature}". Use that as the feature, still list the visible evidence for it honestly, and teach it. Level: ${LEVEL_GUIDE[data.level]} Reply with the JSON object described in the instructions.`
      : `Identify the geographical feature in this photo and teach it.${data.hint ? ` Extra context from the student (use it as evidence, but do not let it override what the photo clearly shows): "${data.hint}".` : ""} Level: ${LEVEL_GUIDE[data.level]} Reply with the JSON object described in the instructions.`;

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
        reasoning: { effort: "medium" },
        text: { format: { type: "json_object" } },
        instructions: SNAP_SYSTEM,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: userText },
              { type: "input_image", image_url: data.image, detail: "high" },
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
    const parsed = normalizeSnap(JSON.parse(text.slice(start, end + 1)), data.chosenFeature) as unknown as SnapResult;
    try {
      const { retrieve } = await import("./rag.server");
      const rag = await retrieve(context.supabase as any, context.userId, `${parsed.feature} ${parsed.topic}`, 3);
      parsed.sources = rag.sources.filter((s) => !(s.type === "snap" && s.title === `My snap: ${parsed.feature}`));
    } catch (e) { console.error("geosnap retrieve", e); }
    return parsed;
  });
