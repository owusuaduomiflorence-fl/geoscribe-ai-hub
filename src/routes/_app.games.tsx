import { createFileRoute, Link } from "@tanstack/react-router";
import { Map, Shuffle } from "lucide-react";

export const Route = createFileRoute("/_app/games")({ component: Games });

function Games() {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl font-semibold mb-2">Geography Games</h1>
      <p className="text-muted-foreground mb-8">Practice while you play. High scores are saved.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/games/map-quiz" className="rounded-2xl border border-border bg-card p-6 hover:bg-card/80 shadow-card">
          <Map className="h-8 w-8 text-primary mb-3" />
          <div className="font-semibold text-lg mb-1">African Capitals Quiz</div>
          <div className="text-sm text-muted-foreground">Pick the right capital for each country. 10 rounds.</div>
        </Link>
        <Link to="/games/term-match" className="rounded-2xl border border-border bg-card p-6 hover:bg-card/80 shadow-card">
          <Shuffle className="h-8 w-8 text-primary mb-3" />
          <div className="font-semibold text-lg mb-1">Term Match</div>
          <div className="text-sm text-muted-foreground">Match geography terms to their definitions.</div>
        </Link>
      </div>
    </div>
  );
}
