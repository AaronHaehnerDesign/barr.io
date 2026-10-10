import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AgentSidebar from "@/components/AgentSidebar";
import BuildingPersona from "@/components/BuildingPersona";
import { useProfile, useSaveProfile } from "@/lib/useProfile";
import { useConversation } from "@/lib/useConversation";
import { useActiveAudience } from "@/lib/useActiveAudience";
import { Sparkles } from "lucide-react";

// Full-screen first-time onboarding. There is no manual "complete" button: the
// agent sets the conversation to "profile_ready" once it has gathered enough
// (persona, priorities, budget, work location). When that happens we confirm
// the profile, play a "Building your persona now" animation, then route to the
// dashboard.
export default function Onboarding() {
  const { audience } = useActiveAudience();
  const { data: profile } = useProfile();
  const { data: convo } = useConversation();
  const saveProfile = useSaveProfile();
  const navigate = useNavigate();
  const [finishing, setFinishing] = useState(false);
  const startedRef = useRef(false);

  const label = audience === "b2b" ? "business" : "personal";
  const agentReady = convo?.status === "profile_ready";

  useEffect(() => {
    if (agentReady && !startedRef.current && profile) {
      startedRef.current = true;
      setFinishing(true);
      // Play the "Building your persona now" animation first, then confirm the
      // profile (flipping OnboardingGuard to allow the dashboard) and route.
      // No cleanup: a profile re-fetch re-runs this effect but startedRef guards
      // it, so we must NOT clear the pending timeout or the animation never completes.
      setTimeout(async () => {
        await saveProfile.mutateAsync({ ...profile, confirmed: true });
        navigate("/dashboard");
      }, 5200);
    }
  }, [agentReady, profile, saveProfile, navigate]);

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
              {agentReady
                ? "I have enough to build your profile, one moment…"
                : "Chat with the agent to build your profile. I'll finish automatically once I have what I need."}
            </p>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <div className="mx-auto h-full max-w-3xl p-4">
          <AgentSidebar className="h-full" />
        </div>
      </main>

      <AnimatePresence>
        {finishing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background"
          >
            <BuildingPersona />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}