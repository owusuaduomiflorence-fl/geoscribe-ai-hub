import { createFileRoute } from "@tanstack/react-router";
import { Globe2, GraduationCap, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/about")({
  component: About,
  head: () => ({
    meta: [
      { title: "About Geoguide AI" },
      { name: "description", content: "Geoguide AI is a GES-aligned geography learning platform pairing an AI tutor with rich visual tools for Ghanaian students and teachers." },
      { property: "og:title", content: "About Geoguide AI" },
      { property: "og:description", content: "GES-aligned geography platform built around an AI tutor and visual tools." },
      { property: "og:url", content: "https://geoscribe-ai-hub.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://geoscribe-ai-hub.lovable.app/about" }],
  }),
});

function About() {
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-3xl mx-auto">
      <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
        <Globe2 className="h-6 w-6 text-primary-foreground" />
      </div>
      <h1 className="mt-5 text-3xl font-bold">About Geoguide AI</h1>
      <p className="mt-3 text-muted-foreground">
        Geoguide AI is a geography learning platform built around the Ghana Education Service
        (GES) syllabus. It pairs an AI tutor with rich visual tools so students can learn at
        their own pace — anywhere, anytime.
      </p>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <GraduationCap className="h-5 w-5 text-primary" />
          <div className="mt-3 font-semibold">GES-aligned</div>
          <p className="text-sm text-muted-foreground mt-1">
            Every answer is grounded in the JHS &amp; SHS Geography curriculum used in Ghanaian
            classrooms.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Sparkles className="h-5 w-5 text-primary" />
          <div className="mt-3 font-semibold">AI-first</div>
          <p className="text-sm text-muted-foreground mt-1">
            Visual generation, conversational tutoring, and structured note-taking — all powered
            by modern AI.
          </p>
        </div>
      </div>

      <h2 className="mt-12 text-xl font-semibold">How to get the most out of Geoguide</h2>
      <ol className="mt-4 space-y-3 text-sm text-muted-foreground list-decimal pl-5">
        <li>Ask the AI Tutor specific questions — the more precise, the better the answer.</li>
        <li>Generate an image whenever a concept is hard to picture.</li>
        <li>Save key insights to your Journal so you can revisit them before exams.</li>
        <li>Use the Storyboard generator to break a topic into a 4-scene visual summary.</li>
      </ol>
    </div>
  );
}
