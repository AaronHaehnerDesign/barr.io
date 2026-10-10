import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useSavedComparisons() {
  return useQuery({
    queryKey: ["savedComparisons"],
    queryFn: async () => {
      const { items } = await base44.entities.SavedComparison.filter({}, { sort: "-created_date", limit: 50 });
      return items;
    }
  });
}

export function useDeleteComparison() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => base44.entities.SavedComparison.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedComparisons"] })
  });
}