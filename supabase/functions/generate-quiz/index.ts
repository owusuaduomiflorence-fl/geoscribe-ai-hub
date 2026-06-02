const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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
    const { topic, count = 8, level = "JHS" } = await req.json();
    if (!topic) throw new Error("topic required");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You generate Ghana Education Service (GES) Geography quizzes. Reply with strict JSON only." },
          {
            role: "user",
            content: `Create a quiz on "${topic}" for ${level} level. Reply with JSON: {"title": string, "questions": [{"type": "mcq"|"short", "question": string, "options"?: [string,string,string,string], "correct_answer": string, "points": number}]}. Generate ${count} questions, mostly mcq with 1-2 short answer. correct_answer for mcq must exactly match one option.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) throw new Error(`AI ${r.status}`);
    const d = await r.json();
    const quiz = JSON.parse(d.choices[0].message.content);
    return new Response(JSON.stringify(quiz), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
