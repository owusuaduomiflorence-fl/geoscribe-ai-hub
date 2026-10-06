import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type Award = (xp: number, lab: string) => void;

/* ---------- Contour Lab ---------- */
export function ContourLab({ onXp }: { onXp: Award }) {
  const [height, setHeight] = useState(300);
  const [steepLeft, setSteepLeft] = useState(true);
  const [interval, setInterval] = useState(50);
  const [answer, setAnswer] = useState<string | null>(null);
  const rings = Math.floor(height / interval);
  const W = 320, H = 220, cx = 160, cy = 110;

  const ellipses = Array.from({ length: rings }, (_, i) => {
    const t = 1 - i / Math.max(rings, 1);
    const rx = 20 + 120 * t;
    const ry = 15 + 80 * t;
    const shift = (steepLeft ? -1 : 1) * 40 * (1 - t);
    return { rx, ry, x: cx + shift, h: (i + 1) * interval };
  });

  const profile = useMemo(() => {
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 4) {
      let h = 0;
      ellipses.forEach((e) => {
        if (Math.abs(x - e.x) <= e.rx) h = Math.max(h, e.h);
      });
      pts.push(`${x},${100 - (h / 600) * 90}`);
    }
    return pts.join(" ");
  }, [ellipses]);

  const check = (side: string) => {
    setAnswer(side);
    if ((side === "left") === steepLeft) onXp(10, "contour");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Build a hill! Contour lines join places of equal height. Lines <b>close together</b> = steep slope; <b>far apart</b> = gentle slope.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border bg-card">
          {ellipses.map((e, i) => (
            <g key={i}>
              <ellipse cx={e.x} cy={cy} rx={e.rx} ry={e.ry} fill="none" stroke="var(--primary)" strokeWidth={i % 2 ? 1 : 1.8} />
              <text x={e.x + e.rx - 14} y={cy + 4} fontSize="8" fill="var(--foreground)">{e.h}</text>
            </g>
          ))}
          <text x={cx - 4} y={cy + 3} fontSize="10" fill="var(--accent)">▲</text>
          <text x={6} y={14} fontSize="9" fill="var(--muted-foreground)">Plan view (contours, m)</text>
        </svg>
        <svg viewBox={`0 0 ${W} 110`} className="w-full rounded-xl border bg-card">
          <polyline points={`0,100 ${profile} ${W},100`} fill="color-mix(in oklab, var(--primary) 25%, transparent)" stroke="var(--primary)" strokeWidth="2" />
          <text x={6} y={14} fontSize="9" fill="var(--muted-foreground)">Cross-section (side view)</text>
        </svg>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Hill height: <b>{height} m</b>
          <Slider min={100} max={600} step={50} value={[height]} onValueChange={(v) => setHeight(v[0])} className="mt-2" />
        </label>
        <label className="text-sm">Contour interval: <b>{interval} m</b>
          <Slider min={25} max={100} step={25} value={[interval]} onValueChange={(v) => setInterval(v[0])} className="mt-2" />
        </label>
      </div>
      <div className="rounded-xl border bg-muted/40 p-4">
        <p className="font-medium">Challenge: which side of this hill is steeper?</p>
        <div className="mt-2 flex gap-2">
          <Button variant="outline" onClick={() => check("left")}>West (left)</Button>
          <Button variant="outline" onClick={() => check("right")}>East (right)</Button>
          <Button variant="ghost" onClick={() => { setSteepLeft(Math.random() > 0.5); setAnswer(null); }}>New hill</Button>
        </div>
        {answer && (
          <p className="mt-2 text-sm">
            {(answer === "left") === steepLeft ? "✅ Correct! The lines are bunched together on that side. +10 XP" : "❌ Look again: where are the lines closest together?"}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- Scale Lab ---------- */
const SCALES = [25000, 50000, 62500, 100000];
function newScaleQ() {
  return { scale: SCALES[Math.floor(Math.random() * SCALES.length)], cm: Math.floor(Math.random() * 9) + 2 };
}
export function ScaleLab({ onXp }: { onXp: Award }) {
  const [q, setQ] = useState(newScaleQ);
  const [val, setVal] = useState("");
  const [msg, setMsg] = useState("");
  const km = (q.cm * q.scale) / 100000;
  const submit = () => {
    const n = parseFloat(val);
    if (Math.abs(n - km) < 0.01) { setMsg(`✅ Spot on! ${q.cm} cm × ${q.scale.toLocaleString()} = ${km} km. +10 XP`); onXp(10, "scale"); }
    else setMsg(`❌ Not quite. Multiply ${q.cm} cm by ${q.scale.toLocaleString()}, then divide by 100,000 to get km.`);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">A map scale of 1:{q.scale.toLocaleString()} means 1 cm on the map = {q.scale.toLocaleString()} cm on the ground.</p>
      <div className="rounded-xl border bg-card p-4">
        <p>🚌 On a 1:{q.scale.toLocaleString()} map, the road from Kumasi junction to the village measures <b>{q.cm} cm</b>.</p>
        <div className="mt-3 h-3 rounded-full bg-primary" style={{ width: `${q.cm * 9}%` }} />
        <p className="mt-3 font-medium">How many kilometres is the real road?</p>
        <div className="mt-2 flex gap-2">
          <input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" className="w-32 rounded-md border bg-background px-3 py-2" placeholder="km" />
          <Button onClick={submit}>Check</Button>
          <Button variant="ghost" onClick={() => { setQ(newScaleQ()); setVal(""); setMsg(""); }}>Next</Button>
        </div>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
      </div>
    </div>
  );
}

/* ---------- Grid Reference Lab ---------- */
const E0 = 20, N0 = 40, SIZE = 8;
const PLACES = ["⛪ church", "🏫 school", "🌳 forest", "💧 well", "🏥 clinic", "⛽ fuel station"];
function newGridQ() {
  return { e: E0 + Math.floor(Math.random() * SIZE), n: N0 + Math.floor(Math.random() * SIZE), place: PLACES[Math.floor(Math.random() * PLACES.length)] };
}
export function GridLab({ onXp }: { onXp: Award }) {
  const [q, setQ] = useState(newGridQ);
  const [msg, setMsg] = useState("");
  const click = (e: number, n: number) => {
    if (e === q.e && n === q.n) { setMsg("✅ Found it! Eastings first (along the corridor), then northings (up the stairs). +10 XP"); onXp(10, "grid"); setTimeout(() => { setQ(newGridQ()); setMsg(""); }, 1200); }
    else setMsg(`❌ You clicked ${e}${n}. Remember: go along the corridor, then up the stairs.`);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Find the square for the {q.place} at grid reference <b className="text-foreground">{q.e}{q.n}</b>.</p>
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `24px repeat(${SIZE}, minmax(28px, 40px))` }}>
        {Array.from({ length: SIZE }, (_, r) => {
          const n = N0 + SIZE - 1 - r;
          return [
            <div key={`l${n}`} className="flex items-center text-xs text-muted-foreground">{n}</div>,
            ...Array.from({ length: SIZE }, (_, c) => {
              const e = E0 + c;
              return <button key={`${e}${n}`} onClick={() => click(e, n)} className="aspect-square rounded-sm border bg-card hover:bg-primary/20" aria-label={`Square ${e}${n}`} />;
            }),
          ];
        })}
        <div />
        {Array.from({ length: SIZE }, (_, c) => <div key={c} className="text-center text-xs text-muted-foreground">{E0 + c}</div>)}
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}

/* ---------- Symbols Lab ---------- */
const SYMBOLS: [string, string][] = [
  ["✚ red cross", "Hospital / clinic"], ["▬▬ thick red line", "Main road"], ["┄┄ dashed line", "Footpath"],
  ["🔵 blue line", "River / stream"], ["▲ triangle with number", "Trigonometrical station"], ["⛪ cross on square", "Church"],
];
export function SymbolsLab({ onXp }: { onXp: Award }) {
  const [sel, setSel] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const order = useMemo(() => SYMBOLS.map((_, i) => i).sort(() => Math.random() - 0.5), []);
  const pick = (i: number) => {
    if (sel === null) return;
    if (sel === i) { setDone((d) => [...d, i]); onXp(5, "symbols"); }
    setSel(null);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Tap a symbol, then tap its meaning. ({done.length}/{SYMBOLS.length})</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">{SYMBOLS.map(([s], i) => (
          <button key={s} disabled={done.includes(i)} onClick={() => setSel(i)} className={`w-full rounded-lg border p-2 text-left text-sm ${done.includes(i) ? "bg-primary/20 opacity-60" : sel === i ? "border-primary bg-primary/10" : "bg-card"}`}>{s}</button>
        ))}</div>
        <div className="space-y-2">{order.map((i) => (
          <button key={i} disabled={done.includes(i)} onClick={() => pick(i)} className={`w-full rounded-lg border p-2 text-left text-sm ${done.includes(i) ? "bg-primary/20 opacity-60" : "bg-card"}`}>{SYMBOLS[i][1]}</button>
        ))}</div>
      </div>
      {done.length === SYMBOLS.length && <p className="text-sm">🎉 All matched! You read maps like a surveyor.</p>}
    </div>
  );
}
