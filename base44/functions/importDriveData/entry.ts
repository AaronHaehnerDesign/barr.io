// BarrioMatch — Google Drive data import pipeline.
//
// This folder (shared by the builder) holds raw Open Data BCN exports named
// `<indicator_key>__<source-file>.csv|.xlsx`. The importer reads the folder via
// the authorized shared Google Drive connector, then turns each file into
// normalized indicator rows stored on the District/Barri `indicators` arrays.
//
// MODE = "preview" (default): lists the folder and returns each file's headers +
// sample rows so the per-indicator mapping can be designed against real schemas.
// MODE = "import": (added next) downloads, aggregates and upserts indicator rows.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import * as XLSX from 'npm:xlsx@0.18.5';

const DEFAULT_FOLDER_ID = "125NPW7IkYVfKMrUg3RQYhbzWR49524Pu";
const SMALL = 2 * 1024 * 1024; // files <= 2MB are downloaded in full
const PREVIEW_BYTES = 12000;   // first bytes used to preview large files

// Minimal RFC-4180-ish CSV parser (handles quotes / escaped quotes / commas).
function parseCsv(text: string): string[][] {
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
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === '\r') { /* ignore CR */ }
      else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v !== ""));
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

    // --- List the folder (paginated) ---
    let pageToken: string | undefined = undefined;
    const allFiles: any[] = [];
    do {
      const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
      const fields = "nextPageToken,files(id,name,mimeType,size)";
      const listUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=200${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const listRes = await fetch(listUrl, { headers: auth, signal: AbortSignal.timeout(15000) });
      if (!listRes.ok) {
        const t = await listRes.text();
        return Response.json({ error: "drive list failed " + listRes.status, detail: t.slice(0, 300) }, { status: 502 });
      }
      const listJson = await listRes.json();
      allFiles.push(...(listJson.files || []));
      pageToken = listJson.nextPageToken || undefined;
    } while (pageToken);

    if (mode === "import") {
      return Response.json({ error: "import mode not implemented yet — use preview first" }, { status: 501 });
    }

    // --- PREVIEW: headers + sample rows per file ---
    const out: any[] = [];
    const processFile = async (f: any) => {
      const entry: any = { name: f.name, id: f.id, mimeType: f.mimeType, size: Number(f.size || 0) };
      try {
        const isCsv = f.mimeType === "text/csv" || /\.csv$/i.test(f.name);
        const isXlsx = /\.xlsx$/i.test(f.name);
        const isXls = /\.xls$/i.test(f.name);
        const preferRange = entry.size > SMALL;
        const headers: Record<string, string> = { ...auth };
        if (preferRange) headers["Range"] = `bytes=0-${PREVIEW_BYTES}`;
        const r = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
          { headers, signal: AbortSignal.timeout(preferRange ? 15000 : 30000) },
        );
        if (!r.ok && r.status !== 206) {
          entry.error = "download " + r.status;
          return entry;
        }
        let buf = await r.arrayBuffer();
        // If Drive ignored Range and streamed the whole large file, keep only the head.
        if (preferRange && r.status === 200) buf = buf.slice(0, PREVIEW_BYTES);

        if (isCsv) {
          const text = new TextDecoder("utf-8").decode(buf);
          const rows = parseCsv(text);
          entry.headers = (rows[0] || []);
          entry.sampleRows = rows.slice(1, 4);
          entry.parseNote = preferRange ? "preview (first bytes)" : "full";
        } else if (isXlsx || isXls) {
          const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
          entry.sheetNames = wb.SheetNames;
          entry.headers = (rows[0] || []);
          entry.sampleRows = rows.slice(1, 4).map((r2: any) => r2.map(String));
          entry.parseNote = "full";
        } else {
          // geojson/gpkg/json — just expose the raw head for now.
          entry.head = new TextDecoder("utf-8").decode(buf.slice(0, 300));
          entry.parseNote = "binary/text head only";
        }
      } catch (e: any) {
        entry.error = e?.message || String(e);
      }
      return entry;
    };

    // Download in batches of 6 (Worker holds ~6 connections).
    for (let i = 0; i < allFiles.length; i += 6) {
      const batch = allFiles.slice(i, i + 6);
      const settled = await Promise.allSettled(batch.map(processFile));
      for (let j = 0; j < settled.length; j++) {
        const s = settled[j];
        if (s.status === "fulfilled") out.push(s.value);
        else out.push({ name: batch[j].name, id: batch[j].id, error: String(s.reason?.message || s.reason) });
      }
    }

    return Response.json({ folderId, mode, fileCount: allFiles.length, files: out });
  } catch (error: any) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}