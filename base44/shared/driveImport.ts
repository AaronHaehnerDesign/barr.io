// Shared helpers for the Google Drive indicator import pipeline.
// Used by base44/functions/importDriveData/entry.ts. Pure functions + config only.

export function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normCode(c: string | number): string {
  return String(c || "").replace(/^0+/, "").trim();
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

// Minimal RFC-4180-ish CSV parser (handles quotes / escaped quotes / commas).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === '\r') { /* ignore CR */ }
      else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v !== ""));
}

export function idxOf(headers: string[], names: string[]): number {
  const lower = headers.map(h => String(h).toLowerCase().trim());
  for (const n of names) {
    const i = lower.indexOf(n.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

// Min-max normalize a set of raw values to 1..10 (higher = better).
// null/NaN raws are excluded from the range and scored null.
export function normalizeScores(entries: { key: string; raw: number | null }[], direction: "positive" | "negative"): Record<string, number | null> {
  const vals = entries.map(e => e.raw).filter(v => v != null && !isNaN(v as number)) as number[];
  const out: Record<string, number | null> = {};
  if (!vals.length) {
    for (const e of entries) out[e.key] = null;
    return out;
  }
  const min = Math.min(...vals), max = Math.max(...vals);
  for (const e of entries) {
    if (e.raw == null || isNaN(e.raw as number)) { out[e.key] = null; continue; }
    let t = max === min ? 0.5 : ((e.raw as number) - min) / (max - min);
    if (direction === "negative") t = 1 - t;
    out[e.key] = round1(1 + 9 * t);
  }
  return out;
}

// Replace (or append) one indicator entry inside an area's indicators array.
export function mergeIndicator(indicators: any[], entry: any): any[] {
  const name = entry.indicator_name;
  const rest = (indicators || []).filter(i => i?.indicator_name !== name);
  rest.push(entry);
  return rest;
}

// Recompute a category score (avg of normalized_score) for the given category,
// merged onto an existing category_scores object.
export function recomputeCategoryScore(category_scores: any, indicators: any[], categoryKey: string): any {
  const scores = (indicators || [])
    .filter(i => i?.category_key === categoryKey && i?.normalized_score != null && !isNaN(i.normalized_score))
    .map(i => i.normalized_score);
  const out = { ...(category_scores || {}) };
  if (scores.length) out[categoryKey] = round1(scores.reduce((s, v) => s + v, 0) / scores.length);
  return out;
}

// Per-file mapping config for the area-coded tables (phase 1).
// `extract` returns a Map<normBarriName, base> where base is either a count
// (perCapita indicators) or a ready value (gini avg, migration net rate).
export interface ImportConfig {
  match: string; // name substring
  indicator: {
    name: string;
    category_key: string;
    direction: "positive" | "negative";
    unit: string;
    year: number;
    source: string;
    external: boolean;
    last_updated: string;
  };
  perCapitaScale: number | null; // null = value indicator; number = per-pop divisor scale
  extract: (rows: string[][], headers: string[]) => Map<string, number>;
}

export const CONFIG: ImportConfig[] = [
  {
    match: "gini__",
    indicator: { name: "Inequality (Gini)", category_key: "income", direction: "negative", unit: "0-1", year: 2023, source: "renda-familiar", external: false, last_updated: "2023-01-01" },
    perCapitaScale: null,
    extract: (rows, h) => {
      const nameI = idxOf(h, ["Nom_Barri", "Nom_barri", "BARRI"]);
      const valI = idxOf(h, ["Index_Gini", "Valor"]);
      const sums = new Map<string, number>(), cnt = new Map<string, number>();
      for (const r of rows.slice(1)) {
        const nm = norm(r[nameI]); if (!nm) continue;
        const v = parseFloat(r[valI]); if (isNaN(v)) continue;
        sums.set(nm, (sums.get(nm) || 0) + v); cnt.set(nm, (cnt.get(nm) || 0) + 1);
      }
      const m = new Map<string, number>();
      for (const k of sums.keys()) m.set(k, (sums.get(k) || 0) / (cnt.get(k) || 1) / 100); // index -> 0-1
      return m;
    },
  },
  {
    match: "internal_migration__",
    indicator: { name: "Net migration balance", category_key: "development", direction: "positive", unit: "per 1k inh.", year: 2021, source: "padro-municipal", external: false, last_updated: "2021-12-31" },
    perCapitaScale: null,
    extract: (rows, h) => {
      const nameI = idxOf(h, ["Nom_Barri", "Nom_barri"]);
      const movI = idxOf(h, ["Moviment"]);
      const valI = idxOf(h, ["Taxa_mil_hab"]);
      const alta = new Map<string, number>(), baixa = new Map<string, number>();
      for (const r of rows.slice(1)) {
        const nm = norm(r[nameI]); if (!nm) continue;
        const v = parseFloat(r[valI]); if (isNaN(v)) continue;
        const m = String(r[movI] || "").toLowerCase();
        if (m.startsWith("alta")) alta.set(nm, (alta.get(nm) || 0) + v);
        else if (m.startsWith("baixa")) baixa.set(nm, (baixa.get(nm) || 0) + v);
      }
      const out = new Map<string, number>();
      const keys = new Set([...alta.keys(), ...baixa.keys()]);
      for (const k of keys) out.set(k, (alta.get(k) || 0) - (baixa.get(k) || 0));
      return out;
    },
  },
  {
    match: "police_incidents__",
    indicator: { name: "Crime by area", category_key: "safety", direction: "negative", unit: "per 10k inh.", year: 2025, source: "incidents-gub", external: false, last_updated: "2025-12-31" },
    perCapitaScale: 10000,
    extract: (rows, h) => {
      const nameI = idxOf(h, ["Nom_barri", "Nom_Barri", "BARRI"]);
      const valI = idxOf(h, ["Numero_incidents_GUB"]);
      const m = new Map<string, number>();
      for (const r of rows.slice(1)) {
        const nm = norm(r[nameI]); if (!nm) continue;
        const v = parseFloat(r[valI]); if (isNaN(v)) continue;
        m.set(nm, (m.get(nm) || 0) + v);
      }
      return m;
    },
  },
  {
    match: "accidents__",
    indicator: { name: "Traffic accidents", category_key: "safety", direction: "negative", unit: "per 10k inh.", year: 2025, source: "accidents", external: false, last_updated: "2025-12-31" },
    perCapitaScale: 10000,
    extract: (rows, h) => {
      const nameI = idxOf(h, ["Nom_barri", "Nom_Barri"]);
      const m = new Map<string, number>();
      for (const r of rows.slice(1)) {
        const nm = norm(r[nameI]); if (!nm) continue;
        m.set(nm, (m.get(nm) || 0) + 1); // one row per accident
      }
      return m;
    },
  },
  {
    match: "tourist_flats__",
    indicator: { name: "Tourist flats density", category_key: "tourism", direction: "negative", unit: "per 1k inh.", year: 2024, source: "habitatge-turistic", external: false, last_updated: "2024-01-01" },
    perCapitaScale: 1000,
    extract: (rows, h) => {
      const nameI = idxOf(h, ["NOM_BARRI", "Nom_Barri", "Nom_barri"]);
      const m = new Map<string, number>();
      for (const r of rows.slice(1)) {
        const nm = norm(r[nameI]); if (!nm) continue;
        m.set(nm, (m.get(nm) || 0) + 1); // one row per HUT
      }
      return m;
    },
  },
];