import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useDistricts() {
  return useQuery({
    queryKey: ["districts"],
    queryFn: async () => {
      const { items } = await base44.entities.District.filter({}, { sort: "code", limit: 50, fields: ["name","code","population","centroid","category_scores","indicators","is_sample","geometry"] });
      return items;
    }
  });
}

export function useBarris() {
  return useQuery({
    queryKey: ["barris"],
    queryFn: async () => {
      const items = [];
      let cursor = undefined;
      do {
        const page = await base44.entities.Barri.filter({}, { sort: "code", limit: 200, cursor, fields: ["name","code","district_code","district_name","population","centroid","category_scores","indicators","is_sample"] });
        items.push(...page.items);
        cursor = page.has_more ? page.next_cursor : undefined;
      } while (cursor);
      return items;
    }
  });
}

export function useDistrict(id) {
  return useQuery({
    queryKey: ["district", id],
    queryFn: async () => id ? base44.entities.District.get(id) : null,
    enabled: !!id
  });
}

export function useBarri(id) {
  return useQuery({
    queryKey: ["barri", id],
    queryFn: async () => id ? base44.entities.Barri.get(id) : null,
    enabled: !!id
  });
}

export function useAreas(type) {
  const d = useDistricts();
  const b = useBarris();
  if (type === "district") return d;
  if (type === "barri") return b;
  // both combined
  return {
    data: [...(d.data||[]).map(a=>({...a,_type:"district"})),...(b.data||[]).map(a=>({...a,_type:"barri"}))],
    isLoading: d.isLoading||b.isLoading
  };
}