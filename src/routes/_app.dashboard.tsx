import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { displayNameFor } from "@/lib/display-name";
import { MessageSquare, Image as ImageIcon, Video, BookOpen, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Geoguide AI" },
      { name: "description", content: "Your personal Geoguide AI overview: recent chats, generated visuals, and study journal at a glance." },
      { property: "og:title", content: "Dashboard — Geoguide AI" },
      { property: "og:description", content: "Personal study overview." },
      { property: "og:url", content: "https://geoscribe-ai-hub.lovable.app/dashboard" },
    ],
    links: [{ rel: "canonical", href: "https://geoscribe-ai-hub.lovable.app/dashboard" }],
  }),
});

function Dashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      const [conv, img, vid, jrn] = await Promise.all([
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("generated_images").select("id", { count: "exact", head: true }),
        supabase.from("generated_videos").select("id", { count: "exact", head: true }),
        supabase.from("journal_entries").select("id", { count: "exact", head: true }),
      ]);
      return {
        conversations: conv.count ?? 0,
        images: img.count ?? 0,
        videos: vid.count ?? 0,
        entries: jrn.count ?? 0,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-activity", user?.id],
    queryFn: async () => {
      const [imgs, jrns, msgs] = await Promise.all([
        supabase
          .from("generated_images")
          .select("id, prompt, image_url, created_at")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("journal_entries")
          .select("id, title, created_at")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("messages")
          .select("id, content, role, created_at")
          .eq("role", "user")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      return { imgs: imgs.data ?? [], jrns: jrns.data ?? [], msgs: msgs.data ?? [] };
    },
  });

  const cards = [
    { label: "Conversations", value: stats?.conversations ?? 0, Icon: MessageSquare },
    { label: "Images Generated", value: stats?.images ?? 0, Icon: ImageIcon },
    { label: "Video Storyboards", value: stats?.videos ?? 0, Icon: Video },
    { label: "Journal Entries", value: stats?.entries ?? 0, Icon: BookOpen },
  ];

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Welcome back
      </div>
      <h1 className="mt-1 text-3xl md:text-4xl font-bold">
        Hi {user?.email?.split("@")[0]} 👋
      </h1>
      <p className="text-muted-foreground mt-2">
        Pick up where you left off, or start something new.
      </p>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-gradient-card p-5">
            <Icon className="h-5 w-5 text-primary" />
            <div className="mt-3 text-2xl font-display font-bold">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <Link to="/chatbot" className="rounded-xl border border-border bg-card hover:border-primary/40 transition p-5">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div className="mt-3 font-semibold">Ask the AI Tutor</div>
          <div className="text-sm text-muted-foreground mt-1">
            Get clear answers grounded in the GES syllabus.
          </div>
        </Link>
        <Link to="/image-generator" className="rounded-xl border border-border bg-card hover:border-primary/40 transition p-5">
          <ImageIcon className="h-5 w-5 text-primary" />
          <div className="mt-3 font-semibold">Generate an image</div>
          <div className="text-sm text-muted-foreground mt-1">
            Create a vivid illustration for any concept.
          </div>
        </Link>
        <Link to="/journal" className="rounded-xl border border-border bg-card hover:border-primary/40 transition p-5">
          <BookOpen className="h-5 w-5 text-primary" />
          <div className="mt-3 font-semibold">Open journal</div>
          <div className="text-sm text-muted-foreground mt-1">
            Save notes, attach images, build your library.
          </div>
        </Link>
      </div>

      <h2 className="mt-12 text-xl font-semibold">Recent activity</h2>
      <div className="mt-4 grid md:grid-cols-3 gap-4">
        <ActivityCard title="Recent questions" items={recent?.msgs.map((m) => ({ id: m.id, label: m.content.slice(0, 80) }))} empty="No questions yet" />
        <ActivityCard title="Recent images" items={recent?.imgs.map((m) => ({ id: m.id, label: m.prompt.slice(0, 80) }))} empty="No images yet" />
        <ActivityCard title="Recent journal" items={recent?.jrns.map((m) => ({ id: m.id, label: m.title }))} empty="No entries yet" />
      </div>
    </div>
  );
}

function ActivityCard({
  title,
  items,
  empty,
}: {
  title: string;
  items?: { id: string; label: string }[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="font-semibold text-sm">{title}</div>
      <ul className="mt-3 space-y-2">
        {items && items.length > 0 ? (
          items.map((it) => (
            <li key={it.id} className="text-sm text-muted-foreground line-clamp-1">
              · {it.label}
            </li>
          ))
        ) : (
          <li className="text-sm text-muted-foreground">{empty}</li>
        )}
      </ul>
    </div>
  );
}
