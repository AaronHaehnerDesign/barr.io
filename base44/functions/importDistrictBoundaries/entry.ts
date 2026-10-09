import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { simplifyRing, ringArea, largestExteriorRing, parseWkt } from "../../shared/geo.ts";

// Mirror of the official Barcelona districtes shapefile as GeoJSON (WGS84).
// Open Data BCN's portal blocks server-side fetches with bot detection, so we
// use the community mirror (martgnz/bcn-geodata) on raw.githubusercontent.com,
// which is CORS-open and serves the same CartoBCN source (CC-BY Ajuntament).
const URL = "https://raw.githubusercontent.com/martgnz/bcn-geodata/master/districtes/districtes.geojson";

function extractFeature(item) {
  let geom = null;
  let props = item;
  if (item && item.type === "Feature") {
    geom = item.geometry || null;
    props = item.properties || {};
  } else if (item && item.geometry) {
    geom = item.geometry;
  } else if (item) {
    const g =
      item.Geometria_WGS84 || item.geometria_wgs84 || item.GeoJSON || item.geom ||
      item.the_geom || item.geometry_wgs84 || item.wkt || item.WKT;
    if (typeof g === "string") {
      const trimmed = g.trim();
      if (trimmed.startsWith("{")) {
        try { geom = JSON.parse(trimmed); } catch (e) { geom = parseWkt(trimmed); }
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
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: 'Forbidden' }, { status: 403 });

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

    const normCode = (c) => String(c).replace(/^0+/, "");
    const page = await base44.asServiceRole.entities.District.filter({}, { limit: 50 });
    const districts = page.items || [];
    const byCode = {};
    for (const d of districts) byCode[normCode(d.code)] = d;

    const results = [];
    const updates = [];
    for (const item of features) {
      const ex = extractFeature(item);
      if (!ex.geom) continue;
      const ring = largestExteriorRing(ex.geom);
      if (!ring || ring.length < 4) continue;
      const simplified = simplifyRing(ring, 80);
      const code = normCode(ex.code);
      const d = byCode[code];
      if (!d) continue;
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
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}