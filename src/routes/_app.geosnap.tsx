import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Camera, Upload, Loader2, Sparkles, MapPin, Film, Bot, Target, BookOpen,
  CheckCircle2, XCircle, RotateCcw, Volume2, Square, History, Trophy, HelpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getRequiredAccessToken } from "@/lib/auth-token";
import { Button } from "@/components/ui/button";
import { analyzeSnap, type SnapLevel, type SnapResult } from "@/lib/geosnap.functions";

export const Route = createFileRoute("/_app/geosnap")({
  component: GeoSnapPage,
  head: () => ({
    meta: [
      { title: "GeoSnap — Snap & Learn Geography | Geoguide AI" },
      { name: "description", content: "Photograph rivers, hills, soil or settlements and get an instant, age-appropriate geography lesson with Ghanaian examples." },
      { property: "og:title", content: "GeoSnap — Snap & Learn Geography" },
      { property: "og:description", content: "See the world. Snap it. Learn it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const XP = { snap: 10, identify: 20, explain: 15, lesson: 25, quiz: 30 } as const;
type XpKey = keyof typeof XP;
const XP_LABEL: Record<XpKey, string> = {
  snap: "📸 Snap taken", identify: "🔎 Identification confirmed", explain: "📖 Explanation completed",
  lesson: "🎬 Lesson completed", quiz: "🎯 Quiz completed",
};

type Discovery = {
  id: string; image_path: string; feature: string; topic: string | null; created_at: string;
  approx_location: string | null; quiz_score: number | null; quiz_total: number | null;
  xp_earned: number; xp_events: string[]; result: SnapResult; level: string;
};

async function resizeImage(file: Blob, max = 1024): Promise<{ dataUrl: string; blob: Blob }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL("image/jpeg", 0.82);
  const blob = await (await fetch(dataUrl)).blob();
  return { dataUrl, blob };
}

function GeoSnapPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeSnap);
  const [level, setLevel] = useState<SnapLevel>("school");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SnapResult | null>(null);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [useLocation, setUseLocation] = useState(false);
  const [approx, setApprox] = useState<{ lat: number; lng: number } | null>(null);
  const [tab, setTab] = useState<"video" | "map" | "quiz" | "more" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: history } = useQuery({
    queryKey: ["geosnap", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geosnap_discoveries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as Discovery[];
    },
  });
  const totalXp = (history ?? []).reduce((s, d) => s + (d.xp_earned ?? 0), 0);

  const requestLocation = (on: boolean) => {
    setUseLocation(on);
    if (!on) return setApprox(null);
    if (!navigator.geolocation) {
      toast.error("Location isn't available on this device. GeoSnap will use the photo only.");
      return setUseLocation(false);
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        // Round to ~10 km so we never keep a precise location.
        setApprox({ lat: Math.round(p.coords.latitude * 10) / 10, lng: Math.round(p.coords.longitude * 10) / 10 });
        toast.success("Approximate area added (not your exact spot).");
      },
      () => {
        toast.message("No problem — GeoSnap works with the photo alone.");
        setUseLocation(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const award = async (d: Discovery, key: XpKey, extra: Partial<Discovery> = {}) => {
    const events = d.xp_events ?? [];
    const already = events.includes(key);
    const next: Discovery = {
      ...d, ...extra,
      xp_events: already ? events : [...events, key],
      xp_earned: already ? d.xp_earned : d.xp_earned + XP[key],
    };
    setDiscovery(next);
    if (!already) toast.success(`${XP_LABEL[key]}: +${XP[key]} XP`);
    await supabase.from("geosnap_discoveries").update({
      xp_events: next.xp_events, xp_earned: next.xp_earned,
      ...(extra.quiz_score !== undefined ? { quiz_score: extra.quiz_score, quiz_total: extra.quiz_total } : {}),
      ...(extra.result ? { result: extra.result as never, feature: extra.feature, topic: extra.topic } : {}),
    }).eq("id", d.id);
    qc.invalidateQueries({ queryKey: ["geosnap", user?.id] });
    return next;
  };

  const handleFile = async (file: Blob) => {
    if (!user) return;
    setError(null); setResult(null); setDiscovery(null); setTab(null);
    setBusy(true);
    try {
      const { dataUrl, blob } = await resizeImage(file);
      setImage(dataUrl);
      await getRequiredAccessToken();
      const r = await analyze({ data: { image: dataUrl, level } });
      setResult(r);
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from("geosnaps").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const { data: row, error: insErr } = await supabase.from("geosnap_discoveries").insert({
        user_id: user.id, image_path: path, feature: r.feature, category: r.category, topic: r.topic,
        confidence: r.confidence, level, result: r as never,
        approx_location: approx ? `${approx.lat}, ${approx.lng}` : null,
        xp_events: ["snap"], xp_earned: XP.snap,
      }).select("*").single();
      if (insErr) throw insErr;
      setDiscovery(row as unknown as Discovery);
      toast.success(`${XP_LABEL.snap}: +${XP.snap} XP`);
      qc.invalidateQueries({ queryKey: ["geosnap", user.id] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const reExplain = async (feature: string, lvl: SnapLevel = level, confirm = true) => {
    if (!image || !discovery) return;
    setBusy(true); setError(null);
    try {
      const r = await analyze({ data: { image, level: lvl, chosenFeature: feature } });
      setResult(r);
      const d = { ...discovery, result: r, feature: r.feature, topic: r.topic };
      if (confirm) await award(d, "identify", { result: r, feature: r.feature, topic: r.topic });
      else {
        setDiscovery(d);
        await supabase.from("geosnap_discoveries").update({ result: r as never, level: lvl }).eq("id", d.id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg); toast.error(msg);
    } finally { setBusy(false); }
  };

  const changeLevel = (l: SnapLevel) => {
    setLevel(l);
    if (result && discovery && result.certain) reExplain(result.feature, l, false);
  };

  const openHistory = async (d: Discovery) => {
    const { data } = await supabase.storage.from("geosnaps").createSignedUrl(d.image_path, 3600);
    setImage(data?.signedUrl ?? null);
    setResult(d.result); setDiscovery(d); setTab(null); setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => { setImage(null); setResult(null); setDiscovery(null); setError(null); setTab(null); };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Camera className="h-3.5 w-3.5" /> GeoSnap · Snap &amp; Learn
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              See the world. <span className="text-primary">Snap it.</span> Learn it.
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Point your camera at a river, hill, farm, road or soil and GeoSnap turns it into a geography lesson.
            </p>
          </div>
          <div className="rounded-2xl border bg-background px-4 py-3 text-center">
            <Trophy className="mx-auto h-5 w-5 text-accent" />
            <p className="font-display text-2xl font-bold">{totalXp}</p>
            <p className="text-xs text-muted-foreground">GeoSnap XP</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Learning level:</span>
          {([["simple", "Simple"], ["school", "School Level"], ["deep", "Deep Dive"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => changeLevel(v)} disabled={busy}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${level === v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
              {l}
            </button>
          ))}
        </div>
      </section>

      {/* Capture */}
      {!image && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border bg-card p-6">
            <h2 className="font-display text-xl font-semibold">Take a learning snap</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              GeoSnap will ask to use your camera. Your photos stay private in your own discoveries — they are never published.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setCameraOpen(true)} disabled={busy}><Camera className="mr-2 h-4 w-4" />Open camera</Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />Upload photo</Button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </div>
            <label className="mt-5 flex items-start gap-3 rounded-2xl bg-muted/60 p-3 text-sm">
              <input type="checkbox" className="mt-1" checked={useLocation} onChange={(e) => requestLocation(e.target.checked)} />
              <span>
                <b>Add my approximate area</b> (optional). Helps show nearby examples. We only keep a rough area (about 10 km), never your exact spot.
                {approx && <span className="block text-xs text-muted-foreground">Area: {approx.lat}, {approx.lng}</span>}
              </span>
            </label>
          </div>
          <div className="rounded-3xl border bg-card p-6">
            <h3 className="font-semibold">Things you can snap</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {["Hills", "Valleys", "Rivers", "Lakes", "Dams", "Beaches", "Rocks", "Soil", "Forests", "Savannah", "Farmland", "Towns", "Villages", "Roads", "Drains", "Flooding", "Erosion", "Clouds", "Buildings"].map((t) => (
                <span key={t} className="rounded-full bg-secondary px-2.5 py-1">{t}</span>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">SNAP → IDENTIFY → LEARN → WATCH → EXPLORE → ASK → PLAY → MASTER</p>
          </div>
        </section>
      )}

      {cameraOpen && <CameraModal onClose={() => setCameraOpen(false)} onCapture={(b) => { setCameraOpen(false); handleFile(b); }} onFallback={() => { setCameraOpen(false); fileRef.current?.click(); }} />}

      {image && (
        <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-3">
            <img src={image} alt="Your GeoSnap photo" className="w-full rounded-3xl border object-cover" />
            <Button variant="outline" className="w-full" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Take another snap</Button>
            {discovery && <p className="text-center text-sm text-muted-foreground">XP from this discovery: <b className="text-foreground">{discovery.xp_earned}</b></p>}
          </div>

          <div className="space-y-4">
            {busy && (
              <div className="flex items-center gap-3 rounded-3xl border bg-card p-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>GeoSnap is studying your photo…</span>
              </div>
            )}
            {error && !busy && (
              <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
                {error}
                <div className="mt-3"><Button size="sm" variant="outline" onClick={reset}>Try again</Button></div>
              </div>
            )}

            {result && !busy && !result.certain && (
              <div className="rounded-3xl border bg-card p-6">
                <p className="flex items-center gap-2 font-semibold"><HelpCircle className="h-5 w-5 text-accent" />I'm not completely sure what I'm seeing. Here are the most likely possibilities.</p>
                <p className="mt-1 text-sm text-muted-foreground">Tap the one that matches what you photographed.</p>
                <div className="mt-4 grid gap-2">
                  {[...result.candidates, ...(result.candidates.some((c) => c.name === result.feature) ? [] : [{ name: result.feature, confidence: result.confidence, reason: "" }])].map((c) => (
                    <button key={c.name} onClick={() => reExplain(c.name)} className="rounded-2xl border bg-background p-3 text-left hover:border-primary">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{c.name}</span>
                        <ConfidenceBadge value={c.confidence} />
                      </div>
                      {c.reason && <p className="mt-1 text-xs text-muted-foreground">{c.reason}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {result && !busy && result.certain && discovery && (
              <LearningResult
                result={result}
                discovery={discovery}
                approx={approx}
                tab={tab}
                setTab={setTab}
                onConfirm={() => award(discovery, "identify")}
                onNotRight={() => setResult({ ...result, certain: false, candidates: result.candidates.length ? result.candidates : [{ name: result.feature, confidence: result.confidence, reason: "" }] })}
                onExplained={() => award(discovery, "explain")}
                onLesson={() => award(discovery, "lesson")}
                onQuiz={(score, total) => award(discovery, "quiz", { quiz_score: score, quiz_total: total })}
              />
            )}
          </div>
        </section>
      )}

      {/* History */}
      <section className="rounded-3xl border bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><History className="h-5 w-5" />My Discoveries</h2>
        {!history?.length ? (
          <p className="mt-2 text-sm text-muted-foreground">Your snaps will appear here. Only you can see them.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((d) => <HistoryCard key={d.id} d={d} onOpen={() => openHistory(d)} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const v = Math.round(value);
  const label = v >= 80 ? "High" : v >= 50 ? "Medium" : "Low";
  const cls = v >= 80 ? "bg-primary/15 text-primary" : v >= 50 ? "bg-accent/20 text-accent-foreground" : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label} · {v}%</span>;
}

function HistoryCard({ d, onOpen }: { d: Discovery; onOpen: () => void }) {
  const { data: url } = useQuery({
    queryKey: ["geosnap-img", d.image_path],
    staleTime: 50 * 60 * 1000,
    queryFn: async () => (await supabase.storage.from("geosnaps").createSignedUrl(d.image_path, 3600)).data?.signedUrl ?? null,
  });
  return (
    <button onClick={onOpen} className="overflow-hidden rounded-2xl border bg-background text-left transition hover:border-primary">
      {url ? <img src={url} alt={d.feature} className="h-36 w-full object-cover" loading="lazy" /> : <div className="h-36 bg-muted" />}
      <div className="space-y-1 p-3 text-sm">
        <p className="font-semibold">{d.feature}</p>
        <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()} · {d.topic ?? "Geography"}</p>
        {d.approx_location && <p className="text-xs text-muted-foreground">📍 Approx. {d.approx_location}</p>}
        <p className="text-xs">
          🎯 Quiz: {d.quiz_total ? `${d.quiz_score}/${d.quiz_total}` : "not taken"} · ⭐ {d.xp_earned} XP
        </p>
      </div>
    </button>
  );
}

function CameraModal({ onClose, onCapture, onFallback }: { onClose: () => void; onCapture: (b: Blob) => void; onFallback: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setErr("Camera permission was not given or no camera was found."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);
  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => b && onCapture(b), "image/jpeg", 0.9);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-card p-4">
        {err ? (
          <div className="space-y-3 p-4 text-center">
            <p>{err}</p>
            <Button onClick={onFallback}><Upload className="mr-2 h-4 w-4" />Choose a photo instead</Button>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="aspect-[3/4] w-full rounded-2xl bg-foreground object-cover" />
        )}
        <div className="mt-3 flex justify-between gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {!err && <Button onClick={snap}><Camera className="mr-2 h-4 w-4" />Snap</Button>}
        </div>
      </div>
    </div>
  );
}

function LearningResult(props: {
  result: SnapResult; discovery: Discovery; approx: { lat: number; lng: number } | null;
  tab: "video" | "map" | "quiz" | "more" | null; setTab: (t: "video" | "map" | "quiz" | "more" | null) => void;
  onConfirm: () => void; onNotRight: () => void; onExplained: () => void; onLesson: () => void;
  onQuiz: (score: number, total: number) => void;
}) {
  const { result: r, discovery: d, tab, setTab } = props;
  const confirmed = d.xp_events?.includes("identify");
  const explained = d.xp_events?.includes("explain");
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What did you discover?</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-3xl font-bold text-primary">{r.feature}</h2>
          <ConfidenceBadge value={r.confidence} />
        </div>
        <p className="text-sm text-muted-foreground">{r.category} · Topic: {r.topic}</p>
        {!confirmed && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={props.onConfirm}><CheckCircle2 className="mr-1 h-4 w-4" />Yes, that's it!</Button>
            <Button size="sm" variant="outline" onClick={props.onNotRight}>Not quite</Button>
          </div>
        )}
      </div>

      <Section title="What is it?">{r.what_is_it}</Section>
      <Section title="Geography connection">{r.geography_connection}</Section>
      <div className="rounded-3xl border bg-card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Where is it found?</h3>
        <ul className="mt-2 space-y-2">
          {r.where_found.map((w) => (
            <li key={w.place} className="flex gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span><b>{w.place}</b> — {w.detail}</span></li>
          ))}
        </ul>
      </div>
      <Section title="Why does it matter?">{r.why_it_matters}</Section>
      <div className="rounded-3xl border bg-card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Key vocabulary</h3>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          {r.vocabulary.map((v) => (
            <div key={v.term} className="rounded-2xl bg-muted/60 p-3 text-sm"><dt className="font-semibold">{v.term}</dt><dd className="text-muted-foreground">{v.definition}</dd></div>
          ))}
        </dl>
        {!explained && <Button size="sm" className="mt-3" variant="secondary" onClick={props.onExplained}>I've read it all ✓ (+{XP.explain} XP)</Button>}
      </div>

      <div className="rounded-3xl border bg-card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Keep learning</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <OptBtn icon={Film} label="Watch a Short Video" active={tab === "video"} onClick={() => setTab("video")} />
          <OptBtn icon={MapPin} label="Explore on Map" active={tab === "map"} onClick={() => setTab("map")} />
          <Link to="/chatbot" search={{ q: `I just snapped a photo of ${r.feature} (${r.topic}). Can you teach me more about it with Ghanaian examples?` }}
            className="flex flex-col items-center gap-1 rounded-2xl border bg-background p-3 text-center text-xs font-medium hover:border-primary">
            <Bot className="h-5 w-5 text-primary" />Ask GeoGuide
          </Link>
          <OptBtn icon={Target} label="Take a Quiz" active={tab === "quiz"} onClick={() => setTab("quiz")} />
          <OptBtn icon={BookOpen} label="Learn More" active={tab === "more"} onClick={() => setTab("more")} />
        </div>
        <div className="mt-4">
          {tab === "video" && <VideoLesson r={r} done={d.xp_events?.includes("lesson")} onDone={props.onLesson} />}
          {tab === "map" && <MapExplore r={r} approx={props.approx} />}
          {tab === "quiz" && <SnapQuiz r={r} previous={d.quiz_total ? `${d.quiz_score}/${d.quiz_total}` : null} onDone={props.onQuiz} />}
          {tab === "more" && (
            <ul className="space-y-2 text-sm">
              {r.learn_more.map((l) => <li key={l.url}><a className="text-primary underline" href={l.url} target="_blank" rel="noreferrer">{l.title}</a></li>)}
              <li><Link to="/games" className="text-primary underline">Play geography games</Link> · <Link to="/image-generator" className="text-primary underline">Make a diagram</Link></li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border bg-card p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <p className="mt-2 leading-relaxed">{children}</p>
    </div>
  );
}

function OptBtn({ icon: Icon, label, active, onClick }: { icon: typeof Film; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center text-xs font-medium transition ${active ? "border-primary bg-primary/10" : "bg-background hover:border-primary"}`}>
      <Icon className="h-5 w-5 text-primary" />{label}
    </button>
  );
}

type YT = { id: string; title: string; thumbnail: string; channel?: string };

function VideoLesson({ r, done, onDone }: { r: SnapResult; done?: boolean; onDone: () => void }) {
  const [step, setStep] = useState(-1);
  const [speaking, setSpeaking] = useState(false);
  const [videos, setVideos] = useState<YT[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [vidErr, setVidErr] = useState<string | null>(null);
  const segs = r.video.segments ?? [];

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const token = await getRequiredAccessToken();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
          body: JSON.stringify({ query: r.video.search_query, max: 3 }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || "Video search failed");
        if (!cancel) setVideos(data.videos ?? []);
      } catch (e) {
        if (!cancel) setVidErr(e instanceof Error ? e.message : "Video search failed");
      }
    })();
    return () => { cancel = true; window.speechSynthesis?.cancel(); };
  }, [r.video.search_query]);

  const play = () => {
    if (!("speechSynthesis" in window)) { setStep(0); return; }
    window.speechSynthesis.cancel();
    setSpeaking(true);
    segs.forEach((s, i) => {
      const u = new SpeechSynthesisUtterance(`${s.heading}. ${s.narration}`);
      u.rate = 0.95;
      u.onstart = () => setStep(i);
      if (i === segs.length - 1) u.onend = () => { setSpeaking(false); onDone(); };
      window.speechSynthesis.speak(u);
    });
  };
  const stop = () => { window.speechSynthesis?.cancel(); setSpeaking(false); };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-secondary/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold">🎬 {r.video.title}</p>
          {speaking ? <Button size="sm" variant="outline" onClick={stop}><Square className="mr-1 h-4 w-4" />Stop</Button>
            : <Button size="sm" onClick={play}><Volume2 className="mr-1 h-4 w-4" />Play narrated lesson</Button>}
        </div>
        <ol className="mt-3 space-y-2">
          {segs.map((s, i) => (
            <li key={i} className={`rounded-xl border p-3 text-sm transition ${step === i ? "border-primary bg-card" : "bg-background/60"}`}>
              <b>{i + 1}. {s.heading}</b><p className="text-muted-foreground">{s.narration}</p>
            </li>
          ))}
        </ol>
        {!done && <Button size="sm" variant="secondary" className="mt-3" onClick={onDone}>Mark lesson watched (+{XP.lesson} XP)</Button>}
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Related videos</p>
        {vidErr && <p className="text-sm text-muted-foreground">{vidErr}</p>}
        {!videos && !vidErr && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Finding videos…</p>}
        {playing && (
          <div className="mb-3 aspect-video overflow-hidden rounded-2xl">
            <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${playing}?autoplay=1`} title="Video" allow="autoplay; encrypted-media" allowFullScreen />
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          {videos?.map((v) => (
            <button key={v.id} onClick={() => setPlaying(v.id)} className="overflow-hidden rounded-xl border bg-background text-left text-xs hover:border-primary">
              <img src={v.thumbnail} alt="" className="aspect-video w-full object-cover" />
              <p className="line-clamp-2 p-2 font-medium">{v.title}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MapExplore({ r, approx }: { r: SnapResult; approx: { lat: number; lng: number } | null }) {
  const places = r.where_found.filter((w) => typeof w.lat === "number" && typeof w.lng === "number");
  const initial = places[0] ? { lat: places[0].lat!, lng: places[0].lng!, label: places[0].place } : approx ? { ...approx, label: "Your area" } : { lat: 7.95, lng: -1.03, label: "Ghana" };
  const [sel, setSel] = useState(initial);
  const d = sel.label === "Ghana" ? 3 : 0.25;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${sel.lng - d},${sel.lat - d},${sel.lng + d},${sel.lat + d}&layer=mapnik&marker=${sel.lat},${sel.lng}`;
  return (
    <div className="space-y-3">
      <div className="aspect-video overflow-hidden rounded-2xl border">
        <iframe title="Map" src={src} className="h-full w-full" loading="lazy" />
      </div>
      <div className="flex flex-wrap gap-2">
        {places.map((p) => (
          <button key={p.place} onClick={() => setSel({ lat: p.lat!, lng: p.lng!, label: p.place })}
            className={`rounded-full border px-3 py-1 text-xs ${sel.label === p.place ? "border-primary bg-primary/10" : "bg-background"}`}>📍 {p.place}</button>
        ))}
        {approx && <button onClick={() => setSel({ ...approx, label: "Your area" })} className="rounded-full border bg-background px-3 py-1 text-xs">🧭 My approximate area</button>}
      </div>
      <p className="text-xs text-muted-foreground">Map © OpenStreetMap contributors. Your area is rounded to about 10 km.</p>
    </div>
  );
}

function SnapQuiz({ r, previous, onDone }: { r: SnapResult; previous: string | null; onDone: (s: number, t: number) => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const isRight = (i: number) => {
    const q = r.quiz[i]; const a = answers[i] ?? "";
    if (q.type === "short") { const n = norm(a), k = norm(q.answer); return !!n && (n === k || k.includes(n) || n.includes(k)); }
    return norm(a) === norm(q.answer);
  };
  const score = r.quiz.filter((_, i) => isRight(i)).length;
  const submit = () => { setSubmitted(true); onDone(score, r.quiz.length); };
  return (
    <div className="space-y-4">
      {previous && !submitted && <p className="text-sm text-muted-foreground">Previous score: {previous}</p>}
      {r.quiz.map((q, i) => (
        <div key={i} className="rounded-2xl border bg-background p-4">
          <p className="font-medium">{i + 1}. {q.question}</p>
          {q.type === "short" ? (
            <input disabled={submitted} value={answers[i] ?? ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
              className="mt-2 w-full rounded-xl border bg-card px-3 py-2 text-sm" placeholder="Type your answer" />
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {q.options.map((o) => (
                <button key={o} disabled={submitted} onClick={() => setAnswers({ ...answers, [i]: o })}
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${answers[i] === o ? "border-primary bg-primary/10" : "bg-card"}`}>{o}</button>
              ))}
            </div>
          )}
          {submitted && (
            <p className={`mt-2 flex gap-1 text-sm ${isRight(i) ? "text-primary" : "text-destructive"}`}>
              {isRight(i) ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              <span>{isRight(i) ? "Correct!" : `Answer: ${q.answer}.`} <span className="text-muted-foreground">{q.explanation}</span></span>
            </p>
          )}
        </div>
      ))}
      {!submitted ? (
        <Button onClick={submit} disabled={Object.keys(answers).length < r.quiz.length}><Sparkles className="mr-1 h-4 w-4" />Check my answers</Button>
      ) : (
        <div className="flex items-center justify-between rounded-2xl bg-primary/10 p-4">
          <p className="font-display text-xl font-bold">Score: {score}/{r.quiz.length}</p>
          <Button variant="outline" size="sm" onClick={() => { setAnswers({}); setSubmitted(false); }}>Try again</Button>
        </div>
      )}
    </div>
  );
}
