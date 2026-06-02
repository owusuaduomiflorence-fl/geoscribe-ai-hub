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
    const { topic, level = "JHS" } = await req.json();
    if (!topic) throw new Error("topic required");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You create printable Ghana Education Service Geography worksheets. Reply with markdown only — clear sections, numbered questions, and an answer key at the end." },
          { role: "user", content: `Create a printable worksheet on "${topic}" for ${level} students. Include: title, learning objectives, brief introduction (3-5 lines), 10 numbered questions (mix of fill-blank, short answer, and one diagram task), and an "## Answer Key" section.` },
        ],
      }),
    });
    if (!r.ok) throw new Error(`AI ${r.status}`);
    const d = await r.json();
    const content = d.choices[0].message.content as string;
    const titleMatch = content.match(/^#\s*(.+)$/m);
    return new Response(JSON.stringify({ title: titleMatch?.[1]?.trim() || topic, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
