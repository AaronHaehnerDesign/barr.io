import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useProfile } from "@/lib/useProfile";
import { useDistricts } from "@/lib/useAreas";
import { useApartments } from "@/lib/useApartments";
import { matchScore, categoryScoresFromArea } from "@/lib/scoring";
import { categoriesForMode, PERSONA_FLIPS } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Building2, BedDouble, Bath, Maximize, ArrowUpRight, Sparkles, MapPin, RotateCcw, Star } from "lucide-react";

const BUDGET = {
  rent: { min: 500, max: 4000, step: 50, default: 2500 },
  buy: { min: 120000, max: 1500000, step: 10000, default: 650000 },
};

function eur(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function priceLabel(listingType, price) {
  return listingType === "rent" ? `${eur(price)}/mo` : eur(price);
}

export default function Apartments() {
  const { data: profile } = useProfile();
  const { data: districts } = useDistricts();

  const [listingType, setListingType] = useState("rent");
  const cfg = BUDGET[listingType];
  const [maxBudget, setMaxBudget] = useState(cfg.default);
  const [area, setArea] = useState("all");
  const [rooms, setRooms] = useState("any");

  // Reset budget to a sensible default when the listing type flips.
  useEffect(() => { setMaxBudget(BUDGET[listingType].default); }, [listingType]);

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

  function reset() {
    setArea("all");
    setRooms("any");
    setMaxBudget(BUDGET[listingType].default);
  }

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
          {/* Listing type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <div className="mt-1 inline-flex w-full rounded-lg border p-0.5 bg-muted">
              {["rent", "buy"].map((t) => (
                <button key={t} onClick={() => setListingType(t)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-md capitalize ${listingType === t ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
                  {t === "rent" ? "Rent" : "Buy"}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
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

          {/* Rooms */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Rooms</label>
            <select value={rooms} onChange={(e) => setRooms(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5 text-sm">
              <option value="any">Any</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4plus">4+</option>
            </select>
          </div>
        </div>

        {/* Area + quick actions */}
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

      {/* Results */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          {isLoading ? "Searching…" : `${apartments.length} ${apartments.length === 1 ? "home" : "homes"} found`}
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
          {apartments.map((a) => (
            <div key={a.id} className="group rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img src={a.image_url} alt={a.title} loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
                  {priceLabel(a.listing_type, a.price)}
                </span>
                <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-700 capitalize">
                  {a.listing_type}
                </span>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <MapPin className="h-3 w-3 shrink-0" /> {a.district_name}{a.barri_name ? ` · ${a.barri_name}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {a.rooms} bed</span>
                  <span className="inline-flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {a.bathrooms ?? 1} bath</span>
                  <span className="inline-flex items-center gap-1"><Maximize className="h-3.5 w-3.5" /> {a.size_sqm} m²</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.has_terrace && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Terrace</span>}
                  {a.has_elevator && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">Elevator</span>}
                  {a.floor && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{a.floor} floor</span>}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Button asChild variant="ghost" size="sm" className="px-0 text-primary hover:bg-transparent">
                    <Link to={`/area/district/${a.district_name}`}>View area<ArrowUpRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}