import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database, CheckCircle2, AlertTriangle, Loader2, Lock } from "lucide-react";

// Friendly labels + order for the 10 Open Data BCN datasets refreshed by the backend function.
const DATASETS = [
  { code: "20170706-districtes-barris", label: "District & barri boundaries", category: "boundaries" },
  { code: "transports", label: "Public transport stops", category: "transport" },
  { code: "sanitat-hospitals-atencio-primaria", label: "Health facilities", category: "healthcare" },
  { code: "educacio-ensenyament-reglat", label: "Schools & education", category: "education" },
  { code: "cens-locals-planta-baixa-act-economica", label: "Ground-floor establishments", category: "dailylife" },
  { code: "renda-disponible-llars-bcn", label: "Household disposable income", category: "income" },
  { code: "esm-bcn-evo", label: "Mobility survey index", category: "transport" },
  { code: "iris", label: "Income index (IRIS)", category: "income" },
  { code: "tramer-mapa-estrategic-soroll", label: "Strategic noise map", category: "environment" },
  { code: "habitatges-us-turistic", label: "Tourist-use housing", category: "tourism" }
];

function StatusBadge({ status }) {
  if (status === "success") return <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> OK</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1 text-red-600"><AlertTriangle className="h-3.5 w-3.5" /> Error</span>;
  if (status === "running") return <span className="inline-flex items-center gap-1 text-amber-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running</span>;
  return <span className="text-muted-foreground">—</span>;
}

function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function Admin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(null); // dataset code currently refreshing, or "all"

  const status = useQuery({
    queryKey: ["dataSyncStatus"],
    queryFn: async () => {
      const { items } = await base44.entities.DataSyncStatus.filter({}, { sort: "-finished_at", limit: 50 });
      return items;
    },
    refetchInterval: busy ? 4000 : false
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-lg font-semibold">Admins only</h1>
        <p className="text-sm text-muted-foreground mt-1">You need an admin role to refresh Open Data BCN data.</p>
      </div>
    );
  }

  const byCode = Object.fromEntries((status.data || []).map((s) => [s.dataset_code, s]));

  async function refresh(code) {
    setBusy(code);
    try {
      const res = await base44.functions.invoke("refreshOpenDataBcn", code ? { datasets: [code] } : {});
      const results = res?.data?.results || [];
      const failed = results.filter((r) => r.status === "error");
      if (failed.length) throw new Error(failed.map((r) => `${r.dataset_code}: ${r.error}`).join("\n"));
    } catch (e) {
      alert("Refresh failed: " + (e.message || e));
    } finally {
      setBusy(null);
      qc.invalidateQueries({ queryKey: ["dataSyncStatus"] });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2"><Database className="h-5 w-5" /> Open Data BCN</h1>
          <p className="text-sm text-muted-foreground">Refresh neighbourhood indicators from Barcelona's open data portal.</p>
        </div>
        <Button onClick={() => refresh(null)} disabled={!!busy}>
          {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh all
        </Button>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Dataset</th>
              <th className="text-left font-medium px-3 py-2.5 hidden sm:table-cell">Status</th>
              <th className="text-left font-medium px-3 py-2.5 hidden sm:table-cell">Last updated</th>
              <th className="text-right font-medium px-3 py-2.5">Records</th>
              <th className="text-right font-medium px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {DATASETS.map((d) => {
              const s = byCode[d.code];
              const isBusy = busy === d.code || (busy === "all" && s?.status === "running");
              return (
                <tr key={d.code} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{d.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">{d.code}</div>
                    {s?.error_message && <div className="text-xs text-red-600 mt-1 max-w-md truncate">{s.error_message}</div>}
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell"><StatusBadge status={s?.status} /></td>
                  <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground">{s ? fmt(s.resource_last_modified || s.finished_at) : "never"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{s?.records_written ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => refresh(d.code)}>
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {status.isLoading && <p className="text-sm text-muted-foreground mt-3">Loading status…</p>}
      <p className="text-xs text-muted-foreground mt-3">Counts are per barri and per district, normalised to a 1–10 score. Rows are assigned to barris by their barri code, or by point-in-polygon on the boundary when no code is present.</p>
    </div>
  );
}