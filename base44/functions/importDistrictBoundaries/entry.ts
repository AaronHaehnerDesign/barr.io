import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Mirror of the official Barcelona districtes shapefile as GeoJSON (WGS84).
// Open Data BCN's portal blocks server-side fetches with bot detection, so we
// use the community mirror (martgnz/bcn-geodata) on raw.githubusercontent.com,
// which is CORS-open and serves the same CartoBCN source (CC-BY Ajuntament).
const URL = "https://raw.githubusercontent.com/martgnz/bcn-geodata/master/districtes/districtes.geojson";

// Reduce a polygon ring to ~target points by uniform sampling (keeps closure).
function simplifyRing(ring, target) {
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
function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += (x2 - x1) * (y2 + y1);
  }
  return Math.abs(area) / 2;
}

// Return the exterior ring (array of [lon,lat]) of the largest polygon in a geometry.
function largestExteriorRing(geom) {
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
function parseWkt(wkt) {
  const s = String(wkt).trim();
  const polygonMatch = s.match(/^POLYGON\s*\(\(([^)]+)\)\)/i);
  if (polygonMatch) {
    const ring = polygonMatch[1].split(",").map((p) => p.trim().split(/\s+/).map(Number));
    return { type: "Polygon", coordinates: [ring] };
  }
  const multiMatch = s.match(/^MULTIPOLYGON\s*\(\s*(.+)\s*\)$/i);
  if (multiMatch) {
    // extract each ((...)) block
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

function extractFeature(item) {
  let geom = null;
  let props = item;
  // GeoJSON Feature
  if (item && item.type === "Feature") {
    geom = item.geometry || null;
    props = item.properties || {};
  } else if (item && item.geometry) {
    geom = item.geometry;
  } else if (item) {
    const g =
      item.Geometria_WGS84 ||
      item.geometria_wgs84 ||
      item.GeoJSON ||
      item.geom ||
      item.the_geom ||
      item.geometry_wgs84 ||
      item.wkt ||
      item.WKT;
    if (typeof g === "string") {
      const trimmed = g.trim();
      if (trimmed.startsWith("{")) {
        try {
          geom = JSON.parse(trimmed);
        } catch (e) {
          geom = parseWkt(trimmed);
        }
      } else {
        geom = parseWkt(trimmed);
      }
    } else if (g && typeof g === "object") {
      geom = g;
    }
  }

  const obj = { ...props, ...item };
  const code =
    obj.Codi_Districte ?? obj.codi_districte ?? obj.DISTRICTE ?? obj.Districte ?? obj.CODI ??
    obj.C_DISTRICTE ?? obj.codi ?? obj.code ?? obj.DISTRICTCODE;
  const name =
    obj.Nom_Districte ?? obj.nom_districte ?? obj.NOM ?? obj.Nombre ?? obj.name ?? obj.nom ??
    obj.N_DISTRICTE ?? obj.NOMBRE ?? obj.DISTRICTNAME;

  return { code, name, geom };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const r = await fetch(URL, {
      signal: AbortSignal.timeout(20000),
      headers: {
        Accept: "application/json,text/plain;q=0.9,*/*;q=0.1",
        "User-Agent": "BarrioMatch/1.0 (https://find-your-barrio.base44.app)",
        "Accept-Language": "es,en;q=0.8",
      },
      redirect: "follow",
    });
    if (!r.ok) return Response.json({ error: "fetch failed " + r.status + " " + r.statusText, finalUrl: r.url }, { status: 502 });
    const text = await r.text();
    console.log("resp ct:", r.headers.get("content-type"), "len:", text.length, "finalUrl:", r.url, "head:", text.slice(0, 160));
    let raw;
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      raw = JSON.parse(text);
    } else {
      return Response.json({ error: "not json", contentType: r.headers.get("content-type"), head: text.slice(0, 300), finalUrl: r.url }, { status: 502 });
    }

    let features = [];
    if (Array.isArray(raw)) features = raw;
    else if (raw && raw.type === "FeatureCollection") features = raw.features || [];
    else if (raw && Array.isArray(raw.elements)) features = raw.elements;
    else if (raw && raw.result && Array.isArray(raw.result.records)) features = raw.result.records;

    console.log("top.type", raw && raw.type, "features.length", features.length);
    if (features[0]) console.log("sample keys:", Object.keys(features[0]));

    const normCode = (c) => String(c).replace(/^0+/, "");
    const page = await base44.asServiceRole.entities.District.filter({}, { limit: 50 });
    const districts = page.items || [];
    const byCode = {};
    for (const d of districts) byCode[normCode(d.code)] = d;

    const results = [];
    const updates = [];
    for (const item of features) {
      const ex = extractFeature(item);
      if (!ex.geom) {
        console.log("skip (no geom):", ex.name || ex.code, JSON.stringify(item).slice(0, 120));
        continue;
      }
      const ring = largestExteriorRing(ex.geom);
      if (!ring || ring.length < 4) {
        console.log("skip (no ring):", ex.code, ex.name, "geom type", ex.geom.type);
        continue;
      }
      const simplified = simplifyRing(ring, 80);
      const code = normCode(ex.code);
      const d = byCode[code];
      if (!d) {
        console.log("no district record for code", code, ex.name);
        continue;
      }
      updates.push(
        base44.asServiceRole.entities.District.update(d.id, {
          geometry: { type: "Polygon", coordinates: [simplified] },
        }),
      );
      results.push({ code, name: d.name, points: simplified.length });
    }

    await Promise.all(updates);

    return Response.json({
      updated: results.length,
      features: features.length,
      districtsInDb: districts.length,
      results,
      sampleKeys: features[0] ? Object.keys(extractFeature(features[0]).geom ? features[0].properties || features[0] : features[0]) : [],
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}