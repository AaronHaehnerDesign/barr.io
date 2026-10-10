// BarrioMatch — Google Drive data import pipeline.
//
// Reads the builder's shared Google Drive folder of Open Data BCN exports and
// turns the area-coded tables (phase 1) into normalized indicator rows stored
// on the District/Barri `indicators` arrays, recomputing affected category_scores
// so rankings update.
//
// MODE = "preview": list/inspect files (headers + sample rows).
// MODE = "import":  download + aggregate + upsert phase-1 indicators.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import * as XLSX from 'npm:xlsx@0.18.5';
import {
  norm, normCode, parseCsv, normalizeScores, mergeIndicator, recomputeCategoryScore, CONFIG,
} from "../../shared/driveImport.ts";

const DEFAULT_FOLDER_ID = "125NPW7IkYVfKMrUg3RQYhbzWR49524Pu";

// --- Folder listing via the shared Google Drive connector ---
async function listFolder(auth: Record<string, string>, folderId: string): Promise<any[]> {
  let pageToken: string | undefined = undefined;
  const all: any[] = [];
  do {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const fields = "nextPageToken,files(id,name,mimeType,size)";
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=200${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const r = await fetch(url, { headers: auth, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error("drive list failed " + r.status + ": " + (await r.text()).slice(0, 200));
    const j = await r.json();
    all.push(...(j.files || []));
    pageToken = j.nextPageToken || undefined;
  } while (pageToken);
  return all;
}

async function downloadFile(auth: Record<string, string>, id: string, size: number): Promise<string> {
  const headers = { ...auth };
  // Full download for parseable tables.
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error("download failed " + r.status);
  return await r.text();
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const folderId = body.folderId || DEFAULT_FOLDER_ID;
    const mode = body.mode || "preview";

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");
    const auth = { Authorization: `Bearer ${accessToken}` };

    if (mode === "import") return await runImport(base44, auth, folderId, body);

    // ---------------- PREVIEW ----------------
    const allFiles = await listFolder(auth, folderId);
    const out: any[] = [];
    const processFile = async (f: any) => {
      const entry: any = { name: f.name, id: f.id, mimeType: f.mimeType, size: Number(f.size || 0) };
      try {
        const isCsv = f.mimeType === "text/csv" || /\.csv$/i.test(f.name);
        const isXlsx = /\.xlsx$/i.test(f.name);
        const isXls = /\.xls$/i.test(f.name);
        const preferRange = entry.size > 2 * 1024 * 1024;
        const headers: Record<string, string> = { ...auth };
        if (preferRange) headers["Range"] = `bytes=0-12000`;
        const r = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, { headers, signal: AbortSignal.timeout(preferRange ? 15000 : 30000) });
        if (!r.ok && r.status !== 206) { entry.error = "download " + r.status; return entry; }
        let buf = await r.arrayBuffer();
        if (preferRange && r.status === 200) buf = buf.slice(0, 12000);
        if (isCsv) {
          const rows = parseCsv(new TextDecoder("utf-8").decode(buf));
          entry.headers = rows[0] || [];
          entry.sampleRows = rows.slice(1, 4);
        } else if (isXlsx || isXls) {
          const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
          entry.sheetNames = wb.SheetNames;
          entry.headers = rows[0] || [];
          entry.sampleRows = rows.slice(1, 4).map((r2: any) => r2.map(String));
        } else {
          entry.head = new TextDecoder("utf-8").decode(buf.slice(0, 300));
        }
      } catch (e: any) {
        entry.error = e?.message || String(e);
      }
      return entry;
    };

    const matchSubs: string[] = Array.isArray(body.match) ? body.match.map(String) : [];
    const pick = (f: any) => !matchSubs.length || matchSubs.some(m => f.name.toLowerCase().includes(m.toLowerCase()));

    for (let i = 0; i < allFiles.length; i += 6) {
      const batch = allFiles.slice(i, i + 6);
      const settled = await Promise.allSettled(batch.map(processFile));
      for (let j = 0; j < settled.length; j++) {
        const s = settled[j];
        if (s.status === "fulfilled") out.push(s.value);
        else out.push({ name: batch[j].name, id: batch[j].id, error: String(s.reason?.message || s.reason) });
      }
    }

    const filtered = matchSubs.length ? out.filter(pick) : out;
    if (matchSubs.length) return Response.json({ folderId, matched: filtered.length, files: filtered });
    return Response.json({ folderId, totalFiles: allFiles.length, files: filtered.map((f: any) => f.name) });
  } catch (error: any) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

// ---------------- IMPORT (phase 1: area-coded tables) ----------------
async function runImport(base44: any, auth: Record<string, string>, folderId: string, body: any): Promise<Response> {
  const onlyIndicator: string | undefined = body.indicator; // restrict to one config (by match substring)
  const allFiles = await listFolder(auth, folderId);

  // Load all barris + districts with their indicators + populations.
  const barris: any[] = [];
  let cursor: string | undefined = undefined;
  do {
    const page = await base44.asServiceRole.entities.Barri.filter({}, {
      limit: 200, cursor,
      fields: ["id", "name", "code", "district_code", "district_name", "population", "indicators", "category_scores"],
    });
    barris.push(...(page.items || []));
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);

  const distPage = await base44.asServiceRole.entities.District.filter({}, {
    limit: 50,
    fields: ["id", "name", "code", "population", "indicators", "category_scores"],
  });
  const districts: any[] = distPage.items || [];

  // Group barris under their district (by code).
  const barrisByDistrict = new Map<string, any[]>();
  for (const b of barris) {
    const dk = normCode(b.district_code || "");
    (barrisByDistrict.get(dk) || barrisByDistrict.set(dk, []).get(dk)!).push(b);
  }

  // Working copies that accumulate every indicator change before a single persist.
  for (const r of [...barris, ...districts]) {
    r._ind = (r.indicators || []).slice();
    r._cs = { ...(r.category_scores || {}) };
    r._changed = false;
  }

  const summary: any[] = [];

  for (const cfg of CONFIG) {
    if (onlyIndicator && !cfg.match.includes(onlyIndicator) && !onlyIndicator.includes(cfg.match.replace("__", ""))) continue;
    const file = allFiles.find(f => f.name.toLowerCase().includes(cfg.match.toLowerCase()));
    if (!file) { summary.push({ match: cfg.match, status: "file not found" }); continue; }

    const text = await downloadFile(auth, file.id, Number(file.size || 0));
    const rows = parseCsv(text);
    const headers = rows[0] || [];
    const baseMap = cfg.extract(rows, headers); // Map<normBarriName, base>

    // --- Barri raw values ---
    const barriEntries: { key: string; raw: number | null }[] = [];
    for (const b of barris) {
      const key = norm(b.name);
      const base = baseMap.has(key) ? baseMap.get(key)! : null;
      const pop = Number(b.population) || 0;
      let raw: number | null = null;
      if (base != null) raw = cfg.perCapitaScale ? (pop > 0 ? (base / pop) * cfg.perCapitaScale : null) : base;
      barriEntries.push({ key, raw });
    }
    const barriScores = normalizeScores(barriEntries.map(e => ({ key: e.key, raw: e.raw })), cfg.indicator.direction);

    // --- District rollup ---
    const distEntries: { key: string; raw: number | null }[] = [];
    for (const d of districts) {
      const dk = normCode(d.code);
      const children = barrisByDistrict.get(dk) || [];
      let raw: number | null = null;
      if (cfg.perCapitaScale) {
        const dpop = Number(d.population) || 0;
        const totalBase = children.reduce((s, c) => s + (baseMap.get(norm(c.name)) || 0), 0);
        raw = dpop > 0 ? (totalBase / dpop) * cfg.perCapitaScale : null;
      } else {
        let sw = 0, s = 0;
        for (const c of children) {
          const base = baseMap.get(norm(c.name));
          const pop = Number(c.population) || 1;
          if (base != null) { s += base * pop; sw += pop; }
        }
        raw = sw > 0 ? s / sw : null;
      }
      distEntries.push({ key: normCode(d.code), raw });
    }
    const distScores = normalizeScores(distEntries, cfg.indicator.direction);

    // --- Accumulate changes into working copies (no persist yet) ---
    let matched = 0;
    const makeInd = (raw: number) => ({
      indicator_name: cfg.indicator.name, category_key: cfg.indicator.category_key,
      raw_value: Math.round(raw * 100) / 100, normalized_score: null as any, year: cfg.indicator.year,
      last_updated: cfg.indicator.last_updated, source: cfg.indicator.source,
      direction: cfg.indicator.direction, unit: cfg.indicator.unit, external: cfg.indicator.external,
    });

    for (const b of barris) {
      const key = norm(b.name);
      const score = barriScores[key];
      if (score == null) continue;
      matched++;
      const ind = { ...makeInd(barriEntries.find(e => e.key === key)!.raw!), normalized_score: score };
      b._ind = mergeIndicator(b._ind, ind);
      b._cs = recomputeCategoryScore(b._cs, b._ind, cfg.indicator.category_key);
      b._changed = true;
    }
    let distMatched = 0;
    for (const d of districts) {
      const key = normCode(d.code);
      const score = distScores[key];
      if (score == null) continue;
      distMatched++;
      const ind = { ...makeInd(distEntries.find(e => e.key === key)!.raw!), normalized_score: score };
      d._ind = mergeIndicator(d._ind, ind);
      d._cs = recomputeCategoryScore(d._cs, d._ind, cfg.indicator.category_key);
      d._changed = true;
    }

    const sampleBarri = barris.find(b => barriScores[norm(b.name)] != null);
    summary.push({
      indicator: cfg.indicator.name, category: cfg.indicator.category_key, file: file.name,
      barrisMatched: matched, districts: distMatched,
      barriRawRange: range(barriEntries.map(e => e.raw)),
      sample: sampleBarri ? { name: sampleBarri.name, raw: barriEntries.find(e => e.key === norm(sampleBarri.name))!.raw, score: barriScores[norm(sampleBarri.name)] } : null,
    });
  }

  // --- Persist once (accumulated) ---
  const barriUpdates = barris.filter(b => b._changed).map(b => ({ id: b.id, indicators: b._ind, category_scores: b._cs }));
  const distUpdates = districts.filter(d => d._changed).map(d => ({ id: d.id, indicators: d._ind, category_scores: d._cs }));
  if (barriUpdates.length) await base44.asServiceRole.entities.Barri.bulkUpdate(barriUpdates);
  if (distUpdates.length) await base44.asServiceRole.entities.District.bulkUpdate(distUpdates);

  return Response.json({ folderId, mode: "import", indicators: summary, persisted: { barris: barriUpdates.length, districts: distUpdates.length } });
}

function range(vals: (number | null)[]): { min: number | null; max: number | null } {
  const v = vals.filter(x => x != null && !isNaN(x as number)) as number[];
  if (!v.length) return { min: null, max: null };
  return { min: Math.round(Math.min(...v) * 100) / 100, max: Math.round(Math.max(...v) * 100) / 100 };
}