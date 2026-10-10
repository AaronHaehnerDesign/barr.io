import { categoryScoresFromArea } from "./scoring";
import { CATEGORIES } from "./categories";

function lower(s) {
  return s.toLowerCase();
}

// A short, deterministic introduction paragraph for any district or barri,
// derived from its population and category scores. Works for every area in the
// app without an extra API call or stored field.
export function areaIntro(area, type) {
  const scores = categoryScoresFromArea(area);
  const entries = CATEGORIES.map((c) => ({ key: c.key, name: c.name, score: scores[c.key] }))
    .filter((e) => e.score != null)
    .sort((a, b) => b.score - a.score);

  const isBarri = type === "barri";
  const place = area.name;
  const pop = area.population ? area.population.toLocaleString("en-US") : null;
  const context = isBarri && area.district_name ? `, part of the ${area.district_name} district` : "";

  const parts = [];
  parts.push(`${place}${context} is ${isBarri ? "a neighbourhood" : "a district"} in Barcelona${pop ? ` home to around ${pop} inhabitants` : ""}.`);

  if (entries.length) {
    const top = entries.slice(0, 2);
    parts.push(`It stands out for ${top.map((t) => `${lower(t.name)} (${t.score.toFixed(1)}/10)`).join(" and ")}.`);
    const weak = entries[entries.length - 1];
    if (weak && weak.score < 5) {
      parts.push(`Its weakest area is ${lower(weak.name)} (${weak.score.toFixed(1)}/10).`);
    } else {
      parts.push("Its scores are balanced across most categories.");
    }
  } else {
    parts.push("Detailed scoring for this area is coming soon.");
  }

  return parts.join(" ");
}