import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Globe, Map, MapPin, Flag, Book, Mountain, CloudSun, Compass, 
  Trophy, History, ArrowRight, Play
} from "lucide-react";
import { GAMES } from "@/lib/games-data";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/games/")({ component: GamesHub });

const iconMap: Record<string, any> = {
  Globe, Map, MapPin, Flag, Book, Mountain, CloudSun, Compass
};

function GamesHub() {
  const { user } = useAuth();

  const { data: scores, isLoading } = useQuery({
    queryKey: ["recent-scores", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("game_scores")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getGameTitle = (id: string) => {
    if (id === "map-quiz") return "African Capitals";
    if (id === "term-match") return "Geo Term Match";
    return GAMES.find(g => g.id === id)?.title || id;
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Geography Hub</h1>
          <p className="text-muted-foreground text-lg">Challenge yourself and climb the leaderboard.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 px-4 py-2 rounded-full">
          <Trophy className="h-4 w-4" />
          <span>High scores are automatically saved</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Available Games
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Legacy routes kept to avoid breaking */}
              <Link 
                to="/games/map-quiz" 
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Globe className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <div className="mt-4">
                  <div className="font-bold text-lg mb-1">African Capitals Quiz</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">The classic Geo Match. Master the capitals of Africa.</div>
                </div>
              </Link>

              <Link 
                to="/games/term-match" 
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Book className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <div className="mt-4">
                  <div className="font-bold text-lg mb-1">Geo Term Match</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">Match geography terms to their correct definitions.</div>
                </div>
              </Link>

              {GAMES.filter(g => g.id !== "african-capitals" && g.id !== "geo-terms").map((game) => {
                const Icon = iconMap[game.icon] || Globe;
                return (
                  <Link 
                    key={game.id}
                    to="/games/$gameId" 
                    params={{ gameId: game.id }}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                    <div className="mt-4">
                      <div className="font-bold text-lg mb-1">{game.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">{game.description}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-8">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Scores
            </h2>
            <div className="space-y-4">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))
              ) : scores && scores.length > 0 ? (
                scores.map((s) => (
                  <div key={s.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{getGameTitle(s.game)}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">
                          {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {s.score}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm italic">
                  No scores yet. Start playing!
                </div>
              )}
            </div>
            {scores && scores.length > 0 && (
              <Button asChild variant="link" className="w-full mt-4 text-xs">
                <Link to="/profile">View all in profile →</Link>
              </Button>
            )}
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
            <h3 className="font-bold mb-2">Want a new game?</h3>
            <p className="text-sm opacity-90 mb-4">Suggest a topic to Geoguide AI and we might add it to the hub!</p>
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link to="/chatbot">Talk to AI</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
