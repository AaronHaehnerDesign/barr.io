// Admin-only refresh of Open Data BCN indicators.
// Loads district + barri boundaries first (so rows can be geo-assigned), then
// for each dataset: fetches rows via the CKAN Datastore API, groups them by area
// (count or value), normalises to 1–10, writes IndicatorValue records and updates
// each area's category_scores. Records per-dataset status in DataSyncStatus.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import {
  DATASETS,
  packageShow,
  listResources,
  pickResource,
  fetchRows,
  loadBoundaries,
  resolveArea,
  rowValue,
  minMax10,
  normalizeName
} from './util.ts';

type AnyClient = any;

async function asArr(db: AnyClient, entity: string, limit = 2000) {
  const res = await db.entities[entity].filter({}, { limit });
  return Array.isArray(res) ? res : (res.items ?? []);
}

function catKeyFor(cfg: AnyClient) {
  return cfg.category_key;
}

export default async function (req: any) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

  const db = base44.asServiceRole;
  const body = await req.json().catch(() => ({}));
  const requested: string[] | undefined = Array.isArray(body?.datasets) ? body.datasets : undefined;
  const targets = requested && requested.length
    ? DATASETS.filter((d) => requested.includes(d.code))
    : DATASETS;

  const results: any[] = [];
  // boundary-code -> matched entity, carried from boundaries step to indicator step
  const barriEntByBCode = new Map<string, any>();
  const dEntByCode = new Map<string, any>();

  // ---- 1. Boundaries (run first so other datasets can geo-assign) ----
  const boundsCfg = targets.find((d) => d.mode === 'boundaries');
  const otherDs = targets.filter((d) => d.mode !== 'boundaries');
  if (boundsCfg) {
    const startedAt = new Date().toISOString();
    try {
      const { districts, barris } = await loadBoundaries();

      const existingBarri = await asArr(db, 'Barri');
      const existingDist = await asArr(db, 'District');
      const bByNorm = new Map(existingBarri.map((b: any) => [normalizeName(b.name), b]));
      const dByCodeMap = new Map(existingDist.map((d: any) => [String(d.code), d]));
      const dByNorm = new Map(existingDist.map((d: any) => [normalizeName(d.name), d]));

      const bUpdates = barris.map((b) => {
        const ring = b.polys[0] || [];
        const ent = bByNorm.get(normalizeName(b.name));
        if (ent) barriEntByBCode.set(String(b.code), ent);
        return ent ? {
          id: ent.id,
          geometry: { type: 'Polygon', coordinates: [ring] },
          centroid: { lon: b.centroid[0], lat: b.centroid[1] },
          is_sample: false
        } : null;
      }).filter(Boolean);
      const dUpdates = districts.map((d) => {
        const ring = d.polys[0] || [];
        const ent = dByCodeMap.get(String(d.code)) || dByNorm.get(normalizeName(d.name));
        if (ent) dEntByCode.set(String(d.code), ent);
        return ent ? {
          id: ent.id,
          geometry: { type: 'Polygon', coordinates: [ring] },
          centroid: { lon: d.centroid[0], lat: d.centroid[1] },
          is_sample: false
        } : null;
      }).filter(Boolean);

      if (bUpdates.length) await db.entities.Barri.bulkUpdate(bUpdates);
      if (dUpdates.length) await db.entities.District.bulkUpdate(dUpdates);

      results.push({
        dataset_code: boundsCfg.code,
        status: 'success',
        records_written: bUpdates.length + dUpdates.length,
        error: null,
        resource_last_modified: null,
        finished_at: new Date().toISOString()
      });
      await upsertStatus(db, boundsCfg.code, 'success', bUpdates.length + dUpdates.length, null, startedAt);
    } catch (e: any) {
      results.push({ dataset_code: boundsCfg.code, status: 'error', records_written: 0, error: e.message, resource_last_modified: null, finished_at: new Date().toISOString() });
      await upsertStatus(db, boundsCfg.code, 'error', 0, e.message, startedAt);
    }
  }

  // ---- 2. Indicator datasets ----
  // Reload areas to build geo-lookup maps carrying the freshly-written polygons.
  const barris = await asArr(db, 'Barri');
  const districts = await asArr(db, 'District');
  const polyBarris: any[] = [];
  const barriByCode = new Map<string, any>();
  for (const b of barris) {
    const code = String(b.code);
    barriByCode.set(code, b);
    barriByCode.set(code.padStart(2, '0'), b);
    let polys: number[][][] = [];
    try {
      const g = b.geometry;
      if (g?.type === 'Polygon' && Array.isArray(g.coordinates)) polys = g.coordinates.map((r: any) => r);
      else if (g?.type === 'MultiPolygon') polys = g.coordinates.flatMap((p: any) => p);
    } catch {}
    if (polys.length) polyBarris.push({ id: b.id, code, polys });
  }
  // Merge boundary (CKAN codi_barri) codes so indicator rows can resolve by code.
  for (const [bcode, ent] of barriEntByBCode) barriByCode.set(String(bcode), ent);
  const polyDistricts: any[] = [];
  const districtByCode = new Map<string, any>();
  for (const d of districts) {
    const code = String(d.code);
    districtByCode.set(code, d);
    districtByCode.set(code.padStart(2, '0'), d);
    let polys: number[][][] = [];
    try {
      const g = d.geometry;
      if (g?.type === 'Polygon' && Array.isArray(g.coordinates)) polys = g.coordinates.map((r: any) => r);
      else if (g?.type === 'MultiPolygon') polys = g.coordinates.flatMap((p: any) => p);
    } catch {}
    if (polys.length) polyDistricts.push({ id: d.id, code, polys });
  }
  for (const [dcode, ent] of dEntByCode) districtByCode.set(String(dcode), ent);

  // Accumulate category scores per area across datasets (for averaging shared categories).
  const catAcc = new Map<string, Map<string, { sum: number; count: number }>>(); // areaKey -> catKey -> {sum,count}
  const areaKey = (t: string, id: string) => `${t}:${id}`;

  for (const cfg of otherDs) {
    const startedAt = new Date().toISOString();
    let resourceLastModified: string | null = null;
    try {
      const pkg = await packageShow(cfg.code);
      const res = pickResource(listResources(pkg), cfg);
      if (!res) throw new Error('No suitable CKAN resource found');
      resourceLastModified = res.last_modified || null;
      const rows = await fetchRows(res, 20000);

      // Group rows by area -> raw value (count or summed value)
      const bucket = new Map<string, { area_type: string; area_id: string; area_code: string; raw: number }>();
      for (const row of rows) {
        const a = resolveArea(row, barriByCode, districtByCode, polyBarris, polyDistricts);
        if (!a) continue;
        const key = `${a.area_type}:${a.area_id}`;
        let raw: number;
        if (cfg.mode === 'count') raw = 1;
        else { const v = rowValue(row); if (v == null) continue; raw = v; }
        const prev = bucket.get(key);
        if (prev) prev.raw += raw;
        else bucket.set(key, { area_type: a.area_type, area_id: a.area_id, area_code: a.area_code, raw });
      }
      if (!bucket.size) throw new Error('No rows matched any district or barri');

      const entries = [...bucket.values()];
      const norms = minMax10(entries.map((e) => e.raw), cfg.direction || 'positive');

      // Replace any previous IndicatorValue rows for this dataset's indicator.
      await db.entities.IndicatorValue.deleteMany({ category_key: cfg.category_key, indicator_name: cfg.label }).catch(() => {});
      const recs = entries.map((e, i) => ({
        indicator_name: cfg.label,
        category_key: cfg.category_key,
        area_type: e.area_type,
        area_id: e.area_id,
        area_code: e.area_code,
        raw_value: Number(e.raw.toFixed(2)),
        normalized_score: norms[i] ?? null,
        year: cfg.year || undefined,
        external: true
      })).filter((r) => r.normalized_score != null);
      if (recs.length) await db.entities.IndicatorValue.bulkCreate(recs);

      // Accumulate category scores
      for (const r of recs) {
        const ak = areaKey(r.area_type, r.area_id);
        if (!catAcc.has(ak)) catAcc.set(ak, new Map());
        const m = catAcc.get(ak)!;
        const cur = m.get(r.category_key) || { sum: 0, count: 0 };
        cur.sum += r.normalized_score!;
        cur.count += 1;
        m.set(r.category_key, cur);
      }

      results.push({ dataset_code: cfg.code, status: 'success', records_written: recs.length, error: null, resource_last_modified: resourceLastModified, finished_at: new Date().toISOString() });
      await upsertStatus(db, cfg.code, 'success', recs.length, null, startedAt, resourceLastModified);
    } catch (e: any) {
      results.push({ dataset_code: cfg.code, status: 'error', records_written: 0, error: e.message, resource_last_modified: resourceLastModified, finished_at: new Date().toISOString() });
      await upsertStatus(db, cfg.code, 'error', 0, e.message, startedAt, resourceLastModified);
    }
  }

  // ---- 3. Write per-area category_scores (averaged across datasets per category) ----
  const bUpd: any[] = [];
  const dUpd: any[] = [];
  for (const [ak, cats] of catAcc) {
    const [type, id] = ak.split(':');
    const scores: Record<string, number> = {};
    for (const [ck, v] of cats) scores[ck] = Number((v.sum / v.count).toFixed(1));
    if (type === 'barri') bUpd.push({ id, category_scores: scores }); else dUpd.push({ id, category_scores: scores });
  }
  if (bUpd.length) await db.entities.Barri.bulkUpdate(bUpd).catch(() => {});
  if (dUpd.length) await db.entities.District.bulkUpdate(dUpd).catch(() => {});

  return Response.json({ results });
}

async function upsertStatus(db: AnyClient, code: string, status: string, records: number, error: string | null, startedAt: string, resourceLastModified: string | null = null) {
  const rec: any = {
    dataset_code: code,
    status,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    records_written: records,
    error_message: error || undefined,
    resource_last_modified: resourceLastModified || undefined
  };
  try {
    await db.entities.DataSyncStatus.upsert([rec], { key: 'dataset_code' });
  } catch {
    try { await db.entities.DataSyncStatus.create(rec); } catch {}
  }
}