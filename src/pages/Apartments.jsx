import { useMemo, useState, useEffect, useRef } from "react";
import { useProfile } from "@/lib/useProfile";
import { useDistricts } from "@/lib/useAreas";
import { useApartments } from "@/lib/useApartments";
import { useWorkplaces } from "@/lib/useWorkplaces";
import { matchScore, categoryScoresFromArea, nearestWorkplace } from "@/lib/scoring";
import { categoriesForMode, PERSONA_FLIPS } from "@/lib/categories";
import { eur } from "@/lib/apartmentFormat";
import ApartmentCard from "@/components/ApartmentCard";
import { Button } from "@/components/ui/button";
import { Building2, Sparkles, RotateCcw, Star } from "lucide-react";

const BUDGET = {
  rent: { min: 500, max: 4000, step: 50, default: 2500 },
  buy: { min: 120000, max: 1500000, step: 10000, default: 650000 },
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function Apartments() {
  const { data: profile } = useProfile();
  const { data: districts } = useDistricts();
  const workplaces = useWorkplaces();

  const [listingType, setListingType] = useState("rent");
  const cfg = BUDGET[listingType];
  const [maxBudget, setMaxBudget] = useState(cfg.default);
  const [area, setArea] = useState("all");
  const [rooms, setRooms] = useState("any");

  // Pre-fill filters once from the onboarding profile (budget, rooms, rent/buy).
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || !profile) return;
    didInit.current = true;
    const lt = profile.budget_type || "rent";
    setListingType(lt);
    if (profile.budget_max) setMaxBudget(clamp(profile.budget_max, BUDGET[lt].min, BUDGET[lt].max));
    if (profile.rooms_needed) setRooms(profile.rooms_needed >= 4 ? "4plus" : String(profile.rooms_needed));
  }, [profile]);

  function toggleType(t) {
    if (t === listingType) return;
    setListingType(t);
    setMaxBudget(BUDGET[t].default);
  }

  // The user's best-matching district — offered as a one-tap "preferred area".
  const bestMatch = useMemo(() => {
    if (!districts?.length || !profile?.priorities?.length) return null;
    const cats = categoriesForMode(profile.audience || "b2c");
    const flip = (profile.persona && PERSONA_FLIPS[profile.persona]) || {};
    const weights = {};
    (profile.priorities || []).forEach((p) => (weights[p.category_key] = p.weight));
    let best = null;
    let bestScore = -1;
    districts.forEach((d) => {
      const scores = categoryScoresFromArea(d);
      const cs = {};
      cats.forEach((c) => {
        let s = scores[c.key];
        if (s == null) return;
        if (flip[c.key] === "negative") s = 11 - s;
        cs[c.key] = Math.max(1, Math.min(10, Math.round(s * 10) / 10));
      });
      const ms = matchScore(cs, weights);
      if (ms > bestScore) { bestScore = ms; best = d.name; }
    });
    return best;
  }, [districts, profile]);

  const { data: apartments = [], isLoading } = useApartments({ listingType, area, rooms, maxBudget });

  // District id + centroid lookup by name (for area links + commute distance).
  const districtCentroids = useMemo(() => {
    const m = {};
    (districts || []).forEach((d) => { m[d.name] = d.centroid; });
    return m;
  }, [districts]);

  function reset() {
    setArea("all");
    setRooms("any");
    setMaxBudget(BUDGET[listingType].default);
  }

  const prefillNote = (profile?.budget_max || profile?.rooms_needed) && didInit.current;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Available apartments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse placeholder listings to rent or buy across Barcelona. Filter by budget, your preferred area and the number of rooms you need.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 shadow-sm mb-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <div className="mt-1 inline-flex w-full rounded-lg border p-0.5 bg-muted">
              {["rent", "buy"].map((t) => (
                <button key={t} onClick={() => toggleType(t)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-md capitalize ${listingType === t ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
                  {t === "rent" ? "Rent" : "Buy"}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Max budget</label>
              <span className="text-sm font-semibold tabular-nums">{eur(maxBudget)}{listingType === "rent" ? "/mo" : ""}</span>
            </div>
            <input type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={maxBudget}
              onChange={(e) => setMaxBudget(Number(e.target.value))}
              className="mt-2 w-full accent-primary" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>{eur(cfg.min)}</span><span>{eur(cfg.max)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Min rooms</label>
            <select value={rooms} onChange={(e) => setRooms(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5 text-sm">
              <option value="any">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4plus">4+</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="text-xs font-medium text-muted-foreground">Preferred area</label>
            <select value={area} onChange={(e) => setArea(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5 text-sm">
              <option value="all">All districts</option>
              {(districts || []).map((d) => <option key={d.code} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          {bestMatch && area !== bestMatch && (
            <Button variant="outline" size="sm" onClick={() => setArea(bestMatch)} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> My best match: {bestMatch}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          {isLoading ? "Searching…" : `${apartments.length} ${apartments.length === 1 ? "home" : "homes"} found`}
          {prefillNote && <span className="ml-2 text-emerald-700">· filtered by your profile</span>}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          <Star className="h-3 w-3" /> Placeholder data
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="aspect-[4/3] bg-muted animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : apartments.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium">No apartments match your filters</p>
          <p className="text-sm text-muted-foreground mt-1">Try raising your budget or choosing a different area.</p>
          <Button variant="outline" size="sm" onClick={reset} className="mt-4">Reset filters</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apartments.map((a) => {
            const centroid = districtCentroids[a.district_name];
            const nw = centroid ? nearestWorkplace({ centroid }, workplaces) : null;
            return (
              <ApartmentCard
                key={a.id}
                a={a}
                distanceLabel={nw ? `${nw.text} to ${nw.label}` : null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}