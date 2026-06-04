import { createFileRoute } from "@tanstack/react-router";
import { QuizGame } from "@/components/games/QuizGame";
import { AFRICAN_CAPITALS } from "@/lib/games-data";

export const Route = createFileRoute("/_app/games/map-quiz")({
  component: () => <QuizGame title="African Capitals Quiz" gameId="map-quiz" questions={AFRICAN_CAPITALS} />
});
