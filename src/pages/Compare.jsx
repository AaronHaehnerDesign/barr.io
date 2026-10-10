import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { useDistricts, useBarris } from "@/lib/useAreas";
import { useProfile } from "@/lib/useProfile";
import { CATEGORIES, CATEGORY_MAP, INDICATORS, PERSONA_FLIPS, categoriesForMode, indicatorsForMode } from "@/lib/categories";
import { categoryScoresFromArea, matchScore } from "@/lib/scoring";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import ScoreBadge from "@/components/ScoreBadge";
import CategoryIcon from "@/components/CategoryIcon";
import { Plus, X, Save, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function readingFor(score) {
  if (score == null) return "—";
  if (score >= 8) return "High";
  if (score >= 6) return "Good";
  if (score >= 4.5) return "Average";
  if (score >= 2.5) return "Low";
  return "Very low";
}

export default function Compare() {
  const districts = useDistricts();
  const barris = useBarris();
  const { data: profile } = useProfile();
  const aud = profile?.audience || "b2c";
  const cats = categoriesForMode(aud);
  const inds = indicatorsForMode(aud);
  const qc = useQueryClient();
  const [type, setType] = useState("district");
  const [selected, setSelected] = useState([]); // ids
  const [picker, setPicker] = useState(false);
  const [cat, setCat] = useState("all"); // active category tab
  const preselectRef = useRef(null);
  const manualRef = useRef(false); // true once the user picks areas by hand

  // Restore a saved comparison from the URL (?type=&ids=) on first load, so the
  // Saved Comparisons page can jump straight back into a past research set.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get("ids");
    const typeParam = params.get("type");
    if (!idsParam) return;
    manualRef.current = true;
    if (typeParam) {
      setType(typeParam);
      preselectRef.current = typeParam;
    }
    setSelected(idsParam.split(",").filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const palette = ["#0ea5e9", "#f59e0b", "#a855f7"];

  // Preselect the user's top recommended area. Re-runs when priorities/profile
  // change, so the recommendation always reflects the latest preferences —
  // unless the user has manually chosen areas for the current level.
  useEffect(() => {
    if (manualRef.current) return;
    if (preselectRef.current === type) return;
    const data = type === "district" ? districts.data : barris.data;
    if (!data || !data.length) return;
    const pri = profile?.priorities;
    if (!pri || !pri.length) return;
    const w = {};
    pri.forEach((p) => (w[p.category_key] = p.weight));
    const flip = (profile?.persona && PERSONA_FLIPS[profile.persona]) || {};
    const scored = data
      .map((a) => {
        const base = categoryScoresFromArea(a);
        const cs = {};
        CATEGORIES.forEach((c) => {
          let s = base[c.key];
          if (s == null) { cs[c.key] = null; return; }
          if (flip[c.key] === "negative") s = 11 - s;
          cs[c.key] = Math.max(1, Math.min(10, Math.round(s * 10) / 10));
        });
        return { id: a.id, ms: matchScore(cs, w) };
      })
      .sort((a, b) => b.ms - a.ms);
    if (scored[0]) {
      setSelected([scored[0].id]);
      preselectRef.current = type;
    }
  }, [type, districts.data, barris.data, profile]);

  const areas = type === "district" ? (districts.data || []).map(a => ({ ...a, _type: "district" })) : (barris.data || []).map(a => ({ ...a, _type: "barri" }));
  const chosen = selected.map(id => areas.find(a => a.id === id)).filter(Boolean);

  const radarData = useMemo(() => cats.map(c => {
    const row = { category: c.name };
    chosen.forEach(a => { const cs = categoryScoresFromArea(a); row[a.name] = cs[c.key] ?? 0; });
    return row;
  }), [chosen]);

  // Tab order: the user's highest-weighted categories first, then the rest.
  const tabKeys = useMemo(() => {
    const priKeys = (profile?.priorities || [])
      .slice().sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .map((p) => p.category_key)
      .filter((k) => CATEGORY_MAP[k]);
    const otherKeys = cats.filter((c) => !priKeys.includes(c.key)).sort((a, b) => a.order - b.order).map((c) => c.key);
    return ["all", ...priKeys, ...otherKeys];
  }, [profile]);

  const focusedIndicators = useMemo(
    () => (cat === "all" ? inds : inds.filter((ind) => ind.category_key === cat)),
    [cat, inds]
  );

  const focusedScores = useMemo(() => {
    if (cat === "all") return null;
    return chosen.map((a, i) => ({ name: a.name, color: palette[i], score: categoryScoresFromArea(a)[cat] ?? null }));
  }, [cat, chosen]);

  function toggle(id) {
    manualRef.current = true;
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 3 ? [...s, id] : s);
  }

  function switchType(t) {
    manualRef.current = false;
    preselectRef.current = null;
    setType(t);
    setSelected([]);
  }

  const [saveMsg, setSaveMsg] = useState(false);
  async function saveComparison() {
    if (chosen.length < 2) return;
    await base44.entities.SavedComparison.create({
      area_ids: chosen.map(a => a.id),
      area_type: type,
      label: chosen.map(a => a.name).join(" vs ")
    });
    qc.invalidateQueries({ queryKey: ["savedComparisons"] });
    setSaveMsg(true);
    setTimeout(() => setSaveMsg(false), 2000);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-lg font-semibold">Compare areas</h1>
        <div className="ml-auto inline-flex rounded-lg border p-0.5 bg-muted">
          <button onClick={() => switchType("district")} className={`px-3 py-1 text-xs rounded-md ${type === "district" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Districts</button>
          <button onClick={() => switchType("barri")} className={`px-3 py-1 text-xs rounded-md ${type === "barri" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Barris</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {chosen.map((a, i) => (
          <div key={a.id} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: palette[i] }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[i] }} />
            <span className="text-sm font-medium">{a.name}</span>
            <button onClick={() => toggle(a.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        {chosen.length < 3 && (
          <button onClick={() => setPicker(v => !v)} className="inline-flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
            <Plus className="h-4 w-4" /> Add
          </button>
        )}
        {chosen.length >= 2 && (
          <Button size="sm" variant="outline" onClick={saveComparison} className="ml-auto"><Save className="h-3.5 w-3.5" /> Save comparison</Button>
        )}
        {saveMsg && <span className="text-xs text-emerald-600">Saved!</span>}
      </div>

      {picker && (
        <div className="rounded-xl border bg-card p-2 mb-4 max-h-56 overflow-y-auto">
          {areas.filter(a => !selected.includes(a.id)).map(a => (
            <button key={a.id} onClick={() => { toggle(a.id); setPicker(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-muted">
              <span className="font-medium">{a.name}</span>
              {type === "barri" && <span className="text-xs text-muted-foreground">{a.district_name}</span>}
            </button>
          ))}
        </div>
      )}

      {chosen.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">Pick 2 or 3 {type === "district" ? "districts" : "barris"} to compare side by side.</p>
      ) : (
        <>
          {/* category tabs: separate by main category; ordered by your priority */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tabKeys.map((k) => {
              const active = cat === k;
              const label = k === "all" ? "All" : CATEGORY_MAP[k].name;
              return (
                <button key={k} onClick={() => setCat(k)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${active ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`}>
                  {k !== "all" && <CategoryIcon categoryKey={k} className="h-3 w-3" />}
                  {label}
                </button>
              );
            })}
          </div>

          {/* category scores */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              {cat === "all" ? "Category scores (1–10)" : `${CATEGORY_MAP[cat].name} score (1–10)`}
            </h2>
            {cat === "all" ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={false} />
                    {chosen.map((a, i) => (
                      <Radar key={a.id} name={a.name} dataKey={a.name} stroke={palette[i]} fill={palette[i]} fillOpacity={0.15} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="space-y-3">
                {focusedScores.map((s) => (
                  <div key={s.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                      <ScoreBadge score={s.score} size="sm" />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${((s.score || 0) / 10) * 100}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* indicators table, filtered by the active category tab */}
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Indicator</th>
                  {chosen.map(a => <th key={a.id} className="text-center p-3 font-medium">{a.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {focusedIndicators.map(ind => (
                  <tr key={ind.name} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <CategoryIcon categoryKey={ind.category_key} className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{ind.name}</span>
                      </div>
                      <span className="ml-5.5 text-[11px] leading-snug text-muted-foreground">{ind.description}{ind.external ? "" : ""}</span>
                    </td>
                    {chosen.map(a => {
                      const iv = (a.indicators || []).find(x => x.indicator_name === ind.name);
                      return (
                        <td key={a.id} className="p-3 text-center">
                          {iv ? (
                            <div className="flex flex-col items-center gap-1">
                              <ScoreBadge score={iv.external ? null : iv.normalized_score} size="sm" />
                              <span className="text-[11px] text-muted-foreground">{iv.external ? "coming soon" : readingFor(iv.normalized_score)}</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {focusedIndicators.length === 0 && (
                  <tr><td className="p-4 text-center text-sm text-muted-foreground" colSpan={chosen.length + 1}>No indicators for this category yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {chosen.map(a => (
              <Button key={a.id} variant="ghost" size="sm" asChild>
                <Link to={`/area/${a._type}/${a.id}`}>View {a.name} <ChevronRight className="h-3.5 w-3.5" /></Link>
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}