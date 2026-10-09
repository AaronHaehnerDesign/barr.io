import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { simplifyRing, largestExteriorRing } from "../../shared/geo.ts";

// Mirror of the official Barcelona barris (neighbourhoods) shapefile as GeoJSON
// (WGS84), from the community mirror martgnz/bcn-geodata (CC-BY Ajuntament).
const URL = "https://raw.githubusercontent.com/martgnz/bcn-geodata/master/barris/barris.geojson";

// Normalised name for fuzzy matching between DB records and source features.
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function featureName(item) {
  const p = (item && item.properties) || item || {};
  return p.Nom_Barri || p.nom_barri || p.NomBarri || p.NOM || p.Nom || p.nom || p.NOM_BARRI || p.name || p.Nombre || p.NOMBRE || p.BARRI;
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
    if (!r.ok) return Response.json({ error: "fetch failed " + r.status, finalUrl: r.url }, { status: 502 });
    const text = await r.text();
    const trimmed = text.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      return Response.json({ error: "not json", head: text.slice(0, 200) }, { status: 502 });
    }
    const raw = JSON.parse(text);

    let features = [];
    if (Array.isArray(raw)) features = raw;
    else if (raw && raw.type === "FeatureCollection") features = raw.features || [];
    console.log("features:", features.length, "sample keys:", features[0] ? Object.keys(features[0].properties || features[0]) : []);
    console.log("sample props:", features[0] ? JSON.stringify(features[0].properties || features[0]) : "");

    // Load all barris (paginated) and index by normalised name.
    const byName = {};
    let cursor = undefined;
    let total = 0;
    do {
      const page = await base44.asServiceRole.entities.Barri.filter({}, { limit: 200, cursor, fields: ["name", "code", "district_code"] });
      for (const b of page.items || []) {
        byName[norm(b.name)] = b;
        total++;
      }
      cursor = page.has_more ? page.next_cursor : undefined;
    } while (cursor);
    console.log("barris in db:", total);

    const updates = [];
    const results = [];
    const unmatched = [];
    for (const item of features) {
      const feat = item && item.type === "Feature" ? item : { geometry: item?.geometry, properties: item };
      const ring = largestExteriorRing(feat.geometry);
      if (!ring || ring.length < 4) continue;
      const name = featureName(item);
      const key = norm(name);
      const b = byName[key];
      if (!b) { unmatched.push(name || "(no name)"); continue; }
      const simplified = simplifyRing(ring, 60);
      updates.push(
        base44.asServiceRole.entities.Barri.update(b.id, {
          geometry: { type: "Polygon", coordinates: [simplified] },
        }),
      );
      results.push({ code: b.code, name: b.name, points: simplified.length });
    }

    await Promise.all(updates);

    return Response.json({
      updated: results.length,
      features: features.length,
      barrisInDb: total,
      unmatchedSample: unmatched.slice(0, 15),
      results: results.slice(0, 5),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}