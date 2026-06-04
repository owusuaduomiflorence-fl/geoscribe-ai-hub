import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Trophy, ArrowLeft, RefreshCw } from "lucide-react";

interface MatchGameProps {
  title: string;
  gameId: string;
  pairs: [string, string][];
}

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

export function MatchGame({ title, gameId, pairs }: MatchGameProps) {
  const { user } = useAuth();
  const terms = useMemo(() => shuffle(pairs.map((p) => p[0])), [pairs]);
  const defs = useMemo(() => shuffle(pairs.map((p) => p[1])), [pairs]);

  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveScore = async (finalScore: number) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game: gameId,
        score: finalScore,
      });
      if (error) throw error;
      toast.success("Score saved!");
    } catch (error) {
      console.error("Error saving score:", error);
      toast.error("Failed to save score.");
    } finally {
      setSaving(false);
    }
  };

  const onPickDef = (def: string) => {
    if (!selectedTerm) return;
    const newMatches = { ...matches, [selectedTerm]: def };
    setMatches(newMatches);
    setSelectedTerm(null);
    
    if (Object.keys(newMatches).length === pairs.length) {
      const score = pairs.filter(([t, d]) => newMatches[t] === d).length;
      saveScore(score);
      setTimeout(() => setDone(true), 600);
    }
  };

  const score = pairs.filter(([t, d]) => matches[t] === d).length;

  if (done) {
    return (
      <div className="p-10 max-w-3xl mx-auto text-center animate-in fade-in zoom-in duration-300">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Results</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          Final Score: <span className="text-foreground font-semibold">{score} / {pairs.length}</span>
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-10">
          {pairs.map(([t, d]) => (
            <div key={t} className={`rounded-xl border p-4 shadow-sm ${
              matches[t] === d ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"
            }`}>
              <div className="font-bold flex items-center justify-between mb-1">
                {t}
                <span>{matches[t] === d ? "✅" : "❌"}</span>
              </div>
              <div className="text-sm text-muted-foreground">{d}</div>
              {matches[t] !== d && (
                <div className="mt-2 pt-2 border-t border-destructive/10 text-xs text-destructive italic">
                  You picked: {matches[t]}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Play again
          </Button>
          <Button asChild variant="outline">
            <Link to="/games" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Hub
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Link>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <div className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
          Progress: {Object.keys(matches).length} / {pairs.length}
        </div>
      </div>

      <p className="text-muted-foreground mb-10 text-center max-w-md mx-auto">
        Select a term on the left, then find its matching definition on the right.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-3">
          <div className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-4 pl-1">Terms</div>
          {terms.map((t) => {
            const matched = !!matches[t];
            const isSelected = selectedTerm === t;
            return (
              <button
                key={t}
                disabled={matched}
                onClick={() => setSelectedTerm(t)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  matched ? "border-muted bg-muted/30 text-muted-foreground opacity-50"
                  : isSelected ? "border-primary bg-primary/10 text-primary shadow-md scale-[1.02]"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5 shadow-sm active:scale-98"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        
        <div className="space-y-3">
          <div className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-4 pl-1">Definitions</div>
          {defs.map((d) => {
            const used = Object.values(matches).includes(d);
            return (
              <button
                key={d}
                disabled={used || !selectedTerm}
                onClick={() => onPickDef(d)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm transition-all ${
                  used ? "border-muted bg-muted/30 text-muted-foreground opacity-50"
                  : !selectedTerm ? "border-border bg-card/50 cursor-not-allowed opacity-60"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5 shadow-sm active:scale-98"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
