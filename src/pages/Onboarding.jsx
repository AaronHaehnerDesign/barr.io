import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useProfile, useSaveProfile } from "@/lib/useProfile";
import { useConversation } from "@/lib/useConversation";
import VoiceRecorder from "@/components/VoiceRecorder";
import { CATEGORIES } from "@/lib/categories";
import CategoryIcon from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, Loader2, ArrowRight } from "lucide-react";

const WELCOME = { role: "assistant", content: "Hi! I'm your BarrioMatch agent. Tell me what you're looking for — a home for you and your household, or a location for your business. Describe your situation, budget, and what matters to you, and I'll guide you from there. You can type or tap the mic to speak." };

export default function Onboarding() {
  const navigate = useNavigate();
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
      if (data.ready && data.profile) {
        setDraft(data.profile);
        await saveProfile.mutateAsync({
          audience: data.profile.audience || data.audience || "b2c",
          persona: data.profile.persona,
          priorities: data.profile.priorities || [],
          hard_filters: data.profile.hard_filters || [],
          raw_input_text: data.profile.summary || content,
          confirmed: false
        });
        setTimeout(() => navigate("/priorities"), 600);
      }
    } catch (e) {
      setPending((p) => [...p, { role: "assistant", content: "Sorry, I hit a snag. Try sending that again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Agent</h1>
        {draft?.persona && <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{draft.persona}</span>}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          </div>
        )}
        {draft?.priorities?.length > 0 && (
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Detected priorities</p>
            <div className="flex flex-wrap gap-1.5">
              {draft.priorities.sort((a,b)=>a.rank-b.rank).map(p => {
                const cat = CATEGORIES.find(c => c.key === p.category_key);
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

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex items-center gap-2">
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

      {profile?.persona && (
        <Button variant="ghost" className="mt-2 self-end text-xs" onClick={() => navigate("/priorities")}>
          Go to priority board <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}