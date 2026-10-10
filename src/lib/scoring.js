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

export const MATCH_NOTE = "Relative match: your fit compared with the other areas, boosted for your top picks. Not a probability.";

// Converts raw 0-100 match scores of a set of areas into the displayed relative
// match. Monotonic in the raw score, so ranking never changes. Keeps the
// original as raw_match_score. All-zero sets (no priorities) stay at 0.
export function adjustMatches(items) {
  const raws = items.map((i) => i.match_score || 0);
  const max = Math.max(0, ...raws);
  const min = Math.min(...raws);
  if (max === 0) return items;
  return items.map((i) => {
    const raw = i.match_score || 0;
    const lifted = 100 * Math.sqrt(raw / 100);
    const rel = max > min ? (raw - min) / (max - min) : 1;
    const adj = Math.round(Math.min(99, 0.7 * lifted + 0.3 * (50 + 50 * rel)));
    return { ...i, raw_match_score: raw, match_score: adj };
  });
}

// --- Workplace proximity ---
// Distance (km) between a {lat,lon} point and an area centroid via haversine.
export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Commute proximity as a 1-10 score (10 within 0.8 km, decaying to 1 at 8 km).
export function commuteScore(area, workplace) {
  if (!workplace || !area?.centroid) return null;
  const d = haversineKm(area.centroid, workplace);
  if (d == null) return null;
  if (d <= 0.8) return 10;
  if (d >= 8) return 1;
  return Math.round((10 - ((d - 0.8) / (8 - 0.8)) * 9) * 10) / 10;
}

export function commuteDistanceLabel(area, workplace) {
  if (!workplace || !area?.centroid) return null;
  const d = haversineKm(area.centroid, workplace);
  if (d == null) return null;
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
}

// Match score with an optional workplace-proximity boost. `workplaces` is an
// array of {lat, lon} (one or two partners). The commute contribution is the
// AVERAGE commute score across all workplaces, so a couple balances both
// commutes. Without priorities the score stays 0 (onboarding still required).
export function matchScoreWithCommute(categoryScores, weights, area, workplaces) {
  const base = matchScore(categoryScores, weights);
  const wps = (Array.isArray(workplaces) ? workplaces : (workplaces ? [workplaces] : [])).filter((p) => p && p.lat != null && p.lon != null);
  if (!wps.length || !area?.centroid) return base;
  const wvals = Object.values(weights || {}).filter((w) => w > 0);
  if (!wvals.length) return base;
  const scores = wps.map((wp) => commuteScore(area, wp)).filter((s) => s != null);
  if (!scores.length) return base;
  const commute = scores.reduce((a, b) => a + b, 0) / scores.length;
  const cw = wvals.reduce((s, w) => s + w, 0) / wvals.length;
  return matchScore({ ...categoryScores, commute }, { ...weights, commute: cw });
}

// Nearest workplace to an area: { label, distanceKm, text } or null.
export function nearestWorkplace(area, workplaces) {
  const wps = (Array.isArray(workplaces) ? workplaces : (workplaces ? [workplaces] : [])).filter((w) => w && w.lat != null && w.lon != null);
  let best = null;
  let bestD = Infinity;
  for (const w of wps) {
    const d = haversineKm(area.centroid, w);
    if (d != null && d < bestD) { bestD = d; best = w; }
  }
  if (!best) return null;
  return { label: best.label || best.area_name || "workplace", distanceKm: bestD, text: bestD < 1 ? `${Math.round(bestD * 1000)} m` : `${bestD.toFixed(1)} km` };
}

// Derive a 1-10 score per category from an area's indicators array.
// Each indicator already carries a normalized_score (1-10, higher = better);
// we average them within each category_key. Falls back to area.category_scores
// for any category with no indicators (or when indicators is absent).
export function categoryScoresFromArea(area) {
  const out = {};
  const byCat = {};
  (area?.indicators || []).forEach((ind) => {
    if (ind == null || ind.normalized_score == null || !ind.category_key) return;
    (byCat[ind.category_key] ||= []).push(ind.normalized_score);
  });
  for (const key of Object.keys(byCat)) {
    const arr = byCat[key];
    out[key] = Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
  }
  const stored = area?.category_scores || {};
  for (const key of Object.keys(stored)) {
    if (out[key] == null && stored[key] != null) out[key] = stored[key];
  }
  return out;
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

// One-line explanation of what a 1-10 rating band means in context.
export function scoreExplanation(score) {
  if (score == null) return "";
  if (score >= 8.5) return "Among the best in Barcelona for this category.";
  if (score >= 7) return "Well above the city average.";
  if (score >= 5.5) return "Above the city average.";
  if (score >= 4) return "Around the city average.";
  if (score >= 2.5) return "Below the city average.";
  return "Among the weakest in Barcelona for this category.";
}

// Short text summary of an area's profile, derived from its computed 1-10
// category scores: top strengths plus the weakest point.
export function areaSummary(scores) {
  const entries = Object.entries(scores || {})
    .filter(([, s]) => s != null)
    .map(([k, s]) => ({ key: k, name: CATEGORY_MAP[k]?.name || k, score: s }));
  if (!entries.length) return "No scored data yet for this area.";
  const sorted = entries.slice().sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 2).filter((e) => e.score >= 7);
  const weak = sorted[sorted.length - 1];
  const parts = [];
  if (top.length) parts.push(`Strongest in ${top.map((t) => `${t.name} (${t.score.toFixed(1)})`).join(" and ")}`);
  if (weak && weak.score < 5) parts.push(`weakest in ${weak.name} (${weak.score.toFixed(1)})`);
  if (!parts.length) parts.push(`Balanced across categories, peaking at ${sorted[0].name} (${sorted[0].score.toFixed(1)})`);
  return parts.join("; ") + ".";
}

// data freshness: warn if older than 3 years from a ref date
export function isStale(dateStr, ref = new Date("2026-10-09")) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const years = (ref - d) / (1000 * 60 * 60 * 24 * 365.25);
  return years > 3;
}

export { CATEGORIES };