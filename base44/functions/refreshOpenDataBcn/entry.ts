// BarrioMatch Open Data BCN refresh.
// Admin-only. Loads barri boundaries, then for each requested dataset fetches the
// latest CKAN resource, assigns rows to barris (by barri code, else point-in-polygon),
// aggregates per barri and per district, normalises to 1-10, and writes
// IndicatorValue + CategoryScore. Also updates Barri/District entities so the UI
// reflects real scores, and a DataSyncStatus record per dataset.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  DATASETS, datasetConfig, packageShow, pickResource, resourceLastModified,
  downloadText, parseCSV, parseJSON, barriCol, districtCol, latLonCols, valueCol,
  toNum, normCode, pointInGeometry, polygonAreaKm2, polygonCentroid, minMax10
} from "./util.ts";

const ALL_CODES = DATASETS.map((d) => d.code);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const requested = Array.isArray(body.datasets) && body.datasets.length
      ? body.datasets.map((c) => String(c))
      : ALL_CODES;

    const db = base44.asServiceRole;
    const results = [];

    // --- load barri + district master from entities (population, ids) ---
    const [barriPage, distPage] = await Promise.all([
      db.entities.Barri.filter({}, { limit: 200 }),
      db.entities.District.filter({}, { limit: 50 })
    ]);
    const barriById = {};   // numeric code string -> entity
    for (const b of barriPage.items || []) {
      const c = normCode(b.code) || String(b.code);
      barriById[c] = b;
    }
    const distById = {};
    for (const d of distPage.items || []) {
      const c = normCode(d.code) || String(d.code);
      distById[c] = d;
    }

    // --- load boundaries (always, for PIP fallback + master list) ---
    let barris = []; // { code, name, districte, districte_name, polygon, centroid, areaKm2, pop, entityId }
    const boundariesCfg = datasetConfig("20170706-districtes-barris");
    const bStatus = await runDataset(boundariesCfg, async () => {
      const pkg = await packageShow(boundariesCfg.code);
      const res = pickResource(pkg, boundariesCfg);
      const text = await downloadText(res.url);
      const geo = parseJSON(text);
      const feats = geo.features || [];
      barris = feats.map((f) => {
        const p = f.properties || {};
        const code = normCode(p.Codi_Barri ?? p.codi_barri ?? p.BARRI ?? p.barri);
        return {
          code,
          name: p.Nom_Barri || p.nom_barri || p.NOM_BARRI || "",
          districte: normCode(p.Codi_Districte ?? p.codi_districte ?? p.DISTRICTE ?? p.districte),
          districte_name: p.Nom_Districte || p.nom_districte || "",
          polygon: f.geometry,
          centroid: polygonCentroid(f.geometry),
          areaKm2: polygonAreaKm2(f.geometry),
          pop: barriById[code]?.population || 0,
          entityId: barriById[code]?.id || null
        };
      }).filter((b) => b.code);
      // population fallback: build code -> pop; also district pop = sum of barri pops
      return { records: barris.length, resource: res };
    }, db);
    results.push(bStatus);

    // master district set from boundaries (unique districte codes)
    const districtCodes = Array.from(new Set(barris.map((b) => b.districte).filter(Boolean)));
    const districtPop = {};
    for (const c of districtCodes) districtPop[c] = 0;
    for (const b of barris) {
      if (b.districte) districtPop[b.districte] = (districtPop[b.districte] || 0) + b.pop;
    }

    // merged category scores to push back onto Barri/District entities
    const barriCat = {}; // code -> { catKey: score }
    const distCat = {};
    const seedFromEntity = (e, target) => {
      if (e && e.category_scores) for (const k of Object.keys(e.category_scores)) target[k] = e.category_scores[k];
    };
    for (const b of barris) { barriCat[b.code] = {}; seedFromEntity(barriById[b.code], barriCat[b.code]); }
    for (const c of districtCodes) { distCat[c] = {}; seedFromEntity(distById[c], distCat[c]); }

    // --- process each non-boundaries dataset ---
    for (const code of requested) {
      const cfg = datasetConfig(code);
      if (!cfg || cfg.role === "boundaries") continue;

      const status = await runDataset(cfg, async () => {
        const pkg = await packageShow(cfg.code);
        const res = pickResource(pkg, cfg);
        const text = await downloadText(res.url);
        const isJson = /json/i.test(res.format || "") && cfg.format === "JSON";
        const { headers, rows } = isJson ? jsonToRows(parseJSON(text)) : parseCSV(text);

        const bIdx = barriCol(headers);
        const dIdx = districtCol(headers);
        const ll = latLonCols(headers);
        const vIdx = cfg.role === "count" ? -1 : valueCol(headers, rows, cfg.valueHint);

        if (cfg.role !== "count" && vIdx < 0) throw new Error("no numeric value column found");

        // raw metric per barri code
        const barriRaw = {}; // code -> number (sum for count, mean accumulator for value/pointvalue)
        const barriCnt = {};
        let maxPoints = cfg.maxPoints || 200000;
        let processed = 0;

        for (const r of rows) {
          if (processed >= maxPoints) break;
          let bcode = bIdx >= 0 ? normCode(r[bIdx]) : null;
          if (!bcode && ll) {
            const lat = toNum(r[ll.lat]);
            const lon = toNum(r[ll.lon]);
            if (lat != null && lon != null) {
              const hit = barris.find((b) => pointInGeometry([lon, lat], b.polygon));
              if (hit) bcode = hit.code;
            }
          }
          if (!bcode) continue;
          processed++;

          if (cfg.role === "count") {
            barriRaw[bcode] = (barriRaw[bcode] || 0) + 1;
          } else {
            const val = toNum(r[vIdx]);
            if (val == null) continue;
            barriRaw[bcode] = (barriRaw[bcode] || 0) + val;
            barriCnt[bcode] = (barriCnt[bcode] || 0) + 1;
          }
        }

        // finalise barri metrics: count -> per capita (per-km2 if no pop); value -> maybe per-capita; pointvalue -> average
        const barriMetric = barris.map((b) => {
          const raw = barriRaw[b.code] != null ? barriRaw[b.code] : null;
          if (raw == null) return { code: b.code, raw: null };
          let metric = raw;
          if (cfg.role === "count") {
            const denom = b.pop > 0 ? b.pop / cfg.per : b.areaKm2 > 0 ? b.areaKm2 : 1;
            metric = raw / denom;
          } else if (cfg.role === "pointvalue") {
            metric = barriCnt[b.code] > 0 ? raw / barriCnt[b.code] : raw;
          } else if (cfg.role === "value" && cfg.perCapita) {
            const denom = b.pop > 0 ? b.pop / cfg.per : (b.areaKm2 > 0 ? b.areaKm2 : 1);
            metric = raw / denom;
          }
          return { code: b.code, raw: metric };
        });

        // district metric: count -> sum counts / district pop; value -> pop-weighted mean; pointvalue -> area-weighted mean
        const distRaw = {};
        const distW = {};
        for (const m of barriMetric) {
          if (m.raw == null) continue;
          const b = barris.find((x) => x.code === m.code);
          if (!b || !b.districte) continue;
          const w = cfg.role === "pointvalue" ? (b.areaKm2 || 1) : (b.pop || b.areaKm2 || 1);
          distRaw[b.districte] = (distRaw[b.districte] || 0) + (cfg.role === "count" ? m.raw * (b.pop > 0 ? b.pop / cfg.per : 1) : m.raw * w);
          distW[b.districte] = (distW[b.districte] || 0) + (cfg.role === "count" ? 1 : w);
        }
        const distMetric = districtCodes.map((c) => {
          if (distRaw[c] == null) return { code: c, raw: null };
          let metric;
          if (cfg.role === "count") {
            const denom = districtPop[c] > 0 ? districtPop[c] / cfg.per : 1;
            metric = denom > 0 ? distRaw[c] / denom : distRaw[c];
          } else {
            metric = distW[c] > 0 ? distRaw[c] / distW[c] : distRaw[c];
          }
          return { code: c, raw: metric };
        });

        // normalise 1-10
        const bScores = minMax10(barriMetric.map((m) => m.raw), cfg.direction);
        const dScores = minMax10(distMetric.map((m) => m.raw), cfg.direction);

        // write IndicatorValue (delete old for this indicator, then bulkCreate)
        const indicatorValues = [];
        barris.forEach((b, i) => {
          if (bScores[i] == null) return;
          indicatorValues.push({
            indicator_name: cfg.indicator_name, category_key: cfg.category_key,
            area_type: "barri", area_id: b.entityId || b.code, area_code: b.code,
            raw_value: barriMetric[i].raw, normalized_score: bScores[i], year: cfg.year || null
          });
        });
        districtCodes.forEach((c, i) => {
          if (dScores[i] == null) return;
          indicatorValues.push({
            indicator_name: cfg.indicator_name, category_key: cfg.category_key,
            area_type: "district", area_id: distById[c]?.id || c, area_code: c,
            raw_value: distMetric[i].raw, normalized_score: dScores[i], year: cfg.year || null
          });
        });
        await db.entities.IndicatorValue.deleteMany({ indicator_name: cfg.indicator_name });
        if (indicatorValues.length) await db.entities.IndicatorValue.bulkCreate(indicatorValues);

        // recompute CategoryScore for this category (mean of all its indicators per area)
        const catIndicators = await db.entities.IndicatorValue.filter(
          { category_key: cfg.category_key }, { limit: 500 }
        );
        const byArea = {}; // "type|area_id" -> { sum, count, area_code, type, id }
        for (const iv of catIndicators.items || []) {
          const key = iv.area_type + "|" + iv.area_id;
          if (!byArea[key]) byArea[key] = { sum: 0, count: 0, area_type: iv.area_type, area_id: iv.area_id, area_code: iv.area_code };
          if (iv.normalized_score != null) { byArea[key].sum += iv.normalized_score; byArea[key].count++; }
        }
        const catScores = Object.values(byArea).filter((a) => a.count > 0).map((a) => ({
          category_key: cfg.category_key, area_type: a.area_type, area_id: a.area_id,
          area_code: a.area_code, score: Math.round((a.sum / a.count) * 10) / 10
        }));
        await db.entities.CategoryScore.deleteMany({ category_key: cfg.category_key });
        if (catScores.length) await db.entities.CategoryScore.bulkCreate(catScores);

        // stash merged category scores for entity update
        for (const a of catScores) {
          if (a.area_type === "barri" && barriCat[a.area_code]) barriCat[a.area_code][cfg.category_key] = a.score;
          if (a.area_type === "district" && distCat[a.area_code]) distCat[a.area_code][cfg.category_key] = a.score;
        }

        return { records: indicatorValues.length, resource: res };
      }, db);
      results.push(status);
    }

    // --- push category_scores back onto Barri + District entities ---
    try {
      const bUpdates = barris.filter((b) => b.entityId).map((b) => ({
        id: b.entityId, category_scores: barriCat[b.code] || {}, is_sample: false
      }));
      if (bUpdates.length) await db.entities.Barri.bulkUpdate(bUpdates);
      const dUpdates = districtCodes.filter((c) => distById[c]?.id).map((c) => ({
        id: distById[c].id, category_scores: distCat[c] || {}, is_sample: false
      }));
      if (dUpdates.length) await db.entities.District.bulkUpdate(dUpdates);
    } catch (e) {
      results.push({ dataset_code: "_entities", status: "error", error: e.message, finished_at: new Date().toISOString() });
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Flatten a JSON resource (object or array) into { headers, rows }.
function jsonToRows(json) {
  const arr = Array.isArray(json) ? json : (json.features ? json.features.map((f) => ({ ...f.properties })) : [json]);
  if (!arr.length) return { headers: [], rows: [] };
  const headers = Array.from(new Set(arr.flatMap((o) => Object.keys(o || {}))));
  const rows = arr.map((o) => headers.map((h) => (o && o[h] != null ? String(o[h]) : "")));
  return { headers, rows };
}

// Run one dataset end-to-end, persisting a DataSyncStatus record.
async function runDataset(cfg, fn, db) {
  const code = cfg.code;
  const started = new Date().toISOString();
  let statusRec = {
    dataset_code: code, indicator_name: cfg.indicator_name || null, category_key: cfg.category_key || null,
    status: "running", started_at: started, error_message: null,
    records_written: 0, resource_last_modified: null, finished_at: null
  };
  try {
    await db.entities.DataSyncStatus.upsert([statusRec], { key: "dataset_code" });
    const out = await fn();
    statusRec.status = "success";
    statusRec.records_written = out.records || 0;
    statusRec.resource_last_modified = out.resource ? resourceLastModified(out.resource) : null;
    statusRec.finished_at = new Date().toISOString();
  } catch (err) {
    statusRec.status = "error";
    statusRec.error_message = String(err.message || err).slice(0, 500);
    statusRec.finished_at = new Date().toISOString();
  }
  try {
    await db.entities.DataSyncStatus.upsert([statusRec], { key: "dataset_code" });
  } catch (_e) { /* status write best-effort */ }
  return {
    dataset_code: code, status: statusRec.status, records_written: statusRec.records_written,
    error: statusRec.error_message, resource_last_modified: statusRec.resource_last_modified,
    finished_at: statusRec.finished_at
  };
}