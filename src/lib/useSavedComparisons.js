import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useActiveAudience } from "@/lib/useActiveAudience";

// Saved comparisons are private to each user. RLS on the entity enforces this
// server-side; we additionally scope the query by created_by_id so each list
// call only ever returns the current user's own comparisons.
export function useSavedComparisons() {
  const { userId } = useActiveAudience();
  return useQuery({
    queryKey: ["savedComparisons", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { items } = await base44.entities.SavedComparison.filter(
        { created_by_id: userId },
        { sort: "-created_date", limit: 50 }
      );
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