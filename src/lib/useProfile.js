import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useProfile() {
  return useQuery({
    queryKey: ["userprofile"],
    queryFn: async () => {
      const { items } = await base44.entities.UserProfile.filter({}, { limit: 1 });
      return items[0] || null;
    }
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const { items } = await base44.entities.UserProfile.filter({}, { limit: 1 });
      if (items[0]) {
        return base44.entities.UserProfile.update(items[0].id, data);
      }
      return base44.entities.UserProfile.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userprofile"] })
  });
}