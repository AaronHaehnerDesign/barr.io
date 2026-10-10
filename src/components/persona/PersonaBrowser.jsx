import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDistricts, useBarris } from "@/lib/useAreas";
import { CATEGORY_MAP, PERSONA_FLIPS, categoriesForMode } from "@/lib/categories";
import { PERSONA_LIBRARY, personaWeights } from "@/lib/personas";
import { categoryScoresFromArea, matchScore, areaSummary, scoreColor } from "@/lib/scoring";
import ScoreBadge from "@/components/ScoreBadge";
import CategoryIcon from "@/components/CategoryIcon";
import { Briefcase, Coffee, Baby, HeartPulse, Plane, Wallet, Users, ChevronRight, Layers, GraduationCap, Laptop, Palette, ShoppingBag, UtensilsCrossed, Building2, Truck, Stethoscope } from "lucide-react";
import { useActiveAudience } from "@/lib/useActiveAudience";

const ICONS = { Briefcase, Coffee, Baby, HeartPulse, Plane, Wallet, Users, GraduationCap, Laptop, Palette, ShoppingBag, UtensilsCrossed, Building2, Truck, Stethoscope };

function rankFor(persona, areas, type) {
  const w = personaWeights(persona);
  const flip = PERSONA_FLIPS[persona.name] || {};
  return areas
    .map((a) => {
      const base = categoryScoresFromArea(a);
      const cs = {};
      categoriesForMode(persona.audience).forEach((c) => {
        let s = base[c.key];
        if (s == null) { cs[c.key] = null; return; }
        if (flip[c.key] === "negative") s = 11 - s;
        cs[c.key] = Math.max(1, Math.min(10, Math.round(s * 10) / 10));
      });
      return { ...a, _type: type, _scores: cs, match_score: matchScore(cs, w) };
    })
    .sort((a, b) => b.match_score - a.match_score);
}

export default function PersonaBrowser() {
  const districts = useDistricts();
  const barris = useBarris();
  const { audience } = useActiveAudience();
  const library = useMemo(
    () => PERSONA_LIBRARY.filter((p) => p.audience === audience),
    [audience]
  );
  const [selectedName, setSelectedName] = useState(null);
  const [level, setLevel] = useState("district");

  const selected = library.find((p) => p.name === selectedName) || library[0];

  const ranked = useMemo(() => {
    if (!selected) return [];
    const data = level === "district" ? districts.data : barris.data;
    if (!data) return [];
    return rankFor(selected, data, level).slice(0, 8);
  }, [selected, level, districts.data, barris.data]);

  const loading = level === "district" ? districts.isLoading : barris.isLoading;

  if (!selected) {
    return <div className="py-10 text-center text-muted-foreground">Loading personas…</div>;
  }

  const topPriorities = [...selected.priorities].sort((a, b) => b.weight - a.weight).slice(0, 5);

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">Browse pre-configured profiles and see how the app ranks Barcelona's neighbourhoods for each.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-5">
        {library.map((p) => {
          const Icon = ICONS[p.icon] || Users;
          const active = selected.name === p.name;
          return (
            <button
              key={p.name}
              onClick={() => setSelectedName(p.name)}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${active ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:bg-muted"}`}
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted"><Icon className="h-4 w-4" /></span>
              <span className="text-sm font-medium leading-tight">{p.name}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-semibold">{selected.name}</h2>
          <span className="ml-auto inline-flex rounded-lg border p-0.5 bg-muted">
            <button onClick={() => setLevel("district")} className={`px-3 py-1 text-xs rounded-md ${level === "district" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}><Layers className="inline h-3.5 w-3.5 mr-1" />Districts</button>
            <button onClick={() => setLevel("barri")} className={`px-3 py-1 text-xs rounded-md ${level === "barri" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Barris</button>
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{selected.description}</p>
        <p className="text-xs font-medium text-muted-foreground mb-2">Top priorities</p>
        <div className="flex flex-wrap gap-1.5">
          {topPriorities.map((p) => (
            <span key={p.category_key} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
              <CategoryIcon categoryKey={p.category_key} className="h-3 w-3" />
              {CATEGORY_MAP[p.category_key]?.name}
              <span className="text-muted-foreground">· {p.weight}</span>
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">Ranking neighbourhoods…</div>
      ) : (
        <div className="space-y-3">
          {ranked.map((a, i) => (
            <div key={a.id} className={`rounded-xl border bg-card p-4 shadow-sm ${i < 3 ? "ring-1 ring-emerald-200" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: scoreColor((a.match_score / 10) + 1) }}>
                  <span className="text-lg font-bold leading-none">{a.match_score}</span>
                  <span className="text-[9px] opacity-90">%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {i < 3 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">TOP {i + 1}</span>}
                    <h3 className="font-semibold truncate">{a.name}</h3>
                    {level === "barri" && <span className="text-xs text-muted-foreground">{a.district_name}</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{areaSummary(a._scores)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {topPriorities.slice(0, 4).map((p) => (
                      <span key={p.category_key} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px]">
                        <CategoryIcon categoryKey={p.category_key} className="h-3 w-3" />
                        <ScoreBadge score={a._scores[p.category_key]} size="sm" caption={CATEGORY_MAP[p.category_key]?.name} />
                      </span>
                    ))}
                  </div>
                </div>
                <Link to={`/area/${a._type}/${a.id}`} className="self-center text-muted-foreground hover:text-foreground"><ChevronRight className="h-5 w-5" /></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}