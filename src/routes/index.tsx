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
  Video,
  Gamepad2,
  NotebookPen,
} from "lucide-react";
import heroStudent from "@/assets/hero-student.jpg";
import heroMap from "@/assets/hero-map.jpg";
import heroKids from "@/assets/hero-kids.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Geoguide AI — GES Geography Learning, Powered by AI" },
      { name: "description", content: "Master the GES geography syllabus with an AI tutor, on-demand visuals, motion video lessons, quizzes, and a personal study journal." },
      { property: "og:title", content: "Geoguide AI — GES Geography Learning, Powered by AI" },
      { property: "og:description", content: "AI tutor, image & video generation, classes, quizzes, and journal — built around the GES syllabus." },
      { property: "og:url", content: "https://geoscribe-ai-hub.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://geoscribe-ai-hub.lovable.app/" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap",
      },
    ],
  }),
});

const displayFont = { fontFamily: "'Bricolage Grotesque', 'Space Grotesk', sans-serif" };

function ScribbleUnderline() {
  return (
    <svg
      className="absolute -bottom-2 md:-bottom-3 left-0 w-full"
      viewBox="0 0 240 16"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M4 12c40-3 80-6 120-4 40 2 80 5 112 3"
        stroke="var(--color-land-orange)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Flower({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className} aria-hidden>
      <path d="M50 0 C60 30 90 30 100 50 C90 70 60 70 50 100 C40 70 10 70 0 50 C10 30 40 30 50 0" />
    </svg>
  );
}

function Landing() {
  return (
    <main className="min-h-screen bg-land-cream text-land-ink" style={displayFont}>
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-land-cream/85 backdrop-blur border-b border-land-ink/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-land-orange grid place-items-center">
              <Globe2 className="h-5 w-5 text-land-cream" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">Geoguide AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-land-ink/70">
            <a href="#features" className="hover:text-land-ink transition">Features</a>
            <a href="#tools" className="hover:text-land-ink transition">Tools</a>
            <Link to="/about" className="hover:text-land-ink transition">About</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-flex h-9 items-center rounded-full px-4 text-sm font-bold hover:bg-land-ink/5 transition">
              Sign in
            </Link>
            <Link
              to="/auth"
              className="inline-flex h-9 items-center rounded-full bg-land-ink px-4 text-sm font-bold text-land-cream hover:opacity-90 transition"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-14 md:pt-20 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-land-pink px-4 py-1.5 text-xs font-bold text-land-ink/80">
            <Sparkles className="h-3.5 w-3.5 text-land-orange" />
            All ages &amp; levels · Built on the GES Geography Syllabus
          </div>

          <h1 className="mt-6 text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.98]">
            Learning that fits
            <br />
            the{" "}
            <span className="relative inline-block text-land-green">
              Learner
              <ScribbleUnderline />
              <svg
                viewBox="0 0 24 24"
                className="absolute -top-3 -right-6 w-5 h-5 text-land-orange fill-current"
                aria-hidden
              >
                <path d="M12 2L14 8L20 9L15 13L16 19L11 16L6 19L7 13L2 9L8 8L12 2Z" />
              </svg>
            </span>
          </h1>

          <p className="mt-7 text-base md:text-lg text-land-ink/70 max-w-xl mx-auto font-medium">
            From the climate of Ghana to the rivers of Africa — learn the GES syllabus
            with an AI tutor, generate visual aids, and keep a personal study journal.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex h-12 items-center rounded-full bg-land-orange px-7 text-sm font-bold text-land-cream shadow-lg shadow-land-orange/30 hover:scale-[1.03] active:scale-95 transition"
            >
              Try a free session <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center rounded-full border-2 border-land-ink px-7 text-sm font-bold hover:bg-land-ink/5 active:scale-95 transition"
            >
              Browse tools
            </a>
          </div>
        </div>

        {/* Wavy ribbon with floating photos */}
        <div className="relative mt-10 md:mt-4 h-[300px] md:h-[380px]">
          <svg
            className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[140%] md:w-[110%] h-28 md:h-36"
            viewBox="0 0 1200 120"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              id="ribbonPath"
              d="M-40 70 C 150 10, 350 110, 600 60 C 850 10, 1050 110, 1240 50"
              stroke="var(--color-land-green)"
              strokeWidth="52"
              strokeLinecap="round"
            />
            <text className="fill-land-cream" fontSize="20" fontWeight="800" letterSpacing="3">
              <textPath href="#ribbonPath" startOffset="4%">
                GES ALIGNED • AI TUTOR • QUIZZES • VISUALS • CLASSROOMS • GES ALIGNED • AI TUTOR • QUIZZES
              </textPath>
            </text>
          </svg>

          {/* Left photo */}
          <div className="absolute left-[4%] md:left-[10%] top-6 w-28 md:w-40 -rotate-[8deg] z-20 hover:scale-105 transition-transform">
            <div className="bg-white p-1.5 rounded-2xl shadow-xl">
              <img
                src={heroMap}
                alt="Student pointing at a map of Africa"
                width={816}
                height={816}
                loading="lazy"
                className="w-full aspect-square object-cover rounded-xl"
              />
            </div>
            <div className="absolute -top-4 -right-3 w-9 h-9 bg-land-pink rounded-full grid place-items-center border-2 border-white shadow">
              <span className="text-sm">😊</span>
            </div>
          </div>

          {/* Center photo */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 md:-top-6 w-40 md:w-56 rotate-2 z-10 hover:scale-105 transition-transform">
            <div className="bg-white p-2 rounded-[28px] shadow-2xl">
              <img
                src={heroStudent}
                alt="Ghanaian student holding a geography textbook"
                width={704}
                height={944}
                className="w-full aspect-[3/4] object-cover rounded-[20px]"
              />
            </div>
          </div>

          {/* Right photo */}
          <div className="absolute right-[4%] md:right-[10%] top-16 md:top-20 w-24 md:w-36 rotate-[10deg] z-20 hover:scale-105 transition-transform">
            <div className="bg-white p-1.5 rounded-2xl shadow-xl">
              <img
                src={heroKids}
                alt="Students studying together with a tablet"
                width={816}
                height={816}
                loading="lazy"
                className="w-full aspect-square object-cover rounded-xl"
              />
            </div>
            <Flower className="absolute -top-5 -left-4 w-9 h-9 text-land-green" />
          </div>

          <Flower className="absolute left-[22%] bottom-2 w-8 h-8 text-land-orange/60 hidden md:block" />
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["50+", "Topics Covered"],
            ["24/7", "AI Tutor"],
            ["Unlimited", "Image Generations"],
            ["100%", "GES Aligned"],
          ].map(([n, l]) => (
            <div
              key={l}
              className="rounded-3xl border-2 border-land-ink/10 bg-white/60 p-5 text-center"
            >
              <div className="text-2xl font-extrabold text-land-green">{n}</div>
              <div className="text-xs font-semibold text-land-ink/60 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-land-ink/10">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-extrabold text-center tracking-tight">
            Why <span className="text-land-green">Geoguide AI</span>
          </h2>
          <p className="text-land-ink/60 text-center mt-3 max-w-xl mx-auto font-medium">
            Three pillars that make geography click — visual, conversational, structured.
          </p>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              {
                Icon: Map,
                title: "Interactive Visuals",
                body: "Generate maps, diagrams, and illustrations on demand for any topic in the syllabus.",
              },
              {
                Icon: MessageSquare,
                title: "AI Assistant",
                body: "Ask questions and get answers grounded in the GES syllabus — like having a tutor 24/7.",
              },
              {
                Icon: GraduationCap,
                title: "Structured Learning",
                body: "Track topics, save key insights to your journal, and revisit lessons whenever you need.",
              },
            ].map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-3xl border-2 border-land-ink/10 bg-white/70 p-6 hover:-translate-y-1 hover:shadow-xl transition"
              >
                <div className="h-11 w-11 rounded-2xl bg-land-green/15 grid place-items-center text-land-green">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-extrabold text-lg">{title}</h3>
                <p className="mt-2 text-sm text-land-ink/60 font-medium">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="py-20 border-t border-land-ink/10">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-extrabold text-center tracking-tight">
            Everything You Need to{" "}
            <span className="relative inline-block text-land-green">
              Excel
              <ScribbleUnderline />
            </span>
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { Icon: LayoutDashboard, title: "Personal Dashboard", body: "See your progress, recent chats, and generated content in one calm overview." },
              { Icon: MessageSquare, title: "AI Chatbot", body: "A patient tutor that only answers GES-aligned geography questions." },
              { Icon: ImageIcon, title: "Image Generator", body: "Bring abstract concepts to life with vivid, classroom-ready illustrations." },
              { Icon: Video, title: "Video Lessons", body: "Upload MP4s or embed YouTube videos and search topics automatically." },
              { Icon: Gamepad2, title: "Geography Games", body: "Play map quizzes and term-matching games that make revision fun." },
              { Icon: NotebookPen, title: "Study Journal", body: "Save key insights and revisit them before exams." },
            ].map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-3xl border-2 border-land-ink/10 bg-white/70 p-6 hover:border-land-orange/50 transition"
              >
                <Icon className="h-6 w-6 text-land-orange" />
                <h3 className="mt-4 font-extrabold text-lg">{title}</h3>
                <p className="mt-2 text-sm text-land-ink/60 font-medium">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to="/auth"
              className="inline-flex h-12 items-center rounded-full bg-land-orange px-8 text-sm font-bold text-land-cream shadow-lg shadow-land-orange/30 hover:scale-[1.03] active:scale-95 transition"
            >
              Start learning free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-land-ink/10 py-8 text-center text-sm font-semibold text-land-ink/50">
        © {new Date().getFullYear()} Geoguide AI · Aligned with the GES Geography Syllabus
      </footer>
    </main>
  );
}
