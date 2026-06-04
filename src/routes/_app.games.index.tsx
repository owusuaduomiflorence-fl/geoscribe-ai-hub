import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Globe, Map, MapPin, Flag, Book, Mountain, CloudSun, Compass, 
  Trophy, History, ArrowRight, Play, Waves, Layers
} from "lucide-react";
import { GAMES } from "@/lib/games-data";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/games/")({ component: GamesHub });

const iconMap: Record<string, any> = {
  Globe, Map, MapPin, Flag, Book, Mountain, CloudSun, Compass, Waves, Layers
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
          <h1 className="font-display text-4xl font-bold mb-2 tracking-tight">Geography Hub</h1>
          <p className="text-muted-foreground text-lg max-w-xl">Challenge yourself, practice your geography skills, and climb the leaderboard.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20 shadow-sm">
          <Trophy className="h-4 w-4 animate-pulse" />
          <span>High scores are automatically saved</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Play className="h-5 w-5 text-primary" />
              </div>
              Playable Games
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Legacy routes kept to avoid breaking */}
              <Link 
                to="/games/map-quiz" 
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/50"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                      <Globe className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <div className="mt-5">
                    <div className="font-bold text-xl mb-1 tracking-tight">African Capitals Quiz</div>
                    <div className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">The classic Geo Match. Master the capitals of nations across Africa.</div>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2">
                   <span className="px-2 py-1 rounded-md bg-muted text-[10px] font-bold uppercase tracking-wider">Quiz</span>
                   <span className="px-2 py-1 rounded-md bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">10 Rounds</span>
                </div>
              </Link>

              <Link 
                to="/games/term-match" 
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/50"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                      <Book className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <div className="mt-5">
                    <div className="font-bold text-xl mb-1 tracking-tight">Geo Term Match</div>
                    <div className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">The classic Term Match. Connect geography terms with their correct definitions.</div>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2">
                   <span className="px-2 py-1 rounded-md bg-muted text-[10px] font-bold uppercase tracking-wider">Matching</span>
                   <span className="px-2 py-1 rounded-md bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">8 Pairs</span>
                </div>
              </Link>

              {GAMES.filter(g => g.id !== "african-capitals" && g.id !== "geo-terms").map((game) => {
                const Icon = iconMap[game.icon] || Globe;
                return (
                  <Link 
                    key={game.id}
                    to="/games/$gameId" 
                    params={{ gameId: game.id }}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/50"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                          <Icon className="h-6 w-6" />
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </div>
                      <div className="mt-5">
                        <div className="font-bold text-xl mb-1 tracking-tight">{game.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{game.description}</div>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                       <span className="px-2 py-1 rounded-md bg-muted text-[10px] font-bold uppercase tracking-wider">{game.type === "quiz" ? "Quiz" : "Matching"}</span>
                       <span className="px-2 py-1 rounded-md bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Level 1</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-8">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm border-b-4 border-b-primary/20">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Scores
            </h2>
            <div className="space-y-6">
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
                      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors border border-border/50">
                        <Trophy className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold tracking-tight">{getGameTitle(s.game)}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                          {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-black text-primary">
                      {s.score}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm italic bg-muted/30 rounded-2xl border border-dashed border-border">
                  No scores yet.<br/>Start your journey today!
                </div>
              )}
            </div>
            {scores && scores.length > 0 && (
              <Button asChild variant="link" className="w-full mt-6 text-xs font-bold uppercase tracking-widest hover:no-underline hover:text-primary/70 transition-colors">
                <Link to="/profile">View all activity →</Link>
              </Button>
            )}
          </div>

          <div className="rounded-3xl bg-primary p-8 text-primary-foreground shadow-lg shadow-primary/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 h-40 w-40 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <h3 className="font-bold text-xl mb-3 relative z-10">Want a custom challenge?</h3>
            <p className="text-sm opacity-90 mb-6 leading-relaxed relative z-10 font-medium">Ask Geoguide AI to generate a quiz or study guide on any region or topic!</p>
            <Button asChild variant="secondary" size="lg" className="w-full rounded-2xl font-bold relative z-10 group-hover:scale-105 transition-transform">
              <Link to="/chatbot">Open AI Chatbot</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
