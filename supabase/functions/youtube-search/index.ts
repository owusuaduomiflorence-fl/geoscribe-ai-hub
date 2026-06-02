// Searches YouTube for educational videos by topic.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YT_KEY = Deno.env.get("YOUTUBE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!YT_KEY) throw new Error("YOUTUBE_API_KEY not configured");
    const { query, max = 5 } = await req.json();
    if (!query || typeof query !== "string") throw new Error("query required");

    const q = encodeURIComponent(`${query} geography lesson`);
    const url =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet&type=video&safeSearch=strict&relevanceLanguage=en` +
      `&videoEmbeddable=true&maxResults=${Math.min(Math.max(max, 1), 10)}` +
      `&q=${q}&key=${YT_KEY}`;

    const r = await fetch(url);
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`YouTube API ${r.status}: ${t}`);
    }
    const d = await r.json();
    const videos = (d.items ?? []).map((it: any) => ({
      id: it.id?.videoId,
      title: it.snippet?.title,
      description: it.snippet?.description,
      channel: it.snippet?.channelTitle,
      thumbnail:
        it.snippet?.thumbnails?.high?.url ||
        it.snippet?.thumbnails?.medium?.url ||
        it.snippet?.thumbnails?.default?.url,
      embed_url: `https://www.youtube.com/embed/${it.id?.videoId}`,
      watch_url: `https://www.youtube.com/watch?v=${it.id?.videoId}`,
      published_at: it.snippet?.publishedAt,
    })).filter((v: any) => v.id);

    return new Response(JSON.stringify({ videos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("youtube-search error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
