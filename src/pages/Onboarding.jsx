import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AgentSidebar from "@/components/AgentSidebar";
import { useProfile, useSaveProfile } from "@/lib/useProfile";
import { useActiveAudience } from "@/lib/useActiveAudience";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

// Full-screen, un-skippable first-time onboarding. No app chrome — just the
// agent chat. Once the agent has captured priorities, the "Complete onboarding"
// button confirms the profile and the guard sends the user to the dashboard.
export default function Onboarding() {
  const { audience } = useActiveAudience();
  const { data: profile } = useProfile();
  const saveProfile = useSaveProfile();
  const navigate = useNavigate();
  const [finishing, setFinishing] = useState(false);

  const label = audience === "b2b" ? "business" : "personal";
  const ready = (profile?.priorities?.length || 0) > 0;

  async function finish() {
    setFinishing(true);
    try {
      await saveProfile.mutateAsync({
        persona: profile.persona,
        priorities: profile.priorities,
        hard_filters: profile.hard_filters || [],
        raw_input_text: profile.raw_input_text,
        confirmed: true
      });
      navigate("/dashboard");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-base font-semibold capitalize">{label} onboarding</h1>
            <p className="text-xs text-muted-foreground">Tell our AI what matters to you. You'll reach the dashboard once your profile is ready.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
        <div className="flex-1 min-h-[55vh] overflow-hidden rounded-2xl border bg-card shadow-sm">
          <AgentSidebar className="h-full" />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {ready ? "Your priorities are ready." : "Chat with the agent to build your profile."}
          </p>
          <Button onClick={finish} disabled={!ready || finishing}>
            {finishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Complete onboarding <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}