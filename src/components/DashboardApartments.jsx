import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProfile } from "@/lib/useProfile";
import { base44 } from "@/api/base44Client";
import ApartmentCard from "@/components/ApartmentCard";
import { Building2 } from "lucide-react";

// Apartments available in the user's top recommended districts, filtered by the
// profile (budget, rooms, rent/buy). Shown on the dashboard under the top-3.
export default function DashboardApartments({ districtNames }) {
  const { data: profile } = useProfile();
  const [items, setItems] = useState(null);

  const listingType = profile?.budget_type || "rent";
  const maxBudget = profile?.budget_max || null;
  const roomsNeeded = profile?.rooms_needed || null;

  useEffect(() => {
    let alive = true;
    if (!districtNames?.length) { setItems([]); return; }
    const q = { listing_type: listingType, district_name: { $in: districtNames } };
    if (maxBudget) q.price = { $lte: Number(maxBudget) };
    if (roomsNeeded) q.rooms = { $gte: Number(roomsNeeded) };
    base44.entities.Apartment.filter(q, { sort: "price", limit: 6 })
      .then(({ items: rows }) => { if (alive) setItems(rows); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtNames?.join("|"), listingType, maxBudget, roomsNeeded]);

  if (items === null || items.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Homes in your top districts</h2>
        <Link to="/apartments" className="text-xs text-primary hover:underline">See all apartments</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => <ApartmentCard key={a.id} a={a} />)}
      </div>
    </div>
  );
}