import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Server-side filtered apartment search. Each filter change is a fresh query so
// the DB does the matching (the catalog is small now but will grow).
export function useApartments(filters) {
  const { listingType, area, rooms, maxBudget } = filters || {};
  return useQuery({
    queryKey: ["apartments", listingType ?? "rent", area ?? "all", rooms ?? "any", maxBudget ?? null],
    queryFn: async () => {
      const q = {};
      if (listingType) q.listing_type = listingType;
      if (area && area !== "all") q.district_name = area;
      if (rooms && rooms !== "any") {
        q.rooms = rooms === "4plus" ? { $gte: 4 } : { $gte: Number(rooms) };
      }
      if (maxBudget) q.price = { $lte: Number(maxBudget) };
      const { items } = await base44.entities.Apartment.filter(q, { sort: "price", limit: 60 });
      return items;
    },
    enabled: !!listingType
  });
}