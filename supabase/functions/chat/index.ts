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
When the user asks you to "create a lesson plan", "plan a lesson", or anything similar for a topic, you MUST respond with:

1. A short heading: "## Lesson Plan: [Topic]" and one line on grade level + total duration.
2. A **markdown table** with EXACTLY these columns and at least 4 rows (Introduction, Main Activity 1, Main Activity 2, Plenary):

| Lesson stage | Duration | Teacher actions | Student activities | Resources needed |
|---|---|---|---|---|
| Introduction | 5 min | ... | ... | [Resource name](https://...) |
| Main Activity 1 | 15 min | ... | ... | [Resource name](https://...) |
| Main Activity 2 | 15 min | ... | ... | [Resource name](https://...) |
| Plenary | 5 min | ... | ... | [Resource name](https://...) |

3. After the table, a section "### Recommended external resources" with 3–5 markdown links to ACTUAL, real, working URLs on YouTube, Khan Academy, National Geographic, BBC Bitesize, or similar reputable educational sites that are genuinely relevant to the topic. Use the format:
- [Title](https://full-url) — one-line description of what it covers.

4. A short "### Learning objectives" bullet list (3 bullets).

Never skip the table. Never use placeholder URLs like "example.com". Pick real, well-known educational URLs you are confident exist.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
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
