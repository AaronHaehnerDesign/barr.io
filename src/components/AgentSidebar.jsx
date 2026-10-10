import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useProfile, useSaveProfile } from "@/lib/useProfile";
import { useConversation } from "@/lib/useConversation";
import VoiceRecorder from "@/components/VoiceRecorder";
import { CATEGORIES } from "@/lib/categories";
import CategoryIcon from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, Loader2 } from "lucide-react";

const WELCOME = { role: "assistant", content: "Hi! I'm your BarrioMatch agent. Tell me what you're looking for — a home for you and your household, or a location for your business. Describe your situation, budget, and what matters to you, and I'll guide you from there. You can type or tap the mic to speak." };

// Self-contained agent chat designed to live in a right sidebar. When the agent
// detects a ready profile it saves it immediately (confirmed:false) so any page
// reading the profile — Results, Compare, Map — updates live as you chat.
export default function AgentSidebar({ className = "" }) {
  const { data: profile } = useProfile();
  const { data: convo, refetch: refetchConvo } = useConversation();
  const saveProfile = useSaveProfile();
  const [pending, setPending] = useState([]); // optimistic messages not yet persisted
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const scrollRef = useRef(null);

  const serverMessages = convo?.messages?.length ? convo.messages : [WELCOME];
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
      const res = await base44.functions.invoke("agent", { input: content });
      const data = res?.data || {};
      // the server persisted the user msg + reply; refetch so history is authoritative
      await refetchConvo();
      setPending([]);
      if (data.profile) {
        setDraft(data.profile);
        // Save without navigating away — Results/Compare/Map/PriorityBoard recompute live.
        // The agent always returns the full accumulated profile, so edits persist on every turn.
        await saveProfile.mutateAsync({
          audience: data.profile.audience || data.audience || "b2c",
          persona: data.profile.persona,
          priorities: data.profile.priorities || [],
          hard_filters: data.profile.hard_filters || [],
          raw_input_text: data.profile.summary || content,
          confirmed: false
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
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          </div>
        )}
        {draft?.priorities?.length > 0 && (
          <div className="rounded-xl border bg-card p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Detected priorities</p>
            <div className="flex flex-wrap gap-1.5">
              {draft.priorities.slice().sort((a, b) => a.rank - b.rank).map((p) => {
                const cat = CATEGORIES.find((c) => c.key === p.category_key);
                return cat ? (
                  <span key={p.category_key} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                    <CategoryIcon categoryKey={p.category_key} className="h-3 w-3" />
                    {cat.name}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

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