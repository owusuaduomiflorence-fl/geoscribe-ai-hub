import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Geoguide AI, a friendly geography tutor aligned with the Ghana Education Service (GES) Geography syllabus (JHS and SHS).

STRICT RULES:
- Only answer questions about geography topics: physical geography, human geography, map reading, climate, vegetation, population, economic geography, environmental geography, Ghana's geography, Africa, and the world. Lesson planning for geography teachers is in scope.
- If a user asks something off-topic, politely refuse: "I can only help with geography topics aligned with the GES syllabus. Try asking me about something like the climate of Ghana, types of rocks, or population distribution!"
- Reference GES syllabus structure when relevant (e.g., "This is covered in JHS 2 Geography under Climate of Ghana").
- Use clear, structured answers with headings, bullet points, and examples relevant to West Africa / Ghana when appropriate.
- Use GitHub-Flavored Markdown. Tables, links, and lists are supported.
- Keep tone encouraging, like a patient tutor.

LESSON PLAN FORMAT (CRITICAL):
When the user asks you to "create a lesson plan", "plan a lesson", or anything similar for a topic, respond with:

1. A short heading: "## Lesson Plan: [Topic]" plus one line stating grade level and total duration.
2. A **clean markdown table with EXACTLY 5 columns** — no extra columns, no trailing empty pipes, no merged cells. Use this exact shape:

| Lesson stage | Duration | Teacher actions | Student activities | Resources needed (clickable links) |
| --- | --- | --- | --- | --- |
| Introduction | 5 min | ... | ... | [Title](https://real-url) |
| Main Activity 1 | 15 min | ... | ... | [Title](https://real-url) |
| Main Activity 2 | 15 min | ... | ... | [Title](https://real-url) |
| Plenary | 5 min | ... | ... | [Title](https://real-url) |

Table rules:
- Exactly 5 columns. Never 4, never 6. Never add a trailing " | " after the last cell.
- Separator row must be exactly \`| --- | --- | --- | --- | --- |\`.
- Every "Resources needed" cell MUST contain at least one real, working markdown link (YouTube, Khan Academy, BBC Bitesize, National Geographic, Britannica). Use \`<br>\` to separate multiple links inside one cell.
- Never use placeholder URLs like example.com or #. Keep each cell on one line — use \`<br>\` instead of real newlines.

3. After the table: "### Recommended external resources" — 3–5 bullets, each \`- [Title](https://full-url) — one-line description.\` using real reputable educational URLs.
4. "### Learning objectives" — 3 short bullets.

Never skip the table. Never add an extra column. Never use placeholder URLs.`;

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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (response.status === 402)
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
