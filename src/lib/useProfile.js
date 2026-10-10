import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useActiveAudience } from "@/lib/useActiveAudience";

// Each mode (Personal/Business) keeps its own profile. The active mode is the
// source of truth for which profile to load/save, so the same hook works for
// both — switching modes swaps the profile without overwriting the other.
export function useProfile() {
  const { audience, userId } = useActiveAudience();
  return useQuery({
    queryKey: ["userprofile", audience, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { items } = await base44.entities.UserProfile.filter(
        { audience, created_by_id: userId }, { limit: 1, sort: "-created_date" }
      );
      return items[0] || null;
    }
  });
}

export function useSaveProfile() {
  const { audience, userId } = useActiveAudience();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const aud = data.audience || audience;
      const { items } = await base44.entities.UserProfile.filter(
        { audience: aud, created_by_id: userId }, { limit: 1, sort: "-created_date" }
      );
      if (items[0]) {
        return base44.entities.UserProfile.update(items[0].id, { ...data, audience: aud });
      }
      return base44.entities.UserProfile.create({ ...data, audience: aud });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userprofile"] })
  });
}