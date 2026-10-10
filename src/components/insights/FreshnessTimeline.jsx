import { useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { isStale } from "@/lib/scoring";
import CategoryIcon from "@/components/CategoryIcon";
import { AlertTriangle } from "lucide-react";

const FRESH = "#28aa50";
const STALE = "#f5d23c";
const EXTERNAL = "#64748b";

// Each indicator is a dot placed by its latest data year. Older data points
// are amber, external (coming-soon) sources are grey — showing where the data
// behind the scores is current and where it needs caution.
export default function FreshnessTimeline({ indicators, cats }) {
  const data = useMemo(() => {
    return indicators.map((ind, i) => {
      const d = new Date(ind.last_updated);
      const year = d.getFullYear() + (d.getMonth() + 1) / 12;
      const catOrder = cats.findIndex((c) => c.key === ind.category_key);
      const status = ind.external ? "external" : isStale(ind.last_updated) ? "stale" : "fresh";
      return { ind, year, catOrder: catOrder >= 0 ? catOrder : i, status };
    });
  }, [indicators, cats]);

  const years = data.map((d) => d.year);
  const minYear = Math.floor(Math.min(...years));
  const maxYear = Math.ceil(Math.max(...years));
  const stale = data.filter((d) => d.status === "stale");
  const external = data.filter((d) => d.status === "external");
  const colorFor = (s) => (s === "fresh" ? FRESH : s === "stale" ? STALE : EXTERNAL);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-medium">Indicator data freshness</h2>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: FRESH }} />Fresh</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: STALE }} />&gt;3 yrs</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: EXTERNAL }} />External</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Each dot is one indicator, placed by its latest data year.</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 4, right: 16, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis type="number" dataKey="year" domain={[minYear - 0.5, maxYear + 0.5]} tick={{ fontSize: 11 }} name="Year" />
            <YAxis type="number" dataKey="catOrder" domain={[-0.5, Math.max(...data.map((d) => d.catOrder)) + 0.5]} hide />
            <ZAxis range={[70, 70]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-md border bg-background p-2 text-xs shadow">
                    <div className="font-medium">{d.ind.name}</div>
                    <div className="text-muted-foreground">{d.ind.source_dataset} · {new Date(d.ind.last_updated).toLocaleDateString()}</div>
                    <div className="text-muted-foreground">{d.status === "stale" ? "Stale (>3 yrs)" : d.status === "external" ? "External source" : "Fresh"}</div>
                  </div>
                );
              }}
            />
            <Scatter data={data}>
              {data.map((d, i) => <Cell key={i} fill={colorFor(d.status)} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span>{data.filter((d) => d.status === "fresh").length} fresh</span>
        <span className="text-amber-700">{stale.length} stale</span>
        <span>{external.length} external</span>
      </div>
      {stale.length > 0 && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800 mb-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {stale.length} indicator(s) use data older than 3 years
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stale.map((d) => (
              <span key={d.ind.name} className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">
                <CategoryIcon categoryKey={d.ind.category_key} className="h-3 w-3" /> {d.ind.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}