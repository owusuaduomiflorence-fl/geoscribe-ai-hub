// Helpers for showing a friendly, professional name across the app.

const toTitle = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/** "florence.owusu", "florence_owusu", "FlorenceOwusu", "florenceowusu2" → "Florence Owusu" */
export function humanizeRaw(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw.split("@")[0]; // strip email domain if present
  s = s.replace(/[0-9]+/g, " ");
  s = s.replace(/([a-z])([A-Z])/g, "$1 $2");
  s = s.replace(/[._\-]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return toTitle(s);
}

export type ProfileNameFields = {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  display_preference?: string | null;
};

/**
 * Build the display name from profile + email fallback.
 * `mode`:
 *  - "full"  → "Florence Owusu"
 *  - "first" → "Florence"
 *  - "auto"  → use profile preference, else "full"
 */
export function displayNameFor(
  profile: ProfileNameFields | null | undefined,
  email: string | null | undefined,
  mode: "full" | "first" | "auto" = "auto",
  fallback = "Friend",
): string {
  const pref =
    mode === "auto" ? (profile?.display_preference === "first" ? "first" : "full") : mode;

  const first = (profile?.first_name ?? "").trim();
  const last = (profile?.last_name ?? "").trim();

  if (first || last) {
    if (pref === "first" && first) return toTitle(first);
    return toTitle([first, last].filter(Boolean).join(" "));
  }

  if (profile?.display_name) {
    const h = humanizeRaw(profile.display_name);
    if (h) return pref === "first" ? h.split(" ")[0] : h;
  }

  if (email) {
    const h = humanizeRaw(email);
    if (h) return pref === "first" ? h.split(" ")[0] : h;
  }

  return fallback;
}
