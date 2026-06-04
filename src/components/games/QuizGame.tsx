import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Trophy, ArrowLeft, RefreshCw } from "lucide-react";

interface QuizGameProps {
  title: string;
  gameId: string;
  questions: [string, string][];
  totalRounds?: number;
}

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

export function QuizGame({ title, gameId, questions, totalRounds = 10 }: QuizGameProps) {
  const { user } = useAuth();
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const rounds = useMemo(() => shuffle(questions).slice(0, totalRounds), [questions, totalRounds]);
  const current = rounds[round];
  
  const choices = useMemo(() => {
    if (!current) return [];
    const others = shuffle(questions.filter((q) => q[1] !== current[1])).slice(0, 3).map((q) => q[1]);
    return shuffle([current[1], ...others]);
  }, [round, current, questions]);

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

  const next = () => {
    setPicked(null);
    if (round + 1 >= rounds.length) {
      setDone(true);
      saveScore(score);
    } else setRound(round + 1);
  };

  const pick = (ans: string) => {
    if (picked) return;
    setPicked(ans);
    if (ans === current[1]) setScore((s) => s + 1);
  };

  if (done) {
    return (
      <div className="p-10 max-w-2xl mx-auto text-center animate-in fade-in zoom-in duration-300">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Game Over!</h2>
        <p className="text-muted-foreground mb-6 text-lg">
          You scored <span className="text-foreground font-semibold">{score} / {rounds.length}</span> in {title}
        </p>
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

  if (!current) return null;

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Link>
        <div className="text-sm font-medium px-3 py-1 bg-muted rounded-full">
          Round {round + 1} / {rounds.length}
        </div>
        <div className="text-sm font-medium text-primary">
          Score: {score}
        </div>
      </div>
      
      <div className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-sm text-center">
        <h1 className="text-xl font-medium text-muted-foreground mb-4 uppercase tracking-wider">{title}</h1>
        <h2 className="text-3xl md:text-4xl font-bold mb-10">{current[0]}</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {choices.map((c) => {
            const isCorrect = c === current[1];
            const isSelected = picked === c;
            const reveal = !!picked;
            
            return (
              <button
                key={c}
                onClick={() => pick(c)}
                disabled={!!picked}
                className={`px-6 py-4 rounded-xl border-2 text-base font-semibold transition-all ${
                  reveal && isCorrect ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : reveal && isSelected ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-background hover:border-primary/50 hover:bg-primary/5 shadow-sm active:scale-95"
                } ${picked && !isCorrect && !isSelected ? "opacity-50" : ""}`}
              >
                {c}
              </button>
            );
          })}
        </div>
        
        <div className="h-16 mt-8 flex items-center justify-center">
          {picked && (
            <Button size="lg" className="rounded-full px-8 animate-in slide-in-from-bottom-4 duration-300" onClick={next}>
              {round + 1 >= rounds.length ? "Finish" : "Next Question →"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
