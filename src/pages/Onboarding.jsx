import Results from "@/pages/Results";

// The agent chat now lives in a global right sidebar (see AppLayout), so this
// route simply shows the live results — which update in real time as the agent
// refines the profile.
export default function Onboarding() {
  return <Results />;
}