import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useActiveAudience } from "@/lib/useActiveAudience";

// Loads the persisted agent conversation for the active mode. Personal and
// Business keep separate threads, so switching modes resumes the right chat.
// Filtering by created_by_id ensures each user sees only their own conversations.
export function useConversation() {
  const { audience, userId } = useActiveAudience();
  return useQuery({
    queryKey: ["agentconversation", audience, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { items } = await base44.entities.AgentConversation.filter(
        { audience, created_by_id: userId }, { limit: 1, sort: "-created_date" }
      );
      return items[0] || null;
    }
  });
}