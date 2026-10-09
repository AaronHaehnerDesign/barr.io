// Shared GeoJSON geometry helpers for boundary-import backend functions.

// Reduce a polygon ring to ~target points by uniform sampling (keeps closure).
export function simplifyRing(ring, target) {
  if (!Array.isArray(ring) || ring.length < 4) return ring;
  const n = ring.length;
  if (n <= target) return ring;
  const step = Math.ceil(n / target);
  const out = [];
  for (let i = 0; i < n; i += step) out.push(ring[i]);
  const first = out[0];
  const last = out[out.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) out.push(first);
  return out;
}

// Shoelace signed area (absolute) for picking the largest polygon of a MultiPolygon.
export function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += (x2 - x1) * (y2 + y1);
  }
  return Math.abs(area) / 2;
}

// Return the exterior ring (array of [lon,lat]) of the largest polygon in a geometry.
export function largestExteriorRing(geom) {
  if (!geom || typeof geom !== "object") return null;
  if (geom.type === "Polygon") return geom.coordinates && geom.coordinates[0];
  if (geom.type === "MultiPolygon") {
    let best = null;
    let bestArea = -1;
    for (const poly of geom.coordinates || []) {
      const ring = poly[0];
      const a = ringArea(ring);
      if (a > bestArea) {
        bestArea = a;
        best = ring;
      }
    }
    return best;
  }
  return null;
}

// Minimal WKT parser for POLYGON / MULTIPOLYGON in WGS84 lon lat.
export function parseWkt(wkt) {
  const s = String(wkt).trim();
  const polygonMatch = s.match(/^POLYGON\s*\(\(([^)]+)\)\)/i);
  if (polygonMatch) {
    const ring = polygonMatch[1].split(",").map((p) => p.trim().split(/\s+/).map(Number));
    return { type: "Polygon", coordinates: [ring] };
  }
  const multiMatch = s.match(/^MULTIPOLYGON\s*\(\s*(.+)\s*\)$/i);
  if (multiMatch) {
    const polys = [];
    const re = /\(\(([^)]+)\)\)/g;
    let m;
    while ((m = re.exec(s)) !== null) {
      const ring = m[1].split(",").map((p) => p.trim().split(/\s+/).map(Number));
      polys.push([ring]);
    }
    if (polys.length) return { type: "MultiPolygon", coordinates: polys };
  }
  return null;
}