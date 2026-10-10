import Results from "@/pages/Results";
import ModeSwitcher from "@/components/ModeSwitcher";
import { useActiveAudience } from "@/lib/useActiveAudience";
import { AUDIENCES } from "@/lib/audience";

// The agent chat lives in a global right sidebar (see AppLayout). This route
// shows the live results — which update in real time as the agent refines the
// profile — preceded by an explicit Personal/Business mode chooser, so the user
// picks their use case before the conversation begins.
export default function Onboarding() {
  const { audience } = useActiveAudience();
  const ac = AUDIENCES[audience];
  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <h1 className="text-lg font-semibold mb-1">Choose your mode</h1>
        <p className="text-sm text-muted-foreground mb-3">Each mode keeps its own profile and priorities. You can switch any time.</p>
        <ModeSwitcher variant="card" />
        <p className="mt-2 text-xs text-muted-foreground">Active: <span className="font-medium">{ac.label}</span>. Describe your situation in the agent chat on the right to build your {ac.label.toLowerCase()} profile.</p>
      </div>
      <Results />
    </div>
  );
}