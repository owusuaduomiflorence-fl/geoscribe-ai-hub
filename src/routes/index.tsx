import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Globe2,
  MessageSquare,
  Image as ImageIcon,
  LayoutDashboard,
  Map,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center">
              <Globe2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-lg">Geoguide AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#everything" className="hover:text-foreground transition">Tools</a>
            <Link to="/about" className="hover:text-foreground transition">About</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-hero">
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Built on the GES Geography Syllabus
          </div>
          <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
            Master Geography with{" "}
            <span className="text-gradient">AI-Powered Learning</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            From the climate of Ghana to the rivers of Africa — learn the GES syllabus
            with an AI tutor, generate visual aids, and keep a personal study journal.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="shadow-glow">
                Get Started <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline">Learn More</Button>
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              ["50+", "Topics Covered"],
              ["24/7", "AI Interactions"],
              ["Unlimited", "Image Generations"],
              ["100%", "GES Aligned"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-xl border border-border bg-gradient-card p-5">
                <div className="text-2xl font-display font-bold text-gradient">{n}</div>
                <div className="text-xs text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center">Why Geoguide AI</h2>
          <p className="text-muted-foreground text-center mt-3 max-w-xl mx-auto">
            Three pillars that make geography click — visual, conversational, structured.
          </p>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              {
                Icon: Map,
                title: "Interactive Visuals",
                body:
                  "Generate maps, diagrams, and illustrations on demand for any topic in the syllabus.",
              },
              {
                Icon: MessageSquare,
                title: "AI Assistant",
                body:
                  "Ask questions and get answers grounded in the GES syllabus — like having a tutor 24/7.",
              },
              {
                Icon: GraduationCap,
                title: "Structured Learning",
                body:
                  "Track topics, save key insights to your journal, and revisit lessons whenever you need.",
              },
            ].map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-lg">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Everything you need */}
      <section id="everything" className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center">
            Everything You Need to Excel
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              {
                Icon: LayoutDashboard,
                title: "Personal Dashboard",
                body:
                  "See your progress, recent chats, and generated content in one calm overview.",
              },
              {
                Icon: MessageSquare,
                title: "AI Chatbot",
                body:
                  "A patient tutor that only answers GES-aligned geography questions.",
              },
              {
                Icon: ImageIcon,
                title: "Image Generator",
                body:
                  "Bring abstract concepts to life with vivid, classroom-ready illustrations.",
              },
            ].map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition"
              >
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-semibold text-lg">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to="/auth">
              <Button size="lg" className="shadow-glow">
                Start learning free <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Geoguide AI · Aligned with the GES Geography Syllabus
      </footer>
    </div>
  );
}
