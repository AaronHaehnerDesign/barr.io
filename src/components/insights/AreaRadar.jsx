import { useMemo, useState } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { categoryScoresFromArea } from "@/lib/scoring";

const PALETTE = ["#0f172a", "#059669", "#dc463c"];

function avg(a, cats) {
  const cs = categoryScoresFromArea(a);
  const v = cats.map((c) => cs[c.key]).filter((x) => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
}

// Overlay up to three areas' category profiles on a radar, so their shapes are
// directly comparable: a wider shape means a stronger overall profile.
export default function AreaRadar({ areas, cats }) {
  const [selected, setSelected] = useState(() =>
    [...areas].sort((a, b) => avg(b, cats) - avg(a, cats)).slice(0, 3).map((a) => a.id)
  );

  const data = useMemo(() => {
    return cats.map((c) => {
      const row = { category: c.name };
      selected.forEach((id) => {
        const a = areas.find((x) => x.id === id);
        if (a) row[id] = categoryScoresFromArea(a)[c.key] ?? null;
      });
      return row;
    });
  }, [cats, selected, areas]);

  function toggle(id) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 3) return [...cur.slice(1), id];
      return [...cur, id];
    });
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-medium">Neighborhood profile radar</h2>
        <span className="text-xs text-muted-foreground">Pick up to 3 to compare</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3 max-h-24 overflow-y-auto">
        {areas.map((a) => {
          const idx = selected.indexOf(a.id);
          const on = idx >= 0;
          return (
            <button
              key={a.id}
              onClick={() => toggle(a.id)}
              className={`rounded-full px-2.5 py-1 text-xs border ${on ? "text-white" : "bg-background hover:bg-muted"}`}
              style={on ? { backgroundColor: PALETTE[idx], borderColor: PALETTE[idx] } : undefined}
            >
              {a.name}
            </button>
          );
        })}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
            {selected.map((id, i) => {
              const a = areas.find((x) => x.id === id);
              return <Radar key={id} name={a?.name} dataKey={id} stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.12} strokeWidth={2} />;
            })}
            <Tooltip />
            {selected.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}