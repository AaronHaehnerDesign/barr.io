import AgentSidebar from "@/components/AgentSidebar";
import Results from "@/pages/Results";

// Split layout: live results on the left, agent chat in the right sidebar.
// As the agent detects a ready profile it saves it, and Results recomputes in
// real time (same useProfile query, invalidated by save).
export default function Onboarding() {
  return (
    <div className="flex flex-col lg:h-screen lg:flex-row">
      <main className="order-1 min-w-0 flex-1 overflow-y-auto lg:order-1">
        <Results />
      </main>
      <aside className="order-2 h-[60vh] w-full shrink-0 border-t lg:order-2 lg:h-screen lg:w-[380px] lg:border-l lg:border-t-0">
        <AgentSidebar className="h-full" />
      </aside>
    </div>
  );
}