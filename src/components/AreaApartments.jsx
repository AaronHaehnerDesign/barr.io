import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/lib/useProfile";
import { useDistricts, useBarris, useAreas } from "@/lib/useAreas";
import { base44 } from "@/api/base44Client";
import ApartmentCard from "@/components/ApartmentCard";
import { eur } from "@/lib/apartmentFormat";
import { nearestWorkplace } from "@/lib/scoring";
import { useWorkplaces } from "@/lib/useWorkplaces";
import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";

// Apartments available in a specific district (and optionally barri), filtered
// by the user's profile (budget, rooms, rent/buy). Shown on the area detail page.
export default function AreaApartments({ districtName, barriName }) {
  const { data: profile } = useProfile();
  const { data: districts } = useDistricts();
  const workplaces = useWorkplaces();
  const [items, setItems] = useState(null);

  const listingType = profile?.budget_type || "rent";
  const maxBudget = profile?.budget_max || null;
  const roomsNeeded = profile?.rooms_needed || null;

  useEffect(() => {
    let alive = true;
    const q = { listing_type: listingType, district_name: districtName };
    if (barriName) q.barri_name = barriName;
    if (maxBudget) q.price = { $lte: Number(maxBudget) };
    if (roomsNeeded) q.rooms = { $gte: Number(roomsNeeded) };
    base44.entities.Apartment.filter(q, { sort: "price", limit: 6 })
      .then(({ items: rows }) => { if (alive) setItems(rows); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [districtName, barriName, listingType, maxBudget, roomsNeeded]);

  // District centroid for the "distance to nearest workplace" chip.
  const districtId = useMemo(() => (districts || []).find((d) => d.name === districtName)?.id || null, [districts, districtName]);
  const districtCentroid = useMemo(
    () => (districts || []).find((d) => d.name === districtName)?.centroid || null,
    [districts, districtName]
  );

  const loading = items === null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Homes in this area</h2>
        <Link to="/apartments" className="text-xs text-primary hover:underline">See all apartments</Link>
      </div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <div className="aspect-[4/3] bg-muted animate-pulse" />
              <div className="p-3 space-y-2"><div className="h-4 w-2/3 bg-muted rounded animate-pulse" /><div className="h-3 w-1/2 bg-muted rounded animate-pulse" /></div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          No placeholder listings match your budget/rooms in {barriName || districtName} yet.
          <Link to="/apartments" className="ml-1 text-primary hover:underline">Browse all apartments</Link>.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => {
            const nw = districtCentroid ? nearestWorkplace({ centroid: districtCentroid }, workplaces) : null;
            return (
              <ApartmentCard
                key={a.id}
                a={a}
                areaTo={districtId ? `/area/district/${districtId}` : null}
                distanceLabel={nw ? `${nw.text} to ${nw.label}` : null}
              />
            );
          })}
        </div>
      )}
      {(maxBudget || roomsNeeded) && (
        <p className="mt-2 text-xs text-muted-foreground">
          Filtered by your profile{maxBudget ? ` · max ${listingType === "rent" ? eur(maxBudget) + "/mo" : eur(maxBudget)}` : ""}{roomsNeeded ? ` · ${roomsNeeded}+ bed` : ""}.
        </p>
      )}
    </div>
  );
}