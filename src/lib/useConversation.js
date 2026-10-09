import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Loads the current user's persisted agent conversation (source of truth for
// the onboarding chat history). RLS ensures each user sees only their own.
export function useConversation() {
  return useQuery({
    queryKey: ["agentconversation"],
    queryFn: async () => {
      const { items } = await base44.entities.AgentConversation.filter({}, { limit: 1 });
      return items[0] || null;
    }
  });
}