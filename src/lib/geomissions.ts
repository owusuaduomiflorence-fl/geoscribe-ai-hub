// GeoMissions & badges are derived from the student's GeoSnap discoveries,
// so progress is always in sync with what they've actually snapped.

export type SnapRow = {
  category: string | null;
  level: string | null;
  quiz_score: number | null;
  quiz_total: number | null;
  xp_earned: number | null;
};

export type Mission = {
  id: string;
  title: string;
  description: string;
  unlockXp: number;
  target: number;
  progress: number;
  unlocked: boolean;
  completed: boolean;
};

export type Badge = { id: string; name: string; emoji: string; xp: number; earned: boolean };

const BADGES = [
  { id: "scout", name: "Geo Scout", emoji: "🧭", xp: 10 },
  { id: "explorer", name: "Explorer", emoji: "🗺️", xp: 100 },
  { id: "ranger", name: "Land Ranger", emoji: "🌿", xp: 250 },
  { id: "navigator", name: "Navigator", emoji: "⛵", xp: 500 },
  { id: "master", name: "Geo Master", emoji: "🏆", xp: 1000 },
];

export function computeProgress(rows: SnapRow[]) {
  const xp = rows.reduce((s, r) => s + (r.xp_earned ?? 0), 0);
  const categories = new Set(rows.map((r) => r.category?.toLowerCase()).filter(Boolean)).size;
  const quizzes = rows.filter((r) => (r.quiz_total ?? 0) > 0).length;
  const perfect = rows.filter((r) => (r.quiz_total ?? 0) > 0 && r.quiz_score === r.quiz_total).length;
  const deep = rows.filter((r) => r.level === "deep").length;

  const defs = [
    { id: "first", title: "First Snap", description: "Snap your first geographical feature.", unlockXp: 0, target: 1, progress: rows.length },
    { id: "quiz1", title: "Test Yourself", description: "Finish a GeoSnap quiz.", unlockXp: 10, target: 1, progress: quizzes },
    { id: "variety", title: "Feature Hunter", description: "Discover 3 different kinds of features.", unlockXp: 50, target: 3, progress: categories },
    { id: "five", title: "Field Trip", description: "Make 5 GeoSnap discoveries.", unlockXp: 100, target: 5, progress: rows.length },
    { id: "deep", title: "Go Deeper", description: "Study 2 snaps at Deep Dive level.", unlockXp: 150, target: 2, progress: deep },
    { id: "perfect", title: "Sharp Eye", description: "Score full marks on 3 quizzes.", unlockXp: 250, target: 3, progress: perfect },
    { id: "ten", title: "Geo Expedition", description: "Make 10 GeoSnap discoveries.", unlockXp: 400, target: 10, progress: rows.length },
  ];

  const missions: Mission[] = defs.map((d) => {
    const unlocked = xp >= d.unlockXp;
    const progress = Math.min(d.progress, d.target);
    return { ...d, progress, unlocked, completed: unlocked && progress >= d.target };
  });
  const badges: Badge[] = BADGES.map((b) => ({ ...b, earned: xp >= b.xp }));
  const next = BADGES.find((b) => xp < b.xp);
  return { xp, missions, badges, nextBadge: next ?? null, discoveries: rows.length };
}
