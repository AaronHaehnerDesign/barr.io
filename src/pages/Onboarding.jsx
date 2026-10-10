import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AgentSidebar from "@/components/AgentSidebar";
import { useProfile, useSaveProfile } from "@/lib/useProfile";
import { useConversation } from "@/lib/useConversation";
import { useActiveAudience } from "@/lib/useActiveAudience";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

// Full-screen, un-skippable first-time onboarding. The chat input and detected
// priorities stay pinned to the bottom (see AgentSidebar). Completion requires
// the agent to have captured priorities AND the user to have answered at least
// MIN_QUESTIONS questions — no skipping.
const MIN_QUESTIONS = 3;

export default function Onboarding() {
  const { audience } = useActiveAudience();
  const { data: profile } = useProfile();
  const { data: convo } = useConversation();
  const saveProfile = useSaveProfile();
  const navigate = useNavigate();
  const [finishing, setFinishing] = useState(false);

  const label = audience === "b2b" ? "business" : "personal";
  const userTurns = (convo?.messages || []).filter((m) => m.role === "user" && m.content?.trim()).length;
  const hasPriorities = (profile?.priorities?.length || 0) > 0;
  const ready = hasPriorities && userTurns >= MIN_QUESTIONS;
  const remaining = Math.max(0, MIN_QUESTIONS - userTurns);

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
    <div className="flex h-screen flex-col bg-background">
      <header className="shrink-0 border-b">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="text-base font-semibold capitalize">{label} onboarding</h1>
            <p className="text-xs text-muted-foreground">
              {ready
                ? "Your profile is ready — finish to see your matches."
                : `Answer at least ${MIN_QUESTIONS} questions (${userTurns}/${MIN_QUESTIONS} answered${hasPriorities ? "" : " · priorities pending"}) to finish.`}
            </p>
          </div>
          <Button onClick={finish} disabled={!ready || finishing} className="ml-auto shrink-0">
            {finishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Complete onboarding <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <div className="mx-auto h-full max-w-3xl p-4">
          <AgentSidebar className="h-full" />
        </div>
      </main>
    </div>
  );
}