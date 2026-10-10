import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useProfile } from "@/lib/useProfile";
import { useDistricts, useBarris } from "@/lib/useAreas";
import { matchScore, topReasons, scoreColor, categoryScoresFromArea, areaSummary } from "@/lib/scoring";
import { CATEGORIES, CATEGORY_MAP, PERSONA_FLIPS, categoriesForMode } from "@/lib/categories";
import { audienceConfig } from "@/lib/audience";
import ScoreBadge from "@/components/ScoreBadge";
import CategoryIcon from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowDownUp, MapPin, ChevronRight, Layers } from "lucide-react";

export default function Results() {
  const { data: profile } = useProfile();
  const districts = useDistricts();
  const barris = useBarris();
  const [level, setLevel] = useState("district");

  const weights = useMemo(() => {
    const obj = {};
    (profile?.priorities || []).forEach((p) => (obj[p.category_key] = p.weight));
    // apply persona flips: invert priority direction by adjusting nothing here (scores stay); flips affect display only
    return obj;
  }, [profile]);

  const flip = (profile?.persona && PERSONA_FLIPS[profile.persona]) || {};
  const ac = audienceConfig(profile);
  const cats = categoriesForMode(profile?.audience || "b2c");

  function rank(areas, type) {
    return areas
      .map((a) => {
        const base = categoryScoresFromArea(a);
        const cs = {};
        cats.forEach((c) => {
          let s = base[c.key];
          if (s == null) { cs[c.key] = null; return; }
          if (flip[c.key] === "negative") s = 11 - s;
          cs[c.key] = Math.max(1, Math.min(10, Math.round(s * 10) / 10));
        });
        const ms = matchScore(cs, weights);
        return { ...a, _type: type, _computedScores: cs, match_score: ms };
      })
      .sort((a, b) => b.match_score - a.match_score);
  }

  const loading = level === "district" ? districts.isLoading : barris.isLoading;
  const ranked = useMemo(() => {
    if (level === "district") return rank(districts.data || [], "district");
    return rank(barris.data || [], "barri");
  }, [level, districts.data, barris.data, weights]);

  if (!profile) {
    return <EmptyState />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h1 className="text-lg font-semibold flex items-center gap-2"><ArrowDownUp className="h-5 w-5 text-primary" /> {ac.resultsTitle}</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground"><Link to="/priorities">Adjust priorities</Link></Button>
          <div className="inline-flex rounded-lg border p-0.5 bg-muted">
            <button onClick={() => setLevel("district")} className={`px-3 py-1 text-xs rounded-md ${level === "district" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}><Layers className="inline h-3.5 w-3.5 mr-1" />Districts</button>
            <button onClick={() => setLevel("barri")} className={`px-3 py-1 text-xs rounded-md ${level === "barri" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Barris</button>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{level === "district" ? "10 districts" : "77 barris"} {ac.resultsSubLabel} · {ac.label} · {profile.persona}</p>

      {loading ? <div className="py-10 text-center text-muted-foreground">Scoring…</div> : (
        <div className="space-y-3">
          {ranked.slice(0, 20).map((a, i) => {
            const top = level === "district" ? 5 : 8;
            const reasons = topReasons({ category_scores: a._computedScores }, weights, (profile.priorities || []).sort((x, y) => y.weight - x.weight).slice(0, top).map((p) => p.category_key));
            return (
              <div key={a.id} className={`rounded-xl border bg-card p-4 shadow-sm ${i < 3 ? "ring-1 ring-emerald-200" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: scoreColor((a.match_score / 10) + 1) }}>
                    <span className="text-lg font-bold leading-none">{a.match_score}</span>
                    <span className="text-[9px] opacity-90">%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {i < 3 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">TOP {i + 1}</span>}
                      <h2 className="font-semibold truncate">{a.name}</h2>
                      {level === "barri" && <span className="text-xs text-muted-foreground">{a.district_name}</span>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{areaSummary(a._computedScores)}</p>
                    {i < 3 && reasons.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Fits because {reasons.map((r) => `${r.name.toLowerCase()} (${r.score.toFixed(1)}/10, weight ${r.weight})`).join(", ")} align with your priorities.
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(profile.priorities || []).slice(0, 5).sort((x, y) => x.rank - y.rank).map((p) => (
                        <span key={p.category_key} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px]">
                          <CategoryIcon categoryKey={p.category_key} className="h-3 w-3" />
                          <ScoreBadge score={a._computedScores[p.category_key]} size="sm" caption={CATEGORY_MAP[p.category_key]?.name} />
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link to={`/area/${a._type}/${a.id}`} className="self-center text-muted-foreground hover:text-foreground"><ChevronRight className="h-5 w-5" /></Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <Sparkles className="h-8 w-8 mx-auto text-primary mb-3" />
      <h1 className="text-xl font-semibold">Let's find your barrio</h1>
      <p className="text-muted-foreground mt-2">Tell our AI agent what matters to you, then we'll rank every Barcelona neighbourhood to your priorities.</p>
      <Button asChild className="mt-5"><Link to="/onboarding"><Sparkles className="h-4 w-4" /> Start onboarding</Link></Button>
    </div>
  );
}