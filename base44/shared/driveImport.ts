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

// Detect the field delimiter from the first non-empty line (BCN files use ';' or ',').
export function detectDelimiter(text: string): string {
  const firstLine = (text.slice(0, 8000).split(/\r?\n/)[0]) || "";
  return firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
}

// Minimal RFC-4180-ish CSV parser (handles quotes / escaped quotes / variable delimiter).
export function parseCsv(text: string, delim?: string): string[][] {
  const d = delim || detectDelimiter(text);
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
      else if (c === d) { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === '\r') { /* ignore CR */ }
      else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v !== ""));
}

// Decode bytes with BOM detection (BCN opendata facility files are UTF-16LE with BOM).
export function decodeBuffer(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xFE) return new TextDecoder("utf-16le").decode(b).replace(/^\uFEFF/, "");
  if (b.length >= 2 && b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder("utf-16be").decode(b).replace(/^\uFEFF/, "");
  if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) return new TextDecoder("utf-8").decode(b.subarray(3));
  return new TextDecoder("utf-8").decode(b);
}

export function idxOf(headers: string[], names: string[]): number {
  const lower = headers.map(h => String(h).replace(/"/g, "").toLowerCase().trim());
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

// ======================= PHASE 2: point-in-polygon aggregation =======================

// Ray-casting point-in-polygon. `ring` is an array of [lon, lat] (GeoJSON order).
export function pointInPolygon(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    const intersect = (yi > lat) !== (yj > lat) && (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface PipRecord {
  id?: string; barriCode?: string; districtCode?: string;
  lat?: number; lon?: number; type?: string; fullpath?: string; name?: string;
}
export interface PipIndicator {
  name: string; category_key: string; direction: "positive" | "negative"; unit: string;
  year: number; source: string; external: boolean; last_updated: string;
  perCapitaScale?: number | null;
  kindFilter?: (rec: PipRecord) => boolean;
}
export interface PipConfig {
  match: string; format: "csv" | "json";
  extract?: (rows: string[][], headers: string[]) => PipRecord[];
  extractJson?: (arr: any[]) => PipRecord[];
  indicators: PipIndicator[];
}

// Shared "opendatabcn" facility schema: comma CSV, deduped by register_id, with a
// barri code (addresses_neighborhood_id) + WGS84 lat/lon + a type label.
function extractOpendata(rows: string[][], headers: string[]): PipRecord[] {
  const idI = idxOf(headers, ["register_id"]);
  const nameI = idxOf(headers, ["name"]);
  const barriI = idxOf(headers, ["addresses_neighborhood_id"]);
  const distI = idxOf(headers, ["addresses_district_id"]);
  const latI = idxOf(headers, ["geo_epgs_4326_lat"]);
  const lonI = idxOf(headers, ["geo_epgs_4326_lon"]);
  const typeI = idxOf(headers, ["secondary_filters_name"]);
  const pathI = idxOf(headers, ["secondary_filters_fullpath"]);
  const seen = new Set<string>();
  const out: PipRecord[] = [];
  for (const r of rows.slice(1)) {
    const id = String(r[idI] || "").replace(/^\uFEFF/, "");
    if (id) { if (seen.has(id)) continue; seen.add(id); }
    const lat = parseFloat(r[latI]), lon = parseFloat(r[lonI]);
    out.push({
      id, name: r[nameI], barriCode: r[barriI], districtCode: r[distI],
      type: r[typeI], fullpath: r[pathI],
      lat: isNaN(lat) ? undefined : lat, lon: isNaN(lon) ? undefined : lon,
    });
  }
  return out;
}

// Quoted-CSV transport layout (BARRI code + NOM_CAPA type + WGS84 lat/lon).
function extractTransport(rows: string[][], headers: string[]): PipRecord[] {
  const barriI = idxOf(headers, ["BARRI"]);
  const distI = idxOf(headers, ["DISTRICTE"]);
  const latI = idxOf(headers, ["LATITUD"]);
  const lonI = idxOf(headers, ["LONGITUD"]);
  const typeI = idxOf(headers, ["NOM_CAPA"]);
  const out: PipRecord[] = [];
  for (const r of rows.slice(1)) {
    const lat = parseFloat(r[latI]), lon = parseFloat(r[lonI]);
    if (isNaN(lat) || isNaN(lon)) continue;
    out.push({ barriCode: r[barriI], districtCode: r[distI], type: r[typeI], lat, lon });
  }
  return out;
}

export const PIP_CONFIG: PipConfig[] = [
  { match: "ev_charging__", format: "json",
    extractJson: (arr) => arr.map((s: any) => ({ id: String(s.Station_id), lat: Number(s.Station_lat), lon: Number(s.Station_lng) })).filter((p: any) => !isNaN(p.lat) && !isNaN(p.lon)),
    indicators: [
      { name: "EV chargers", category_key: "car", direction: "positive", unit: "count", year: 2023, source: "vehicles-electrics", external: false, last_updated: "2023-06-30" },
    ] },
  { match: "transports__", format: "csv", extract: extractTransport,
    indicators: [
      { name: "Metro / FGC / Renfe stations", category_key: "transport", direction: "positive", unit: "count", year: 2024, source: "transport-public", external: false, last_updated: "2024-02-01",
        kindFilter: (r) => /metro|fgc|renfe|tram|tren/i.test(r.type || "") },
    ] },
  { match: "bus_stops__", format: "csv", extract: extractTransport,
    indicators: [
      { name: "Bus stops", category_key: "transport", direction: "positive", unit: "count", year: 2024, source: "transport-public", external: false, last_updated: "2024-02-01" },
    ] },
  { match: "pharmacies__", format: "csv", extract: extractOpendata,
    indicators: [
      { name: "Pharmacies per 10k inh.", category_key: "healthcare", direction: "positive", unit: "per 10k", year: 2024, source: "farmacies", external: false, last_updated: "2024-03-01", perCapitaScale: 10000 },
    ] },
  { match: "health__", format: "csv", extract: extractOpendata,
    indicators: [
      { name: "Hospitals (within 1 km)", category_key: "healthcare", direction: "positive", unit: "count", year: 2024, source: "equipaments-sanitaris", external: false, last_updated: "2024-01-15",
        kindFilter: (r) => /hospital|cl[ií]niqu/i.test(r.type || "") },
      { name: "Primary care centres (CAP)", category_key: "healthcare", direction: "positive", unit: "count", year: 2024, source: "equipaments-sanitaris", external: false, last_updated: "2024-01-15",
        kindFilter: (r) => /atenci[oó] prim[aà]ria|\bcap\b/i.test(r.type || "") },
    ] },
  { match: "nurseries__", format: "csv", extract: extractOpendata,
    indicators: [
      { name: "Nurseries (escoles bressol)", category_key: "education", direction: "positive", unit: "count", year: 2024, source: "equipaments-educatius", external: false, last_updated: "2024-01-15",
        kindFilter: (r) => /infantil|bressol/i.test(r.type || "") },
    ] },
  { match: "education__", format: "csv", extract: extractOpendata,
    indicators: [
      { name: "Primary & secondary schools", category_key: "education", direction: "positive", unit: "count", year: 2024, source: "equipaments-educatius", external: false, last_updated: "2024-01-15",
        kindFilter: (r) => /educaci[oó]|escola|institut|prim[aà]ria|secund[aà]ria/i.test(r.fullpath || "") && !/infantil|bressol/i.test(r.type || "") },
    ] },
  { match: "police__", format: "csv", extract: extractOpendata,
    indicators: [
      { name: "Police stations", category_key: "safety", direction: "positive", unit: "count", year: 2024, source: "policia", external: false, last_updated: "2024-01-01" },
    ] },
  { match: "markets__", format: "csv", extract: extractOpendata,
    indicators: [
      { name: "Municipal markets", category_key: "dailylife", direction: "positive", unit: "count", year: 2024, source: "mercats", external: false, last_updated: "2024-01-15" },
    ] },
  { match: "beaches__", format: "csv", extract: extractOpendata,
    indicators: [
      { name: "Beaches access", category_key: "dailylife", direction: "positive", unit: "count", year: 2024, source: "platges", external: false, last_updated: "2023-06-01" },
    ] },
  { match: "elderly_homes__", format: "csv", extract: extractOpendata,
    indicators: [
      { name: "Elderly care homes", category_key: "families", direction: "positive", unit: "count", year: 2024, source: "serveis-socials", external: false, last_updated: "2024-01-15" },
    ] },
  { match: "playgrounds__", format: "csv",
    extract: (rows, headers) => {
      const idI = idxOf(headers, ["area_joc_id"]);
      const barriI = idxOf(headers, ["codi_barri"]);
      const distI = idxOf(headers, ["codi_districte"]);
      const latI = idxOf(headers, ["latitud"]);
      const lonI = idxOf(headers, ["longitud"]);
      const seen = new Set<string>(); const out: PipRecord[] = [];
      for (const r of rows.slice(1)) {
        const id = String(r[idI] || ""); if (id) { if (seen.has(id)) continue; seen.add(id); }
        const lat = parseFloat(r[latI]), lon = parseFloat(r[lonI]);
        out.push({ id, barriCode: r[barriI], districtCode: r[distI], lat: isNaN(lat) ? undefined : lat, lon: isNaN(lon) ? undefined : lon });
      }
      return out;
    },
    indicators: [
      { name: "Playgrounds", category_key: "families", direction: "positive", unit: "count", year: 2024, source: "jocs-infantils", external: false, last_updated: "2024-01-15" },
    ] },
  { match: "terraces__", format: "csv",
    extract: (rows, headers) => {
      const barriI = idxOf(headers, ["CODI_BARRI"]);
      const distI = idxOf(headers, ["CODI_DISTRICTE"]);
      const latI = idxOf(headers, ["LATITUD"]);
      const lonI = idxOf(headers, ["LONGITUD"]);
      const out: PipRecord[] = [];
      for (const r of rows.slice(1)) {
        const lat = parseFloat(r[latI]), lon = parseFloat(r[lonI]);
        if (isNaN(lat) || isNaN(lon)) continue;
        out.push({ barriCode: r[barriI], districtCode: r[distI], lat, lon });
      }
      return out;
    },
    indicators: [
      { name: "Terraces & bars", category_key: "dailylife", direction: "positive", unit: "count", year: 2026, source: "terrades", external: false, last_updated: "2026-06-30" },
    ] },
  { match: "shops__", format: "csv",
    extract: (rows, headers) => {
      const barriI = idxOf(headers, ["Codi_Barri"]);
      const distI = idxOf(headers, ["Codi_Districte"]);
      const latI = idxOf(headers, ["Latitud"]);
      const lonI = idxOf(headers, ["Longitud"]);
      const actI = idxOf(headers, ["Nom_Principal_Activitat"]);
      const out: PipRecord[] = [];
      for (const r of rows.slice(1)) {
        if (/sense activitat/i.test(String(r[actI] || ""))) continue; // skip vacant premises
        const lat = parseFloat(r[latI]), lon = parseFloat(r[lonI]);
        out.push({ barriCode: r[barriI], districtCode: r[distI], lat: isNaN(lat) ? undefined : lat, lon: isNaN(lon) ? undefined : lon });
      }
      return out;
    },
    indicators: [
      { name: "Ground-floor shops & businesses", category_key: "dailylife", direction: "positive", unit: "count", year: 2024, source: "comerc", external: false, last_updated: "2024-01-15" },
    ] },
];