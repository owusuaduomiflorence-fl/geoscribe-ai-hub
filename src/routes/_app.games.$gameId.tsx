import { createFileRoute } from "@tanstack/react-router";
import { QuizGame } from "@/components/games/QuizGame";
import { MatchGame } from "@/components/games/MatchGame";
import { 
  GAMES, 
  EUROPEAN_CAPITALS, 
  ASIAN_CAPITALS, 
  US_CAPITALS, 
  LANDFORMS, 
  CLIMATE_ZONES, 
  LANDMARKS,
  AFRICAN_CAPITALS,
  GEO_TERMS
} from "@/lib/games-data";

export const Route = createFileRoute("/_app/games/$gameId")({
  component: GamePage
});

function GamePage() {
  const { gameId } = Route.useParams();
  const game = GAMES.find(g => g.id === gameId);

  if (!game) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold mb-2">Game Not Found</h2>
        <p className="text-muted-foreground">Sorry, we couldn't find the game you're looking for.</p>
      </div>
    );
  }

  // Map gameId to data
  const dataMap: Record<string, any> = {
    "african-capitals": AFRICAN_CAPITALS,
    "european-capitals": EUROPEAN_CAPITALS,
    "asian-capitals": ASIAN_CAPITALS,
    "us-capitals": US_CAPITALS,
    "geo-terms": GEO_TERMS,
    "landforms": LANDFORMS,
    "climate-zones": CLIMATE_ZONES,
    "landmarks": LANDMARKS,
  };

  const questions = dataMap[gameId];

  if (game.type === "quiz") {
    return <QuizGame title={game.title} gameId={game.id} questions={questions} />;
  } else {
    return <MatchGame title={game.title} gameId={game.id} pairs={questions} />;
  }
}
