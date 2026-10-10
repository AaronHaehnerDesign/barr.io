import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useProfile } from "@/lib/useProfile";
import { useDistricts } from "@/lib/useAreas";
import { CATEGORIES, CATEGORY_MAP, PERSONA_FLIPS, categoriesForMode } from "@/lib/categories";
import { categoryScoresFromArea, matchScore, areaSummary, scoreColor } from "@/lib/scoring";
import { areaIntro } from "@/lib/areaIntro";
import DashboardApartments from "@/components/DashboardApartments";
import CategoryIcon from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Sparkles, ArrowRight, Map as MapIcon, GitCompareArrows, SlidersHorizontal, ChevronRight, BarChart3, Users } from "lucide-react";

export default function Dashboard() {
  const { data: profile } = useProfile();
  const districts = useDistricts();

  const ranked = useMemo(() => {
    if (!districts.data) return [];
    const w = {};
    (profile?.priorities || []).forEach((p) => (w[p.category_key] = p.weight));
    const flip = (profile?.persona && PERSONA_FLIPS[profile.persona]) || {};
    const cats = categoriesForMode(profile?.audience || "b2c");
    return districts.data
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
  }, [districts.data, profile]);

  if (!profile || !profile.priorities?.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Sparkles className="h-8 w-8 mx-auto text-primary mb-3" />
        <h1 className="text-xl font-semibold">Welcome to BarrioMatch</h1>
        <p className="text-muted-foreground mt-2">Tell our AI agent what matters to you, then we'll rank every Barcelona neighbourhood to your priorities.</p>
        <Button asChild className="mt-5"><Link to="/onboarding"><Sparkles className="h-4 w-4" /> Start onboarding</Link></Button>
      </div>
    );
  }

  const best = ranked[0];
  const top3 = ranked.slice(0, 3);
  const topPriorities = [...(profile.priorities || [])].sort((a, b) => b.weight - a.weight).slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-xl border bg-card p-5 shadow-sm ring-1 ring-emerald-200">
          <span className="text-xs font-semibold text-emerald-700 uppercase">Your best match</span>
          {best ? (
            <>
              <div className="mt-1 flex items-center gap-3">
                <Link to={`/area/district/${best.id}`} className="text-xl font-bold hover:underline">{best.name}</Link>
                <div className="ml-auto text-3xl font-bold" style={{ color: scoreColor((best.match_score / 10) + 1) }}>{best.match_score}%</div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{areaIntro(best, "district")}</p>
              <Button asChild size="sm" className="mt-3"><Link to="/results">See all results <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Loading your matches…</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Your profile</span>
          <div className="mt-1 text-base font-semibold">{profile.persona}</div>
          <p className="text-xs text-muted-foreground capitalize">{profile.audience === "b2b" ? "Business" : "Personal"}</p>
          <div className="mt-3 space-y-1.5">
            {topPriorities.map((p) => (
              <div key={p.category_key} className="flex items-center gap-2 text-sm">
                <CategoryIcon categoryKey={p.category_key} className="h-3.5 w-3.5" />
                <span className="flex-1 truncate">{CATEGORY_MAP[p.category_key]?.name}</span>
                <span className="text-muted-foreground text-xs">{p.weight}</span>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full"><Link to="/priorities"><SlidersHorizontal className="h-3.5 w-3.5" /> Edit priorities</Link></Button>
        </div>
      </div>

      <h2 className="mt-6 mb-2 font-semibold">Top recommended districts</h2>
      <div className="space-y-2">
        {top3.map((a, i) => (
          <Link key={a.id} to={`/area/district/${a.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm hover:bg-muted/50">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: scoreColor((a.match_score / 10) + 1) }}>
              <span className="text-sm font-bold">{a.match_score}%</span>
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{a.name}</span>
                {i < 3 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">TOP {i + 1}</span>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{areaSummary(a._scores)}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <DashboardApartments districtNames={top3.map((a) => a.name)} />

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickLink to="/map" icon={MapIcon} label="Map" />
        <QuickLink to="/compare" icon={GitCompareArrows} label="Compare" />
        <QuickLink to="/data-insights" icon={BarChart3} label="Insights" />
        <QuickLink to="/persona-library" icon={Users} label="Personas" />
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1 rounded-xl border bg-card p-4 text-center hover:bg-muted/50">
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}