import { Link } from "react-router-dom";
import { useProfile } from "@/lib/useProfile";
import { Button } from "@/components/ui/button";
import { Sparkles, Shield, SlidersHorizontal, Bot } from "lucide-react";

export default function MyProfile() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-lg font-semibold mb-4">My profile</h1>

      {!profile?.persona ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <Sparkles className="h-7 w-7 mx-auto text-primary mb-2" />
          <p className="text-muted-foreground">You haven't built a profile yet.</p>
          <Button asChild className="mt-3"><Link to="/agent"><Sparkles className="h-4 w-4" /> Start with the agent</Link></Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">Persona</div>
            <div className="text-lg font-semibold">{profile.persona}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-muted px-2.5 py-1">{profile.audience === "b2b" ? "Business" : "Personal"}</span>
              {profile.raw_input_text && <span className="rounded-full bg-muted px-2.5 py-1 max-w-full truncate">{profile.raw_input_text}</span>}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Hard filters</div>
            {(profile.hard_filters || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hard filters set.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.hard_filters.map((f, i) => (
                  <span key={i} className={`rounded-full border px-2.5 py-1 text-xs ${f.value ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700"}`}>{f.value ? "Must" : "No"}: {f.label}</span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/agent"><Bot className="h-4 w-4" /> Update with agent</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/priorities"><SlidersHorizontal className="h-4 w-4" /> Adjust priorities</Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}