// Scoring utilities: color scale, personal match score, normalization helpers.

import { CATEGORIES, CATEGORY_MAP } from "./categories";

// Red (1) -> yellow (5) -> green (10) consistent color scale.
// Returns a hex color for a 1-10 score.
export function scoreColor(score) {
  const s = Math.max(1, Math.min(10, score));
  // interpolate red(0) -> yellow(0.5) -> green(1)
  const t = (s - 1) / 9;
  let r, g, b;
  if (t <= 0.5) {
    const u = t / 0.5; // 0..1 red->yellow
    r = Math.round(220 + (245 - 220) * u);
    g = Math.round(70 + (210 - 70) * u);
    b = Math.round(60 + (60 - 60) * u);
  } else {
    const u = (t - 0.5) / 0.5; // 0..1 yellow->green
    r = Math.round(245 + (40 - 245) * u);
    g = Math.round(210 + (170 - 210) * u);
    b = Math.round(60 + (80 - 60) * u);
  }
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

export function scoreLabel(score) {
  if (score >= 8.5) return "Excellent";
  if (score >= 7) return "Very good";
  if (score >= 5.5) return "Good";
  if (score >= 4) return "Fair";
  if (score >= 2.5) return "Weak";
  return "Poor";
}

// personal match score 0-100 from category scores + weights
// weights: {category_key: weight 0-100}
export function matchScore(categoryScores, weights) {
  let totalW = 0;
  let total = 0;
  for (const key of Object.keys(weights)) {
    const w = weights[key] || 0;
    const sc = categoryScores[key];
    if (sc == null || w <= 0) continue;
    total += sc * w;
    totalW += w;
  }
  if (totalW === 0) return 0;
  const avg = total / totalW; // 1-10
  return Math.round(((avg - 1) / 9) * 100); // 0-100
}

export function rankAreas(areas, weights) {
  return areas
    .map(a => ({ ...a, match_score: matchScore(a.category_scores || {}, weights) }))
    .sort((a, b) => b.match_score - a.match_score);
}

// human-readable reasons for the top matches
export function topReasons(area, weights, topKeys) {
  const scores = area.category_scores || {};
  const reasons = [];
  for (const key of topKeys) {
    const w = weights[key];
    const sc = scores[key];
    if (!w || sc == null) continue;
    reasons.push({ key, name: CATEGORY_MAP[key]?.name, score: sc, weight: w });
  }
  return reasons.sort((a, b) => b.weight * b.score - a.weight * a.score).slice(0, 3);
}

// data freshness: warn if older than 3 years from a ref date
export function isStale(dateStr, ref = new Date("2026-10-09")) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const years = (ref - d) / (1000 * 60 * 60 * 24 * 365.25);
  return years > 3;
}

export { CATEGORIES };