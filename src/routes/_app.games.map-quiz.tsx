import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/games/map-quiz")({ component: MapQuiz });

const COUNTRIES: [string, string][] = [
  ["Ghana", "Accra"], ["Nigeria", "Abuja"], ["Kenya", "Nairobi"], ["Egypt", "Cairo"],
  ["South Africa", "Pretoria"], ["Senegal", "Dakar"], ["Morocco", "Rabat"], ["Ethiopia", "Addis Ababa"],
  ["Uganda", "Kampala"], ["Tanzania", "Dodoma"], ["Algeria", "Algiers"], ["Tunisia", "Tunis"],
  ["Cameroon", "Yaoundé"], ["Ivory Coast", "Yamoussoukro"], ["Zambia", "Lusaka"], ["Zimbabwe", "Harare"],
];

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

function MapQuiz() {
  const { user } = useAuth();
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const rounds = useMemo(() => shuffle(COUNTRIES).slice(0, 10), []);
  const current = rounds[round];
  const choices = useMemo(() => {
    if (!current) return [];
    const others = shuffle(COUNTRIES.filter((c) => c[1] !== current[1])).slice(0, 3).map((c) => c[1]);
    return shuffle([current[1], ...others]);
  }, [round, current]);

  const next = () => {
    setPicked(null);
    if (round + 1 >= rounds.length) {
      setDone(true);
      if (user) supabase.from("game_scores").insert({ user_id: user.id, game: "map-quiz", score });
    } else setRound(round + 1);
  };

  const pick = (ans: string) => {
    if (picked) return;
    setPicked(ans);
    if (ans === current[1]) setScore((s) => s + 1);
  };

  if (done) {
    return (
      <div className="p-10 max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-2">Done!</h2>
        <p className="text-muted-foreground mb-6">You scored {score} / {rounds.length}</p>
        <Button onClick={() => location.reload()}>Play again</Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 text-sm text-muted-foreground">
        <span>Round {round + 1} / {rounds.length}</span>
        <span>Score: {score}</span>
      </div>
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="text-xs text-muted-foreground mb-2">What is the capital of</div>
        <h2 className="text-3xl font-bold mb-6">{current[0]}?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {choices.map((c) => {
            const correct = c === current[1];
            const reveal = !!picked;
            return (
              <button
                key={c}
                onClick={() => pick(c)}
                disabled={!!picked}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  reveal && correct ? "border-primary bg-primary/20"
                  : reveal && picked === c ? "border-destructive bg-destructive/20"
                  : "border-border bg-background hover:bg-card"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
        {picked && <Button className="mt-6" onClick={next}>Next →</Button>}
      </div>
    </div>
  );
}
