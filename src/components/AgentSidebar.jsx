import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useProfile, useSaveProfile } from "@/lib/useProfile";
import { useConversation } from "@/lib/useConversation";
import { useActiveAudience } from "@/lib/useActiveAudience";
import { categoriesForMode } from "@/lib/categories";
import CategoryIcon from "@/components/CategoryIcon";
import VoiceRecorder from "@/components/VoiceRecorder";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, Loader2 } from "lucide-react";

const WELCOME_B2C = { role: "assistant", content: "Hi! I'm your barr.io agent — I'll help you find your ideal Barcelona neighbourhood. To start, who will be living there? Just you, a couple, or a family with kids?" };
const WELCOME_B2B = { role: "assistant", content: "Hi! I'm your barr.io agent — I'll help you find the right Barcelona location for your business. To start, what kind of business is it? (shop, restaurant, office, workshop…)" };

// Self-contained agent chat designed to live in a right sidebar. When the agent
// detects a ready profile it saves it immediately (preserving the existing
// confirmed flag) so any page reading the profile — Results, Compare, Map —
// updates live as you chat without re-triggering onboarding.
export default function AgentSidebar({ className = "" }) {
  const { audience } = useActiveAudience();
  const { data: profile } = useProfile();
  const { data: convo, refetch: refetchConvo } = useConversation();
  const saveProfile = useSaveProfile();
  const cats = categoriesForMode(audience);
  const [pending, setPending] = useState([]); // optimistic messages not yet persisted
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const scrollRef = useRef(null);

  const welcome = audience === "b2b" ? WELCOME_B2B : WELCOME_B2C;
  const serverMessages = convo?.messages?.length ? convo.messages : [welcome];
  const messages = [...serverMessages, ...pending];

  useEffect(() => {
    if (convo?.draft_profile) setDraft(convo.draft_profile);
  }, [convo]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setPending((p) => [...p, { role: "user", content }]);
    setLoading(true);
    try {
      const res = await base44.functions.invoke("agent", { input: content, audience });
      const data = res?.data || {};
      // the server persisted the user msg + reply; refetch so history is authoritative
      await refetchConvo();
      setPending([]);
      if (data.profile) {
        setDraft(data.profile);
        // Save without navigating away — Results/Compare/Map/PriorityBoard recompute live.
        // The agent always returns the full accumulated profile, so edits persist on every turn.
        await saveProfile.mutateAsync({
          persona: data.profile.persona,
          priorities: data.profile.priorities || [],
          hard_filters: data.profile.hard_filters || [],
          work_locations: data.profile.work_locations ?? profile?.work_locations ?? [],
          budget_type: data.profile.budget_type ?? profile?.budget_type ?? null,
          budget_max: data.profile.budget_max ?? profile?.budget_max ?? null,
          rooms_needed: data.profile.rooms_needed ?? profile?.rooms_needed ?? null,
          raw_input_text: data.profile.summary || content,
          confirmed: !!profile?.confirmed
        });
      }
    } catch (e) {
      setPending((p) => [...p, { role: "assistant", content: "Sorry, I hit a snag. Try sending that again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Agent</h2>
        {draft?.persona && <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">{draft.persona}</span>}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {!pending.length && !serverMessages.some((m) => m.role === "user") && !loading && (
          <div className="flex flex-wrap gap-2 pl-1">
            {(audience === "b2b" ? ["Shop", "Restaurant", "Office"] : ["Just me", "Couple", "Family with kids"]).map((c) => (
              <button key={c} type="button" onClick={() => send(c)} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100">{c}</button>
            ))}
          </div>
        )}
        {convo?.status !== "profile_ready" && (
          <p className="text-center text-[11px] font-medium text-muted-foreground">
            Question {Math.min(3, messages.filter((m) => m.role === "user").length + 1)} of 3
          </p>
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          </div>
        )}
      </div>

      {draft?.priorities?.length > 0 && (
        <div className="shrink-0 border-t bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Detected priorities</p>
          <div className="flex flex-wrap gap-1.5">
            {draft.priorities.slice().sort((a, b) => a.rank - b.rank).map((p) => {
              const cat = cats.find((c) => c.key === p.category_key);
              return cat ? (
                <span key={p.category_key} className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs">
                  <CategoryIcon categoryKey={p.category_key} className="h-3 w-3" />
                  {cat.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex shrink-0 items-center gap-2 border-t p-3">
        <VoiceRecorder onTranscript={(t) => send(t)} disabled={loading} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your situation…"
          className="flex-1 rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} className="rounded-full">
          <Send className="h-4 w-4" />
        </Button>
      </form>

    </div>
  );
}