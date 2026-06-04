import { createFileRoute, Link } from "@tanstack/react-router";
import { QuizGame } from "@/components/games/QuizGame";
import { MatchGame } from "@/components/games/MatchGame";
import { Button } from "@/components/ui/button";
import { 
  GAMES, 
  EUROPEAN_CAPITALS, 
  ASIAN_CAPITALS, 
  US_CAPITALS, 
  LANDFORMS, 
  CLIMATE_ZONES, 
  LANDMARKS,
  AFRICAN_CAPITALS,
  GEO_TERMS,
  OCEANS,
  TECTONICS
} from "@/lib/games-data";

export const Route = createFileRoute("/_app/games/$gameId")({
  component: GamePage
});

function GamePage() {
  const { gameId } = Route.useParams();
  const game = GAMES.find(g => g.id === gameId);

  if (!game) {
    return (
      <div className="p-20 text-center max-w-md mx-auto">
        <h2 className="text-3xl font-bold mb-4">Game Not Found</h2>
        <p className="text-muted-foreground mb-8 text-lg">Sorry, we couldn't find the geography game you're looking for.</p>
        <Button asChild>
          <Link to="/games">Back to Hub</Link>
        </Button>
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
    "oceans": OCEANS,
    "tectonics": TECTONICS,
  };

  const questions = dataMap[gameId];

  if (!questions) {
    return (
      <div className="p-20 text-center max-w-md mx-auto">
        <h2 className="text-3xl font-bold mb-4">Data Missing</h2>
        <p className="text-muted-foreground mb-8 text-lg">This game seems to be missing its content. Please contact support.</p>
        <Button asChild>
          <Link to="/games">Back to Hub</Link>
        </Button>
      </div>
    );
  }

  if (game.type === "quiz") {
    return <QuizGame title={game.title} gameId={game.id} questions={questions} />;
  } else {
    return <MatchGame title={game.title} gameId={game.id} pairs={questions} />;
  }
}
