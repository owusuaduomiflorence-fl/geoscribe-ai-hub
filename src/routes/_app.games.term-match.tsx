import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/games/term-match")({ component: TermMatch });

const PAIRS: [string, string][] = [
  ["Equator", "Imaginary line at 0° latitude"],
  ["Delta", "Triangular landform at a river mouth"],
  ["Savanna", "Tropical grassland with scattered trees"],
  ["Erosion", "Wearing away of land by water/wind"],
  ["Latitude", "Distance north or south of the equator"],
  ["Tributary", "Smaller river joining a larger one"],
];

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

function TermMatch() {
  const { user } = useAuth();
  const terms = useMemo(() => shuffle(PAIRS.map((p) => p[0])), []);
  const defs = useMemo(() => shuffle(PAIRS.map((p) => p[1])), []);
  const correct = useMemo(() => Object.fromEntries(PAIRS), []);

  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const onPickDef = (def: string) => {
    if (!selectedTerm) return;
    setMatches((m) => ({ ...m, [selectedTerm]: def }));
    setSelectedTerm(null);
    if (Object.keys({ ...matches, [selectedTerm]: def }).length === PAIRS.length) {
      const score = PAIRS.filter(([t, d]) => ({ ...matches, [selectedTerm]: def })[t] === d).length;
      if (user) supabase.from("game_scores").insert({ user_id: user.id, game: "term-match", score });
      setTimeout(() => setDone(true), 300);
    }
  };

  const score = PAIRS.filter(([t, d]) => matches[t] === d).length;

  if (done) {
    return (
      <div className="p-10 max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-2">Score: {score} / {PAIRS.length}</h2>
        <div className="mt-6 space-y-2 text-sm text-left">
          {PAIRS.map(([t, d]) => (
            <div key={t} className="rounded border border-border p-3">
              <b>{t}</b> → {d} {matches[t] === d ? "✅" : `❌ (you picked: ${matches[t]})`}
            </div>
          ))}
        </div>
        <Button className="mt-6" onClick={() => location.reload()}>Play again</Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl font-semibold mb-2">Term Match</h1>
      <p className="text-sm text-muted-foreground mb-6">Tap a term, then tap its definition.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-xs uppercase text-muted-foreground mb-2">Terms</div>
          <div className="space-y-2">
            {terms.map((t) => {
              const matched = !!matches[t];
              return (
                <button
                  key={t}
                  disabled={matched}
                  onClick={() => setSelectedTerm(t)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                    matched ? "border-border bg-muted text-muted-foreground line-through"
                    : selectedTerm === t ? "border-primary bg-primary/20"
                    : "border-border bg-card hover:bg-card/80"
                  }`}
                >{t}</button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground mb-2">Definitions</div>
          <div className="space-y-2">
            {defs.map((d) => {
              const used = Object.values(matches).includes(d);
              return (
                <button
                  key={d}
                  disabled={used || !selectedTerm}
                  onClick={() => onPickDef(d)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                    used ? "border-border bg-muted text-muted-foreground"
                    : "border-border bg-card hover:bg-card/80"
                  }`}
                >{d}</button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
