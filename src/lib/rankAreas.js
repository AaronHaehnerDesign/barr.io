import { PERSONA_FLIPS, categoriesForMode } from "@/lib/categories";
import { categoryScoresFromArea, matchScore, adjustMatches } from "@/lib/scoring";

// Ranks areas by personal match score for a profile (highest first).
export function rankAreas(data, profile) {
  if (!data) return [];
  const w = {};
  (profile?.priorities || []).forEach((p) => (w[p.category_key] = p.weight));
  const flip = (profile?.persona && PERSONA_FLIPS[profile.persona]) || {};
  const cats = categoriesForMode(profile?.audience || "b2c");
  return adjustMatches(data
    .map((a) => {
      const base = categoryScoresFromArea(a);
      const cs = {};
      cats.forEach((c) => {
        let s = base[c.key];
        if (s == null) { cs[c.key] = null; return; }
        if (flip[c.key] === "negative") s = 11 - s;
        cs[c.key] = Math.max(1, Math.min(10, Math.round(s * 10) / 10));
      });
      return { ...a, _scores: cs, match_score: matchScore(cs, w) };
    })
    .sort((a, b) => b.match_score - a.match_score));
}