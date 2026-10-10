import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useDistricts, useBarris } from "@/lib/useAreas";
import { useActiveAudience } from "@/lib/useActiveAudience";
import { CATEGORY_MAP, INDICATORS, categoriesForMode, indicatorsForMode } from "@/lib/categories";
import { categoryScoresFromArea, scoreColor } from "@/lib/scoring";
import CategoryIcon from "@/components/CategoryIcon";
import ScoreBadge from "@/components/ScoreBadge";
import { BarChart3, Map as MapIcon, Database, Layers, ChevronRight } from "lucide-react";
import ComparisonMatrix from "@/components/insights/ComparisonMatrix";
import AreaRadar from "@/components/insights/AreaRadar";
import FreshnessTimeline from "@/components/insights/FreshnessTimeline";

function avgByCategory(areas, cats) {
  const sums = {};
  const counts = {};
  areas.forEach((a) => {
    const cs = categoryScoresFromArea(a);
    cats.forEach((c) => {
      if (cs[c.key] != null) {
        sums[c.key] = (sums[c.key] || 0) + cs[c.key];
        counts[c.key] = (counts[c.key] || 0) + 1;
      }
    });
  });
  return cats.map((c) => ({
    key: c.key,
    name: c.name,
    avg: counts[c.key] ? +(sums[c.key] / counts[c.key]).toFixed(1) : null
  })).filter((x) => x.avg != null);
}

export default function DataInsights() {
  const districts = useDistricts();
  const barris = useBarris();
  const loading = districts.isLoading || barris.isLoading;
  const { audience } = useActiveAudience();
  const cats = categoriesForMode(audience);
  const inds = indicatorsForMode(audience);

  const distAvg = useMemo(() => avgByCategory(districts.data || [], cats).sort((a, b) => b.avg - a.avg), [districts.data, cats]);
  const barriAvg = useMemo(() => avgByCategory(barris.data || [], cats).sort((a, b) => b.avg - a.avg), [barris.data, cats]);

  const leaderboard = useMemo(() => {
    return (districts.data || [])
      .map((a) => {
        const cs = categoryScoresFromArea(a);
        const vals = Object.entries(cs).filter(([, v]) => v != null).map(([k, v]) => ({ k, v }));
        const avg = vals.length ? vals.reduce((s, x) => s + x.v, 0) / vals.length : 0;
        const top = vals.sort((x, y) => y.v - x.v)[0];
        return { id: a.id, name: a.name, avg: +avg.toFixed(1), topKey: top?.k, topScore: top?.v };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [districts.data]);

  const citywideTop = distAvg.slice(0, 3);
  const citywideBottom = distAvg.slice(-3).reverse();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Data Insights</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">A high-level snapshot of Barcelona's neighbourhoods from Open Data BCN.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat icon={Layers} label="Districts" value={(districts.data || []).length} />
        <Stat icon={MapIcon} label="Barris" value={(barris.data || []).length} />
        <Stat icon={Database} label="Indicators" value={inds.length} />
        <Stat icon={BarChart3} label="Categories" value={cats.length} />
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">Loading city data…</div>
      ) : (
        <>
          <div className="rounded-xl border bg-card p-4 mb-4">
            <h2 className="text-sm font-medium mb-1">Top-performing categories (district average)</h2>
            <p className="text-xs text-muted-foreground mb-3">Average 1–10 score across all 10 districts. {barriAvg.length > 0 && `Across barris, the strongest category is ${barriAvg[0].name}.`}</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distAvg} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} formatter={(v) => [v, "Avg score"]} />
                  <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                    {distAvg.map((d) => (
                      <Cell key={d.key} fill={scoreColor(d.avg)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-medium mb-2">Strongest citywide</h3>
              <div className="space-y-2">
                {citywideTop.map((d) => (
                  <div key={d.key} className="flex items-center gap-2 text-sm">
                    <CategoryIcon categoryKey={d.key} className="h-4 w-4" />
                    <span className="flex-1">{d.name}</span>
                    <ScoreBadge score={d.avg} size="sm" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-medium mb-2">Weakest citywide</h3>
              <div className="space-y-2">
                {citywideBottom.map((d) => (
                  <div key={d.key} className="flex items-center gap-2 text-sm">
                    <CategoryIcon categoryKey={d.key} className="h-4 w-4" />
                    <span className="flex-1">{d.name}</span>
                    <ScoreBadge score={d.avg} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-sm font-medium">District leaderboard</h2>
              <span className="text-xs text-muted-foreground">By overall average score</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">District</th>
                  <th className="p-3 font-medium">Avg</th>
                  <th className="p-3 font-medium">Top category</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((d, i) => (
                  <tr key={d.id} className="border-t last:border-0">
                    <td className="p-3 text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-medium">{d.name}</td>
                    <td className="p-3"><ScoreBadge score={d.avg} size="sm" /></td>
                    <td className="p-3">
                      {d.topKey && (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <CategoryIcon categoryKey={d.topKey} className="h-3.5 w-3.5" />
                          {CATEGORY_MAP[d.topKey]?.name}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Link to={`/area/district/${d.id}`} className="text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4 inline" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid lg:grid-cols-2 gap-3 mt-4">
            <AreaRadar areas={districts.data || []} cats={cats} />
            <FreshnessTimeline indicators={inds} cats={cats} />
          </div>

          <div className="mt-4">
            <ComparisonMatrix areas={districts.data || []} cats={cats} level="district" />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value ?? "—"}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}