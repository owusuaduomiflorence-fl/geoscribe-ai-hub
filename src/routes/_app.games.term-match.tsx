import { createFileRoute } from "@tanstack/react-router";
import { MatchGame } from "@/components/games/MatchGame";
import { GEO_TERMS } from "@/lib/games-data";

export const Route = createFileRoute("/_app/games/term-match")({
  component: () => <MatchGame title="Geo Term Match" gameId="term-match" pairs={GEO_TERMS} />
});
