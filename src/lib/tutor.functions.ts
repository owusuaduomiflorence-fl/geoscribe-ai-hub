import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TutorTurn = {
  message: string;
  check: { prompt: string; options: string[] } | null;
  correct: boolean | null;
  xp: number;
};

const Msg = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) });
const Input = z.object({
  topic: z.string().min(1).max(160),
  level: z.enum(["JHS", "SHS"]),
  messages: z.array(Msg).max(40),
});

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["message", "check", "correct", "xp"],
  properties: {
    message: { type: "string" },
    check: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["prompt", "options"],
          properties: { prompt: { type: "string" }, options: { type: "array", items: { type: "string" } } },
        },
      ],
    },
    correct: { anyOf: [{ type: "boolean" }, { type: "null" }] },
    xp: { type: "integer" },
  },
};

export const tutorTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<TutorTurn> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");
    const instructions = `You are GeoGuide Coach, a playful, encouraging geography tutor for Ghanaian ${data.level} students (GES syllabus).
Topic: "${data.topic}". Teach it INTERACTIVELY in small bites, like a game:
- Each turn: give ONE short idea (max ~90 words, markdown, an emoji or two, Ghanaian examples like Volta Lake, Kwahu Plateau, Accra), then ask a quick check question with 3-4 options in "check".
- When the student answers, set "correct" true/false, react warmly, explain briefly why, then continue to the next bite.
- Award xp: 10 for a correct answer, 2 for a try, 0 when no answer was given.
- Mix in challenges, mini-stories, "imagine you are a surveyor..." scenarios, and fun facts. After ~6 bites give a short recap and a final boss question.
- For map skills (contours, scale, grid references, bearings, symbols) include worked numeric examples.
- Stay on geography. Reply in JSON matching the schema.`;
    const input = data.messages.length
      ? data.messages.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: `Start my lesson on ${data.topic}. Reply in json.` }];

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
        text: { format: { type: "json_schema", name: "tutor_turn", strict: true, schema } },
        instructions,
        input,
      }),
    });
    if (!resp.ok || !resp.body) {
      const body = await resp.text().catch(() => "");
      console.error("Tutor AI error", resp.status, body);
      if (resp.status === 429) throw new Error("The coach is busy. Try again in a minute.");
      if (resp.status === 402) throw new Error("AI credits have run out. Please top up to keep learning.");
      throw new Error(`Coach request failed (${resp.status}).`);
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
        const p = line.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        try {
          const ev = JSON.parse(p);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        } catch {
          /* ignore */
        }
      }
    }
    if (!text.trim()) throw new Error("The coach didn't respond. Please try again.");
    const out = JSON.parse(text) as TutorTurn;
    out.xp = Math.max(0, Math.min(10, out.xp || 0));
    return out;
  });
