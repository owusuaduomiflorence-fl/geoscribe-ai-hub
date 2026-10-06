import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { tutorTurn } from "@/lib/tutor.functions";
import { ContourLab, GridLab, ScaleLab, SymbolsLab } from "@/components/learn/MapLabs";

export const Route = createFileRoute("/_app/learn")({
  head: () => ({
    meta: [
      { title: "Learn Geography — Interactive Labs & AI Coach | Geoguide AI" },
      { name: "description", content: "Learn contours, map scale, grid references and every geography topic through hands-on labs and a playful AI coach." },
      { property: "og:title", content: "Learn Geography the fun way — Geoguide AI" },
      { property: "og:description", content: "Interactive map labs and an AI coach that quizzes you as you learn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { snap?: string } => (typeof s.snap === "string" ? { snap: s.snap } : {}),
  component: LearnPage,
});

type Snap = { id: string; feature: string; category: string | null; topic: string | null; approx_location: string | null; result: any; created_at: string };

function labFor(s: Snap) {
  const t = `${s.feature} ${s.category ?? ""} ${s.topic ?? ""}`.toLowerCase();
  if (/hill|mountain|valley|plateau|relief|slope|escarpment|cliff|scarp|rock|erosion/.test(t)) return "contour";
  if (/road|transport|rail|bridge|distance|river|stream/.test(t)) return "scale";
  if (/settlement|urban|rural|building|town|city|village|farm|agric|land.?use/.test(t)) return "grid";
  return "symbols";
}

function snapContext(s: Snap) {
  const r = s.result ?? {};
  const vocab = Array.isArray(r.vocabulary) ? r.vocabulary.map((v: any) => v.term).join(", ") : "";
  return [`Feature: ${s.feature}`, s.category && `Category: ${s.category}`, s.topic && `Topic: ${s.topic}`,
    r.what_is_it && `What it is: ${String(r.what_is_it).slice(0, 300)}`, vocab && `Vocabulary: ${vocab}`,
    s.approx_location && `Approximate area (lat,lng ~10km): ${s.approx_location}`].filter(Boolean).join("\n").slice(0, 1200);
}

function SnapMap({ loc }: { loc: string }) {
  const [lat, lng] = loc.split(",").map((n) => parseFloat(n));
  if (!isFinite(lat) || !isFinite(lng)) return null;
  const d = 0.08;
  return <iframe title="Snap area map" className="h-48 w-full rounded-xl border" loading="lazy"
    src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`} />;
}

function LearnPage() {
  const { user } = useAuth();
  const { snap: snapId } = Route.useSearch();
  const [xp, setXp] = useState(0);
  const [lab, setLab] = useState("contour");
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [active, setActive] = useState<Snap | null>(null);

  const award = async (n: number, source: string) => {
    setXp((x) => x + n);
    if (user) await supabase.from("game_scores").insert({ user_id: user.id, game: `learn:${source}`, score: n });
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("game_scores").select("score").eq("user_id", user.id).like("game", "learn:%").then(({ data }) => {
      setXp((data ?? []).reduce((s, r) => s + Number(r.score), 0));
    });
    supabase.from("geosnap_discoveries").select("id,feature,category,topic,approx_location,result,created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(8).then(({ data }) => {
        const list = (data ?? []) as Snap[];
        setSnaps(list);
        const pick = list.find((s) => s.id === snapId);
        if (pick) useSnap(pick);
      });
  }, [user, snapId]);

  const useSnap = (s: Snap) => { setActive(s); setLab(labFor(s)); };

  const Active = LABS.find((l) => l.id === lab)!.el;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Learn by doing 🌍</h1>
          <p className="text-muted-foreground">Play with map labs, then let the AI coach teach you any topic — one bite and one question at a time.</p>
        </div>
        <div className="rounded-full bg-accent px-4 py-2 font-bold text-accent-foreground">⭐ {xp} Learn XP</div>
      </header>

      <section className="rounded-2xl border bg-card p-4 md:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">📸 Learn from your snaps</h2>
          <Link to="/geosnap" className="text-sm font-medium text-primary hover:underline">Snap something new →</Link>
        </div>
        {snaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Snap a real landscape with GeoSnap and it will appear here — we'll pick the right map lab and the coach will teach you using your own photo.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {snaps.map((s) => (
              <Button key={s.id} size="sm" variant={active?.id === s.id ? "default" : "outline"} onClick={() => useSnap(s)}>
                {s.feature}
              </Button>
            ))}
          </div>
        )}
        {active && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <p><b>{active.feature}</b>{active.topic ? ` · ${active.topic}` : ""}</p>
              {active.result?.what_is_it && <p className="text-muted-foreground">{String(active.result.what_is_it).slice(0, 220)}</p>}
              <p>🧪 Suggested lab: <b>{LABS.find((l) => l.id === labFor(active))!.title}</b> (opened below)</p>
              <p>🦉 The coach below is now teaching from this snap.</p>
            </div>
            {active.approx_location ? <SnapMap loc={active.approx_location} /> : <p className="text-sm text-muted-foreground">No location was shared for this snap, so the map is hidden.</p>}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-4 md:p-6">
        <h2 className="mb-3 font-display text-xl font-bold">Map Skills Labs</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {LABS.map((l) => (
            <Button key={l.id} size="sm" variant={lab === l.id ? "default" : "outline"} onClick={() => setLab(l.id)}>{l.title}</Button>
          ))}
        </div>
        <Active onXp={award} />
      </section>

      <Coach key={active?.id ?? "none"} snap={active} onXp={(n) => award(n, active ? "snap-coach" : "coach")} />
    </div>
  );
}

function Coach({ onXp }: { onXp: (n: number) => void }) {
  const run = useServerFn(tutorTurn);
  const [level, setLevel] = useState<"JHS" | "SHS">("JHS");
  const [topic, setTopic] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, busy]);

  const send = async (t: string, history: Msg[]) => {
    setBusy(true);
    try {
      const res = await run({ data: { topic: t, level, messages: history.map(({ role, content }) => ({ role, content })) } });
      if (res.xp > 0) { onXp(res.xp); toast.success(`+${res.xp} XP`); }
      setMsgs([...history, { role: "assistant", content: res.message, check: res.check }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Coach failed");
    } finally {
      setBusy(false);
    }
  };

  const start = (t: string) => { setTopic(t); setMsgs([]); send(t, []); };
  const reply = (text: string) => {
    if (!topic || !text.trim() || busy) return;
    const h: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(h); setInput(""); send(topic, h);
  };

  const last = msgs[msgs.length - 1];

  return (
    <section className="rounded-2xl border bg-card p-4 md:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">🦉 GeoGuide Coach</h2>
        <div className="flex gap-1">
          {(["JHS", "SHS"] as const).map((l) => (
            <Button key={l} size="sm" variant={level === l ? "default" : "outline"} onClick={() => setLevel(l)}>{l}</Button>
          ))}
        </div>
      </div>

      {!topic ? (
        <div className="space-y-4">
          {Object.entries(TOPICS).map(([group, list]) => (
            <div key={group}>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">{group}</p>
              <div className="flex flex-wrap gap-2">
                {list.map((t) => <Button key={t} size="sm" variant="outline" onClick={() => start(t)}>{t}</Button>)}
              </div>
            </div>
          ))}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) start(custom.trim()); }}>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Or type any geography topic…" className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
            <Button type="submit">Start</Button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Topic: <b>{topic}</b></span>
            <Button size="sm" variant="ghost" onClick={() => { setTopic(null); setMsgs([]); }}>Change topic</Button>
          </div>
          <div className="max-h-[480px] space-y-3 overflow-y-auto rounded-xl bg-muted/40 p-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-auto max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground" : "prose prose-sm max-w-none"}>
                {m.role === "user" ? m.content : (
                  <>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    {m.check && <p className="font-semibold">❓ {m.check.prompt}</p>}
                  </>
                )}
              </div>
            ))}
            {busy && <p className="animate-pulse text-sm text-muted-foreground">Coach is thinking…</p>}
            <div ref={endRef} />
          </div>
          {last?.role === "assistant" && last.check && !busy && (
            <div className="flex flex-wrap gap-2">
              {last.check.options.map((o) => <Button key={o} variant="outline" size="sm" onClick={() => reply(o)}>{o}</Button>)}
            </div>
          )}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); reply(input); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Answer, ask a question, or say 'explain again'…" className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
            <Button type="submit" disabled={busy}>Send</Button>
          </form>
        </div>
      )}
    </section>
  );
}
