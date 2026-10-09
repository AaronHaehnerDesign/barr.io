// Helpers for refreshing Barcelona Open Data (CKAN) datasets.
// Pure data access + geometry/normalisation helpers, no Base44 entity writes.

export interface ResourceSummary {
  id: string;
  name: string;
  format: string;
  mimetype: string;
  url: string;
  last_modified: string;
  datastore_active: boolean;
}

export type DatasetMode = "count" | "value" | "boundaries";

export interface DatasetConfig {
  code: string; // CKAN package id (or slug resolved by package_show)
  label: string;
  category_key: string;
  mode: DatasetMode;
  formats?: string[]; // preferred resource formats, first match wins
  nameMatch?: RegExp; // match resource by name when formats ambiguous
  unit?: string;
  direction?: "positive" | "negative";
  year?: number;
}

const BASE = "https://opendata-ajuntament.barcelona.cat";

export const DATASETS: DatasetConfig[] = [
  { code: "20170706-districtes-barris", label: "District & barri boundaries", category_key: "boundaries", mode: "boundaries" },
  { code: "transports", label: "Public transport stops", category_key: "transport", mode: "count", formats: ["CSV"], direction: "positive" },
  { code: "sanitat-hospitals-atencio-primaria", label: "Health facilities", category_key: "healthcare", mode: "count", formats: ["CSV"], direction: "positive" },
  { code: "educacio-ensenyament-reglat", label: "Schools & education", category_key: "education", mode: "count", formats: ["CSV"], direction: "positive" },
  { code: "cens-locals-planta-baixa-act-economica", label: "Ground-floor establishments", category_key: "dailylife", mode: "count", formats: ["CSV"], direction: "positive" },
  { code: "renda-disponible-llars-bcn", label: "Household disposable income", category_key: "income", mode: "value", formats: ["CSV"], direction: "positive" },
  { code: "esm-bcn-evo", label: "Mobility survey index", category_key: "transport", mode: "value", formats: ["CSV"], direction: "positive" },
  { code: "iris", label: "Income index (IRIS)", category_key: "income", mode: "value", formats: ["CSV"], direction: "positive" },
  { code: "tramer-mapa-estrategic-soroll", label: "Strategic noise map", category_key: "environment", mode: "value", formats: ["CSV"], direction: "negative" },
  { code: "habitatges-us-turistic", label: "Tourist-use housing", category_key: "tourism", mode: "count", formats: ["CSV"], direction: "positive" }
];

export async function packageShow(code: string): Promise<any> {
  const r = await fetch(`${BASE}/data/api/3/action/package_show?id=${encodeURIComponent(code)}`);
  const j = await r.json().catch(() => { throw new Error(`package_show for ${code} returned non-JSON`); });
  if (!j.success || !j.result) throw new Error(`package_show failed for ${code}`);
  return j.result;
}

export function listResources(pkg: any): ResourceSummary[] {
  return (pkg.resources || []).map((r: any) => ({
    id: r.id,
    name: r.name || "",
    format: (r.format || "").toUpperCase(),
    mimetype: r.mimetype || "",
    url: r.url || "",
    last_modified: r.last_modified || "",
    datastore_active: !!r.datastore_active
  }));
}

// Pick the best resource: prefer datastore-backed, then by configured formats/name.
export function pickResource(list: ResourceSummary[], cfg: DatasetConfig): ResourceSummary | undefined {
  let candidates = list;
  if (cfg.nameMatch) {
    const m = list.filter((r) => cfg.nameMatch!.test(r.name));
    if (m.length) candidates = m;
  }
  if (cfg.formats && cfg.formats.length) {
    for (const f of cfg.formats) {
      const byFmt = candidates.filter((r) => r.format === f);
      if (byFmt.length) { candidates = byFmt; break; }
    }
  }
  const withDs = candidates.find((r) => r.datastore_active);
  if (withDs) return withDs;
  return candidates[0];
}

// Naive but sufficient CSV parser (handles quoted fields).
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; }
    else if (c === "\r") { /* skip */ }
    else if (c === ",") { row.push(field); field = ""; }
    else field += c;
  }
  if (field) row.push(field);
  if (row.length) rows.push(row);
  if (!rows.length) return [];
  const header = rows[0];
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].length) continue;
    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = rows[i][j] ?? "";
    out.push(obj);
  }
  return out;
}

// Fetch all rows for a resource via the CKAN Datastore API (paginated), bypassing
// the portal's captcha-protected file downloads. Falls back to direct download.
export async function fetchRows(res: ResourceSummary, maxRows = 20000): Promise<Record<string, any>[]> {
  if (res.datastore_active && res.id) {
    const rows: Record<string, any>[] = [];
    let offset = 0;
    const limit = 5000;
    while (offset < maxRows) {
      const url = `${BASE}/data/api/3/action/datastore_search?resource_id=${res.id}&limit=${limit}&offset=${offset}`;
      const r = await fetch(url);
      const j = await r.json().catch(() => null);
      const recs = j?.result?.records;
      if (!Array.isArray(recs)) break;
      rows.push(...recs);
      offset += recs.length;
      if (recs.length < limit) break;
    }
    return rows;
  }
  // Fallback: direct download + parse (CSV/JSON)
  const r = await fetch(res.url);
  const text = await r.text();
  if (text.trimStart().startsWith("<")) throw new Error(`Resource ${res.name} returned HTML (captcha), not data`);
  if (res.format === "JSON") {
    const j = JSON.parse(text);
    return Array.isArray(j) ? j : (j.features ?? j.records ?? j.data ?? []);
  }
  return parseCsv(text);
}

// --- Geometry: WKT polygon parsing + spatial helpers ---

// Parse a WKT POLYGON/MULTIPOLYGON into an array of polygon rings ([[[lon,lat],...], ...]).
export function parseWktPolygons(wkt: string): number[][][] {
  if (!wkt || typeof wkt !== "string") return [];
  const ringMatches = wkt.match(/\(([^()]+)\)/g) || [];
  const polys: number[][][] = [];
  for (const ring of ringMatches) {
    const inner = ring.slice(1, -1).trim();
    const pts = inner.split(",")
      .map((s) => s.trim().split(/\s+/).map(Number))
      .filter((p) => p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (pts.length >= 3) polys.push(pts);
  }
  return polys;
}

export function pointInPolygon(pt: number[], ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    const intersect = (yi > pt[1]) !== (yj > pt[1]) &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInPolygons(pt: number[], polys: number[][][]): boolean {
  return polys.some((poly) => pointInPolygon(pt, poly));
}

export function polygonAreaKm2(ring: number[][]): number {
  let area = 0;
  const R = 6371;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += ((x2 - x1) * Math.PI / 180) * (2 + Math.sin(y1 * Math.PI / 180) + Math.sin(y2 * Math.PI / 180));
  }
  return Math.abs((area * R * R) / 2);
}

export function polygonCentroid(ring: number[][]): [number, number] {
  let cx = 0, cy = 0, area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const a = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * a;
    cy += (y1 + y2) * a;
    area += a;
  }
  if (Math.abs(area) < 1e-9) {
    const n = ring.length;
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (3 * area), cy / (3 * area)];
}

export function normalizeName(s: string): string {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/\s+/g, " ");
}

// Find the WGS84 (or any) geometry WKT field in a boundary row.
function geomField(row: Record<string, any>): string {
  const keys = Object.keys(row);
  return (keys.find((k) => /wgs84/i.test(k)) ||
    keys.find((k) => /geom/i.test(k)) ||
    keys.find((k) => k.toLowerCase() === "the_geom") ||
    "") as string;
}

// Load district + barri boundaries directly from the boundaries package's datastore-backed
// CSV resources (BarcelonaCiutat_Districtes.csv and BarcelonaCiutat_Barris.csv).
export async function loadBoundaries(): Promise<{
  districts: { code: string; name: string; polys: number[][][]; centroid: [number, number] }[];
  barris: { code: string; name: string; district_code: string; district_name: string; polys: number[][][]; centroid: [number, number] }[];
}> {
  const pkg = await packageShow("20170706-districtes-barris");
  const res = listResources(pkg);
  const distRes = res.find((r) => /districtes\.csv$/i.test(r.name)) || res.find((r) => /districtes/i.test(r.name));
  const barrRes = res.find((r) => /barris\.csv$/i.test(r.name)) || res.find((r) => /barris/i.test(r.name) && !/districtes/i.test(r.name));
  if (!distRes || !barrRes) throw new Error("Boundary resources not found in package");

  const [distRows, barrRows] = await Promise.all([fetchRows(distRes, 1000), fetchRows(barrRes, 1000)]);

  const districts = distRows.map((d) => {
    const gKey = geomField(d);
    const polys = parseWktPolygons(gKey ? d[gKey] : "");
    const ring = polys[0] || [];
    return {
      code: String(d.codi_districte || d.Codi_districte || d["Codi districte"] || "").trim(),
      name: String(d.nom_districte || d.Nom_districte || "").trim(),
      polys,
      centroid: ring.length ? polygonCentroid(ring) : [0, 0]
    };
  }).filter((d) => d.code && d.polys.length);

  const barris = barrRows.map((b) => {
    const gKey = geomField(b);
    const polys = parseWktPolygons(gKey ? b[gKey] : "");
    const ring = polys[0] || [];
    return {
      code: String(b.codi_barri || b.Codi_barri || "").trim(),
      name: String(b.nom_barri || b.Nom_barri || "").trim(),
      district_code: String(b.codi_districte || b.Codi_districte || "").trim(),
      district_name: String(b.nom_districte || b.Nom_districte || "").trim(),
      polys,
      centroid: ring.length ? polygonCentroid(ring) : [0, 0]
    };
  }).filter((b) => b.code && b.polys.length);

  return { districts, barris };
}

// Resolve an area for a data row: by barri code, then district code, then point-in-polygon.
// Field matching is case-insensitive (Barcelona's CKAN columns are uppercase).
export function resolveArea(
  row: Record<string, any>,
  barriByCode: Map<string, any>,
  districtByCode: Map<string, any>,
  polyBarris: any[],
  polyDistricts: any[]
): { area_type: "barri" | "district"; area_code: string; area_id: string } | null {
  const lower: Record<string, any> = {};
  for (const k of Object.keys(row)) lower[k.toLowerCase()] = row[k];

  const barriKeys = ["codi_barri", "codibarri", "barri", "barri_id", "id_barri", "neighbourhood", "neighborhood", "codi barri"];
  const distKeys = ["codi_districte", "districte", "district", "district_id", "codi_district", "districte_id", "codi districte"];
  const latKeys = ["latitud", "latitude", "lat", "y", "coord_y", "etrs89_coord_y", "ed50_coord_y"];
  const lonKeys = ["longitud", "longitude", "lon", "lng", "x", "coord_x", "etrs89_coord_x", "ed50_coord_x"];

  const find = (map: Map<string, any>, raw: any) => {
    const s = String(raw).trim();
    return map.get(s) || map.get(s.padStart(2, "0")) || (String(Number(s)) !== "NaN" ? map.get(String(Number(s))) : undefined);
  };

  for (const k of barriKeys) {
    const v = lower[k];
    if (v != null && String(v).trim() !== "") {
      const b = find(barriByCode, v);
      if (b) return { area_type: "barri", area_code: String(v).trim(), area_id: b.id };
    }
  }
  for (const k of distKeys) {
    const v = lower[k];
    if (v != null && String(v).trim() !== "") {
      const d = find(districtByCode, v);
      if (d) return { area_type: "district", area_code: String(v).trim(), area_id: d.id };
    }
  }
  // Point-in-polygon fallback (uses WGS84 lat/lon when present)
  let latV: any, lonV: any;
  for (const k of latKeys) if (lower[k] != null && lower[k] !== "") { latV = lower[k]; break; }
  for (const k of lonKeys) if (lower[k] != null && lower[k] !== "") { lonV = lower[k]; break; }
  if (latV != null && lonV != null && Number.isFinite(Number(latV)) && Number.isFinite(Number(lonV))) {
    const pt = [Number(lonV), Number(latV)];
    for (const b of polyBarris) if (pointInPolygons(pt, b.polys)) return { area_type: "barri", area_code: b.code, area_id: b.id };
    for (const d of polyDistricts) if (pointInPolygons(pt, d.polys)) return { area_type: "district", area_code: d.code, area_id: d.id };
  }
  return null;
}

// Numerical value extraction: find the first numeric-looking column (excluding code/name/coord/metadata fields).
const NON_VALUE = /^(codi|nom|id|_id|geom|latitude|latitud|longitude|longitud|lat|lng|lon|coord|etrs89|ed50|x_|y_|the_geom|wkt|barri|districte|district|adreca|telefon|equipament|capa|layer|tipus|tipo|sexe|any|year|data|date|_links|_id$)/i;
export function rowValue(row: Record<string, any>): number | null {
  for (const [k, v] of Object.entries(row)) {
    if (NON_VALUE.test(k)) continue;
    const n = Number(String(v).replace(",", "."));
    if (v !== "" && v != null && Number.isFinite(n)) return n;
  }
  return null;
}

// Normalise an array of values to 1–10, preserving missing values and applying direction.
export function minMax10(values: (number | null | undefined)[], direction: "positive" | "negative" = "positive"): (number | null)[] {
  const nums = values.map((v) => (v == null || isNaN(Number(v))) ? null : Number(v)).filter((v): v is number => v !== null);
  if (!nums.length) return values.map(() => null);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  return values.map((v) => {
    if (v == null || isNaN(Number(v))) return null;
    const n = Number(v);
    let s = 1 + (9 * (n - min)) / range;
    if (direction === "negative") s = 10 - s + 1;
    return Math.round(Math.min(10, Math.max(1, s)));
  });
}