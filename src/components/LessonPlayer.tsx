import { useEffect, useRef, useState } from "react";

type Clip = { url: string; caption?: string };

export function LessonPlayer({ clips, poster }: { clips: Clip[]; poster?: string | null }) {
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    ref.current?.load();
    ref.current?.play().catch(() => {});
  }, [idx]);

  if (!clips?.length) return null;
  const current = clips[idx];

  return (
    <div className="w-full">
      <video
        ref={ref}
        src={current.url}
        poster={poster ?? undefined}
        controls
        autoPlay
        playsInline
        onEnded={() => setIdx((i) => Math.min(i + 1, clips.length - 1))}
        className="w-full aspect-video rounded-lg bg-black"
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Scene {idx + 1} / {clips.length}
          {current.caption ? ` — ${current.caption}` : ""}
        </span>
        <div className="flex gap-1">
          {clips.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-2 w-6 rounded-full ${i === idx ? "bg-primary" : "bg-muted"}`}
              aria-label={`Scene ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
