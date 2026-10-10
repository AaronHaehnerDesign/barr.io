import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useActiveAudience } from "@/lib/useActiveAudience";

// Loads the persisted agent conversation for the active mode. Personal and
// Business keep separate threads, so switching modes resumes the right chat.
// RLS ensures each user sees only their own conversations.
export function useConversation() {
  const { audience } = useActiveAudience();
  return useQuery({
    queryKey: ["agentconversation", audience],
    queryFn: async () => {
      const { items } = await base44.entities.AgentConversation.filter(
        { audience }, { limit: 1, sort: "-created_date" }
      );
      return items[0] || null;
    }
  });
}