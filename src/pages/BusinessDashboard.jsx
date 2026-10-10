import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useProfile } from "@/lib/useProfile";
import { useDistricts, useBarris } from "@/lib/useAreas";
import { CATEGORY_MAP, PERSONA_FLIPS, categoriesForMode } from "@/lib/categories";
import { categoryScoresFromArea, matchScore, scoreColor, areaSummary } from "@/lib/scoring";
import { areaIntro } from "@/lib/areaIntro";
import CategoryIcon from "@/components/CategoryIcon";
import ScoreBadge from "@/components/ScoreBadge";
import { Button } from "@/components/ui/button";
import { Building2, Sparkles, ArrowRight, ChevronRight, ShoppingBag, Truck } from "lucide-react";

const COMMERCE_INDICATORS = ["Ground-floor shops & businesses", "Terraces & bars", "Municipal markets"];
const OPERATIONS_INDICATORS = ["Metro / FGC / Renfe stations", "Bus stops", "Bike lanes", "EV chargers", "Underground car parks"];

function useRanked(audience, priorities, persona, data) {
  return useMemo(() => {
    if (!data) return [];
    const w = {};
    (priorities || []).forEach((p) => (w[p.category_key] = p.weight));
    const flip = (persona && PERSONA_FLIPS[persona]) || {};
    const cats = categoriesForMode(audience || "b2b");
    return data
      .map((a) => {
        const base = categoryScoresFromArea(a);
        const cs = {};
        cats.forEach((c) => {
          let s = base[c.key];
          if (s == null) { cs[c.key] = null; return; }
          if (flip[c.key] === "negative") s = 11 - s;
          cs[c.key] = Math.max(1, Math.min(10, Math.round(s * 10) / 10));
        });
        return { ...a, _scores: cs, match_score: matchScore(cs, w) };
      })
      .sort((a, b) => b.match_score - a.match_score);
  }, [data, priorities, persona, audience]);
}

function indicatorValue(area, name) {
  return (area?.indicators || []).find((i) => i.indicator_name === name);
}

export default function BusinessDashboard() {
  const { data: profile } = useProfile();
  const districts = useDistricts();
  const barris = useBarris();
  const [type, setType] = useState("barri");

  const data = type === "district" ? districts.data : barris.data;
  const ranked = useRanked(profile?.audience, profile?.priorities, profile?.persona, data);
  const top = ranked.slice(0, 5);
  const best = ranked[0];

  if (!profile || !profile.priorities?.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Building2 className="h-8 w-8 mx-auto text-primary mb-3" />
        <h1 className="text-xl font-semibold">Business Dashboard</h1>
        <p className="text-muted-foreground mt-2">Tell our AI agent what your business needs, then we'll rank every Barcelona neighbourhood for your location search.</p>
        <Button asChild className="mt-5"><Link to="/onboarding"><Sparkles className="h-4 w-4" /> Start onboarding</Link></Button>
      </div>
    );
  }

  const topPriorities = [...(profile.priorities || [])].sort((a, b) => b.weight - a.weight).slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Business Dashboard</h1>
      </div>

      {/* Hero: best match + profile */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-xl border bg-card p-5 shadow-sm ring-1 ring-amber-200">
          <span className="text-xs font-semibold text-amber-700 uppercase">Your best business location</span>
          {best ? (
            <>
              <div className="mt-1 flex items-center gap-3">
                <Link to={`/area/${type}/${best.id}`} className="text-xl font-bold hover:underline">{best.name}</Link>
                <div className="ml-auto text-3xl font-bold" style={{ color: scoreColor((best.match_score / 10) + 1) }}>{best.match_score}%</div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{areaIntro(best, type)}</p>
              <Button asChild size="sm" className="mt-3"><Link to="/results">See all results <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Loading your matches…</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Business profile</span>
          <div className="mt-1 text-base font-semibold">{profile.persona}</div>
          <div className="mt-3 space-y-1.5">
            {topPriorities.map((p) => (
              <div key={p.category_key} className="flex items-center gap-2 text-sm">
                <CategoryIcon categoryKey={p.category_key} className="h-3.5 w-3.5" />
                <span className="flex-1 truncate">{CATEGORY_MAP[p.category_key]?.name}</span>
                <span className="text-muted-foreground text-xs">{p.weight}</span>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full"><Link to="/priorities">Edit priorities</Link></Button>
        </div>
      </div>

      {/* Section 1: Location ranking */}
      <section className="mt-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="font-semibold">Top business locations</h2>
          <div className="ml-auto inline-flex rounded-lg border p-0.5 bg-muted">
            <button onClick={() => setType("barri")} className={`px-3 py-1 text-xs rounded-md ${type === "barri" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Barrio</button>
            <button onClick={() => setType("district")} className={`px-3 py-1 text-xs rounded-md ${type === "district" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Districts</button>
          </div>
        </div>
        <div className="space-y-2">
          {top.map((a, i) => (
            <Link key={a.id} to={`/area/${type}/${a.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm hover:bg-muted/50">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: scoreColor((a.match_score / 10) + 1) }}>
                <span className="text-sm font-bold">{a.match_score}%</span>
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{a.name}</span>
                  {i < 3 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">TOP {i + 1}</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{areaSummary(a._scores)}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      {/* Section 2: Commerce & foot traffic */}
      <section className="mt-6">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Commerce &amp; foot traffic</h2>
        </div>
        <IndicatorTable areas={top} indicators={COMMERCE_INDICATORS} />
        <ComingSoonNote items={[{ key: "commercial", label: "Commercial premises" }, { key: "customeraccess", label: "Customer access" }]} />
      </section>

      {/* Section 3: Operations & accessibility */}
      <section className="mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Operations &amp; accessibility</h2>
        </div>
        <IndicatorTable areas={top} indicators={OPERATIONS_INDICATORS} />
        <ComingSoonNote items={[{ key: "operations", label: "Business operations" }]} />
      </section>
    </div>
  );
}

function IndicatorTable({ areas, indicators }) {
  if (!areas.length) {
    return <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Loading neighbourhood data…</div>;
  }
  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Indicator</th>
            {areas.map((a) => <th key={a.id} className="text-center p-3 font-medium">{a.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {indicators.map((name) => (
            <tr key={name} className="border-b last:border-0">
              <td className="p-3">{name}</td>
              {areas.map((a) => {
                const iv = indicatorValue(a, name);
                return (
                  <td key={a.id} className="p-3 text-center">
                    {iv && !iv.external ? (
                      <div className="flex flex-col items-center gap-1">
                        <ScoreBadge score={iv.normalized_score} size="sm" />
                        <span className="text-[11px] text-muted-foreground">{iv.raw_value != null ? Number(iv.raw_value).toLocaleString("en-US", { maximumFractionDigits: 1 }) : "—"}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComingSoonNote({ items }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((it) => (
        <span key={it.key} className="inline-flex items-center gap-1.5 rounded-full border border-dashed bg-amber-50/50 px-3 py-1 text-xs text-amber-800">
          <CategoryIcon categoryKey={it.key} className="h-3 w-3" />
          {it.label} — coming soon
        </span>
      ))}
    </div>
  );
}