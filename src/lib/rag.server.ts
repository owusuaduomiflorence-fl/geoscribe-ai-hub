// Server-only retrieval helpers (embeddings + pgvector search).
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUILTIN_NOTES } from "./rag-notes";

const MODEL = "google/gemini-embedding-2";
export type Source = { title: string; type: string; snippet: string; similarity: number };

export function chunkText(text: string, max = 1500): string[] {
  const paras = text.replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (p.length > max) {
      if (cur) { out.push(cur); cur = ""; }
      for (let i = 0; i < p.length; i += max - 200) out.push(p.slice(i, i + max));
      continue;
    }
    if ((cur + "\n\n" + p).length > max && cur) { out.push(cur); cur = p; } else cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) out.push(cur);
  return out;
}

export async function embed(inputs: string[]): Promise<number[][]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured.");
  const vectors: number[][] = [];
  for (let s = 0; s < inputs.length; s += 100) {
    const batch = inputs.slice(s, s + 100);
    let resp: Response | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, input: batch }),
      });
      if (resp.ok || !(resp.status === 429 || resp.status >= 500) || attempt === 3) break;
      await resp.body?.cancel();
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 500));
    }
    if (!resp!.ok) {
      const t = await resp!.text().catch(() => "");
      console.error("Embedding error", resp!.status, t);
      if (resp!.status === 402) throw new Error("AI credits have run out.");
      throw new Error(`Search indexing failed (${resp!.status}).`);
    }
    const j = (await resp!.json()) as { data: { index: number; embedding: number[] }[] };
    const ordered: number[][] = [];
    for (const d of j.data) ordered[d.index] = d.embedding;
    vectors.push(...ordered);
  }
  return vectors;
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export async function insertChunks(rows: { owner_id: string | null; shared: boolean; source_type: string; source_title: string; source_ref: string | null }, text: string) {
  const chunks = chunkText(text);
  if (!chunks.length) return 0;
  const vecs = await embed(chunks.map((c) => `${rows.source_title}\n${c}`));
  const db = await admin();
  const { error } = await db.from("knowledge_chunks").insert(
    chunks.map((content, i) => ({ ...rows, chunk_index: i, content, embedding: JSON.stringify(vecs[i]) })),
  );
  if (error) throw new Error(error.message);
  return chunks.length;
}

async function ensureBuiltins() {
  const db = await admin();
  const { count } = await db.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("source_type", "builtin");
  if ((count ?? 0) > 0) return;
  for (const n of BUILTIN_NOTES) await insertChunks({ owner_id: null, shared: true, source_type: "builtin", source_title: n.title, source_ref: n.title }, n.text);
}

async function ensureSnaps(userId: string) {
  const db = await admin();
  const { data: snaps } = await db.from("geosnap_discoveries").select("id,feature,topic,result").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (!snaps?.length) return;
  const { data: have } = await db.from("knowledge_chunks").select("source_ref").eq("owner_id", userId).eq("source_type", "snap");
  const done = new Set((have ?? []).map((h) => h.source_ref));
  for (const s of snaps.filter((s) => !done.has(s.id)).slice(0, 5)) {
    const r = (s.result ?? {}) as Record<string, any>;
    const vocab = Array.isArray(r.vocabulary) ? r.vocabulary.map((v: any) => `${v.term}: ${v.definition}`).join("; ") : "";
    const text = [`My GeoSnap photo showed: ${s.feature}${s.topic ? ` (topic: ${s.topic})` : ""}.`, r.what_is_it, r.geography_connection, r.why_it_matters, vocab && `Vocabulary: ${vocab}`].filter(Boolean).join("\n\n");
    await insertChunks({ owner_id: userId, shared: false, source_type: "snap", source_title: `My snap: ${s.feature}`, source_ref: s.id }, text);
  }
}

/** Retrieve top passages visible to the user (RLS applies via the user's client). */
export async function retrieve(supabase: SupabaseClient<any>, userId: string, query: string, k = 5) {
  try { await ensureBuiltins(); } catch (e) { console.error("builtin index", e); }
  try { await ensureSnaps(userId); } catch (e) { console.error("snap index", e); }
  const [q] = await embed([query.slice(0, 4000)]);
  const { data, error } = await supabase.rpc("match_knowledge", { query_embedding: JSON.stringify(q), match_count: k });
  if (error) { console.error("match_knowledge", error); return { context: "", sources: [] as Source[] }; }
  const hits = (data ?? []).filter((h: any) => h.similarity > 0.45);
  const sources: Source[] = hits.map((h: any) => ({ title: h.source_title, type: h.source_type, snippet: h.content.slice(0, 200), similarity: Math.round(h.similarity * 100) / 100 }));
  const context = hits.map((h: any, i: number) => `[${i + 1}] (${h.source_title})\n${h.content}`).join("\n\n");
  return { context, sources };
}

export const RAG_RULES = `Use the numbered REFERENCE NOTES below when they are relevant; prefer them over general knowledge, cite them inline like [1], and never invent facts not supported by them or well-established geography. Ignore notes that are off-topic.`;
