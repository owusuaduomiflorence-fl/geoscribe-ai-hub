type Src = { title: string; type: string; snippet: string; similarity: number };

const ICON: Record<string, string> = { builtin: "📘", upload: "📄", snap: "📸" };

export function SourceList({ sources }: { sources?: Src[] | null }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 not-prose">
      <span className="text-xs font-semibold text-muted-foreground">Sources:</span>
      {sources.map((s, i) => (
        <span key={i} title={s.snippet} className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground">
          [{i + 1}] {ICON[s.type] ?? "📄"} {s.title}
        </span>
      ))}
    </div>
  );
}
