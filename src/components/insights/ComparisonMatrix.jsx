import { useMemo } from "react";
import { Link } from "react-router-dom";
import { categoryScoresFromArea, scoreColor } from "@/lib/scoring";
import CategoryIcon from "@/components/CategoryIcon";
import { ChevronRight } from "lucide-react";

// Areas (rows) x categories (columns) heatmap. Color-coded 1-10 cells reveal
// strengths and tradeoffs across the whole city at a glance.
export default function ComparisonMatrix({ areas, cats, level = "district" }) {
  const rows = useMemo(() => {
    return areas
      .map((a) => {
        const cs = categoryScoresFromArea(a);
        const scores = cats.map((c) => cs[c.key]);
        const present = scores.filter((v) => v != null);
        const avg = present.length ? +(present.reduce((s, v) => s + v, 0) / present.length).toFixed(1) : null;
        return { id: a.id, name: a.name, scores, avg };
      })
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  }, [areas, cats]);

  function Cell({ v }) {
    if (v == null) return <span className="text-muted-foreground/40">·</span>;
    return (
      <span
        className="inline-flex h-7 w-9 items-center justify-center rounded text-xs font-semibold text-white"
        style={{ backgroundColor: scoreColor(v) }}
      >
        {v.toFixed(1)}
      </span>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-sm font-medium">Area comparison matrix</h2>
        <p className="text-xs text-muted-foreground">Color-coded category scores for every {level} — strong green, weak red.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="sticky left-0 z-10 bg-muted/50 p-3 font-medium">Area</th>
              {cats.map((c) => (
                <th key={c.key} className="p-3 font-medium text-center" title={c.name}>
                  <span className="inline-flex"><CategoryIcon categoryKey={c.key} className="h-4 w-4" /></span>
                </th>
              ))}
              <th className="p-3 font-medium text-center">Avg</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t last:border-0 hover:bg-muted/30">
                <td className="sticky left-0 z-10 bg-card p-3 font-medium whitespace-nowrap">{r.name}</td>
                {r.scores.map((v, i) => (
                  <td key={i} className="p-1.5 text-center">
                    <Cell v={v} />
                  </td>
                ))}
                <td className="p-3 text-center">
                  {r.avg != null ? <Cell v={r.avg} /> : "—"}
                </td>
                <td className="p-3 text-right">
                  <Link to={`/area/${level}/${r.id}`} className="text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4 inline" /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}