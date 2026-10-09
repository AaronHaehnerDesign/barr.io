// Pure helpers for the Open Data BCN refresh: CKAN discovery, CSV parsing,
// point-in-polygon, spherical area, and min-max normalisation to 1-10.
// No Base44 SDK dependency here — the entry file owns all entity writes.

export const CKAN_BASE = "https://opendata-ajuntament.barcelona.cat/data/api/3/action";

// role: boundaries | count | value | pointvalue
//   count      -> one row = one unit; metric = count per `per` residents (per-km2 if no population)
//   value      -> one row per barri with a numeric value column; metric = value (perCapita divides by pop/per)
//   pointvalue -> one row = one point with a numeric value; metric = average value per barri (PIP if no barri col)
export const DATASETS = [
  { code: "20170706-districtes-barris", role: "boundaries", resourceNameHint: "BarcelonaCiutat_Barris", format: "JSON" },
  { code: "transports", role: "count", category_key: "transport", indicator_name: "Public transport stops", direction: "positive", per: 1000, resourceNameHint: "Transports", format: "CSV" },
  { code: "sanitat-hospitals-atencio-primaria", role: "count", category_key: "healthcare", indicator_name: "Health facilities", direction: "positive", per: 10000, resourceNameHint: "Sanitat", format: "CSV" },
  { code: "educacio-ensenyament-reglat", role: "count", category_key: "education", indicator_name: "Schools", direction: "positive", per: 1000, resourceNameHint: "Educacio", format: "CSV" },
  { code: "cens-locals-planta-baixa-act-economica", role: "count", category_key: "dailylife", indicator_name: "Ground-floor establishments", direction: "positive", per: 1000, resourceNameHint: "Cens", format: "CSV", maxPoints: 60000 },
  { code: "renda-disponible-llars-bcn", role: "value", category_key: "income", indicator_name: "Disposable household income", direction: "positive", resourceNameHint: "Renda", format: "CSV" },
  { code: "esm-bcn-evo", role: "value", category_key: "transport", indicator_name: "Mobility index", direction: "positive", resourceNameHint: "Esm", format: "CSV" },
  { code: "iris", role: "value", category_key: "income", indicator_name: "Income index (IRIS)", direction: "positive", resourceNameHint: "Iris", format: "CSV" },
  { code: "tramer-mapa-estrategic-soroll", role: "pointvalue", category_key: "environment", indicator_name: "Noise exposure", direction: "negative", resourceNameHint: "Tramer", format: "CSV", maxPoints: 8000 },
  { code: "habitatges-us-turistic", role: "value", category_key: "tourism", indicator_name: "Tourist-use housing", direction: "negative", perCapita: true, per: 1000, resourceNameHint: "Habitatges", format: "CSV" }
];

export function datasetConfig(code) {
  return DATASETS.find((d) => d.code.toLowerCase() === String(code).toLowerCase());
}

// ---- CKAN discovery -------------------------------------------------------

export async function packageShow(code) {
  const url = `${CKAN_BASE}/package_show?id=${encodeURIComponent(code)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`package_show ${code} HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(`package_show ${code} not success`);
  return json.result;
}

// Pick the best resource for a dataset. boundaries -> JSON named like *Barris*;
// everything else -> the first CSV (prefer datastore_active), else JSON.
export function pickResource(result, cfg) {
  const resources = (result.resources || []).filter((r) => r.state !== "deleted");
  if (cfg.role === "boundaries") {
    let r = resources.find((r) => /json/i.test(r.format) && /barri/i.test(r.name || ""));
    if (r) return r;
    return resources.find((r) => /json/i.test(r.format)) || resources[0];
  }
  const csvs = resources.filter((r) => /csv/i.test(r.format));
  if (csvs.length) {
    return csvs.find((r) => r.datastore_active) || csvs[0];
  }
  return resources.find((r) => /json/i.test(r.format)) || resources[0];
}

export function resourceLastModified(r) {
  return r.last_modified || r.created || null;
}

// ---- Download + parse -----------------------------------------------------

export async function downloadText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  return await res.text();
}

// RFC4180-ish CSV parser -> { headers: string[], rows: string[][] }
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  // last field/row
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows.shift().map((h) => (h || "").trim());
  const norm = rows.map((r) => {
    // pad/truncate to headers length
    if (r.length < headers.length) while (r.length < headers.length) r.push("");
    return r.slice(0, headers.length);
  });
  return { headers, rows: norm };
}

// Parse a JSON resource. Boundaries -> GeoJSON FeatureCollection.
export function parseJSON(text) {
  return JSON.parse(text);
}

// ---- Column resolution ----------------------------------------------------

const META_COLS = new Set([
  "codi_districte", "nom_districte", "districte", "districte", "nom_districte",
  "codi_barri", "nom_barri", "barri", "codibarri", "codidistricte",
  "any", "year", "any_", "codi", "id", "nom", "name", "adreca", "adress", "address",
  "telefon", "phone", "latitud", "latitude", "lat", "longitud", "longitude", "lon", "lng",
  "x_etrts89", "y_etrts89", "ed50_coord_x", "ed50_coord_y", "etrts89_coord_x", "etrts89_coord_y",
  "geo_epsg_4326", "geometria", "geometry", "wkb_geometry", "the_geom", "link", "url"
]);

function lowerHeaders(headers) {
  return headers.map((h) => (h || "").toLowerCase().trim());
}

export function findExact(headers, candidates) {
  const lower = lowerHeaders(headers);
  for (const c of candidates) {
    const cl = c.toLowerCase();
    const idx = lower.indexOf(cl);
    if (idx >= 0) return idx;
  }
  return -1;
}

export function barriCol(headers) {
  let i = findExact(headers, ["Codi_Barri", "CodiBarri", "codi_barri", "BARRI", "Barri", "barri", "Codi_barri"]);
  if (i >= 0) return i;
  // contains fallback (avoid Nom_Barri)
  const lower = lowerHeaders(headers);
  i = lower.findIndex((h) => h === "codi_barri" || h === "codibarri" || h === "barri");
  return i;
}

export function districtCol(headers) {
  let i = findExact(headers, ["Codi_Districte", "CodiDistricte", "codi_districte", "DISTRICTE", "Districte", "districte", "districte"]);
  if (i >= 0) return i;
  const lower = lowerHeaders(headers);
  i = lower.findIndex((h) => h === "codi_districte" || h === "codidistricte" || h === "districte" || h === "districte");
  return i;
}

export function latLonCols(headers) {
  const lower = lowerHeaders(headers);
  const lat = lower.findIndex((h) => /lat(itud|itude)?$/.test(h) || h === "lat");
  const lon = lower.findIndex((h) => /^(lon|lng|longitud|longitude)$/.test(h));
  if (lat >= 0 && lon >= 0) return { lat, lon };
  return null;
}

// First numeric, non-meta column (scanning a sample of rows). honours an optional preferred name.
export function valueCol(headers, rows, preferred) {
  const lower = lowerHeaders(headers);
  if (preferred) {
    const pl = preferred.toLowerCase();
    const idx = lower.findIndex((h) => h === pl || h.includes(pl));
    if (idx >= 0 && sampleNumeric(rows, idx)) return idx;
  }
  for (let i = 0; i < headers.length; i++) {
    if (META_COLS.has(lower[i])) continue;
    if (sampleNumeric(rows, i)) return i;
  }
  return -1;
}

function sampleNumeric(rows, idx) {
  let ok = 0;
  let seen = 0;
  const sample = Math.min(rows.length, 80);
  for (let r = 0; r < sample; r++) {
    const v = rows[r][idx];
    if (v == null || v === "") continue;
    seen++;
    const num = Number(String(v).replace(",", "."));
    if (isFinite(num)) ok++;
  }
  return seen > 0 && ok / seen >= 0.6;
}

export function toNum(v) {
  if (v == null || v === "") return null;
  const num = Number(String(v).replace(",", "."));
  return isFinite(num) ? num : null;
}

// normalise a barri/district code to a plain numeric string "1".."73"
export function normCode(v) {
  if (v == null || v === "") return null;
  const n = parseInt(String(v).trim(), 10);
  if (!isFinite(n) || n <= 0) return null;
  return String(n);
}

// ---- Geometry: point-in-polygon + area ------------------------------------

// point [lon,lat] inside a polygon ring [ [lon,lat], ... ]
export function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// geometry: GeoJSON Polygon | MultiPolygon
export function pointInGeometry(pt, geometry) {
  if (!geometry) return false;
  if (geometry.type === "Polygon") {
    return pointInRing(pt, geometry.coordinates[0]);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((poly) => pointInRing(pt, poly[0]));
  }
  return false;
}

// spherical area in km^2 via shoelace on a local equirectangular tangent plane
export function polygonAreaKm2(geometry) {
  if (!geometry) return 0;
  const rings = geometry.type === "Polygon" ? [geometry.coordinates[0]] :
    geometry.type === "MultiPolygon" ? geometry.coordinates.map((p) => p[0]) : [];
  let total = 0;
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const latRef = ring[0][1] * Math.PI / 180;
    const R = 6371;
    const cosRef = Math.cos(latRef);
    let s = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      const mx = (x1 + x2) / 2 * Math.PI / 180;
      const dy = (y2 - y1) * Math.PI / 180;
      s += mx * dy * cosRef;
    }
    total += Math.abs(s) * R * R;
  }
  return Math.abs(total) / 1; // km^2
}

// centroid of a polygon (average of vertices — fine for normalisation)
export function polygonCentroid(geometry) {
  const rings = geometry.type === "Polygon" ? [geometry.coordinates[0]] :
    geometry.type === "MultiPolygon" ? geometry.coordinates.map((p) => p[0]) : [];
  let sx = 0, sy = 0, c = 0;
  for (const ring of rings) {
    for (const [x, y] of ring) { sx += x; sy += y; c++; }
  }
  if (c === 0) return null;
  return { lon: sx / c, lat: sy / c };
}

// ---- Normalisation --------------------------------------------------------

// values: array of number|null. returns 1-10 scores (null preserved). direction negative inverts.
export function minMax10(values, direction) {
  const vals = values.filter((v) => v != null && isFinite(v));
  if (!vals.length) return values.map(() => null);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return values.map((v) => {
    if (v == null || !isFinite(v)) return null;
    const t = max === min ? 0.5 : (v - min) / (max - min);
    let s = 1 + t * 9;
    if (direction === "negative") s = 11 - s;
    return Math.round(Math.max(1, Math.min(10, s)) * 10) / 10;
  });
}