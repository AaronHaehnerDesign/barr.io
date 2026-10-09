import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useProfile, useSaveProfile } from "@/lib/useProfile";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/categories";
import CategoryIcon from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, Trash2, GitCompareArrows, Shield, Clock } from "lucide-react";

export default function MyProfile() {
  const { data: profile, isLoading } = useProfile();
  const saveProfile = useSaveProfile();
  const qc = useQueryClient();
  const [items, setItems] = useState(null);

  const comparisons = useQuery({
    queryKey: ["savedComparisons"],
    queryFn: async () => {
      const { items } = await base44.entities.SavedComparison.filter({}, { sort: "-created_date", limit: 50 });
      return items;
    }
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  const list = items ?? profile?.priorities ?? [];

  function setWeight(idx, w) {
    const next = Array.from(list);
    next[idx] = { ...next[idx], weight: w };
    setItems(next);
  }
  async function save() {
    await saveProfile.mutateAsync({ ...profile, priorities: list, confirmed: true });
    setItems(null);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-lg font-semibold mb-4">My profile</h1>

      {!profile?.persona ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <Sparkles className="h-7 w-7 mx-auto text-primary mb-2" />
          <p className="text-muted-foreground">You haven't built a profile yet.</p>
          <Button asChild className="mt-3"><Link to="/onboarding"><Sparkles className="h-4 w-4" /> Start onboarding</Link></Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border bg-card p-4 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Persona</div>
              <div className="text-lg font-semibold">{profile.persona}</div>
            </div>
            <Button variant="outline" size="sm" asChild><Link to="/onboarding"><Sparkles className="h-4 w-4" /> Update with chat</Link></Button>
          </div>

          {profile.hard_filters?.length > 0 && (
            <div className="rounded-xl border bg-card p-4 mb-4">
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Hard filters</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.hard_filters.map((f, i) => (
                  <span key={i} className="rounded-full border px-2.5 py-1 text-xs">{f.value ? "Must" : "No"}: {f.label}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Priorities</h2>
            <Button size="sm" onClick={save} disabled={saveProfile.isPending || !items}><Save className="h-3.5 w-3.5" /> Save</Button>
          </div>
          <div className="space-y-2 mb-6">
            {list.length === 0 && <p className="text-sm text-muted-foreground">No priorities yet.</p>}
            {list.sort((a, b) => a.rank - b.rank).map((p, idx) => {
              const cat = CATEGORY_MAP[p.category_key];
              if (!cat) return null;
              return (
                <div key={p.category_key} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{p.rank}</span>
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted"><CategoryIcon categoryKey={cat.key} className="h-4 w-4" /></span>
                  <span className="text-sm font-medium flex-1 truncate">{cat.name}</span>
                  <input type="range" min={0} max={100} value={p.weight} onChange={(e) => setWeight(idx, +e.target.value)} className="w-28 accent-primary" />
                  <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{p.weight}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-1.5"><GitCompareArrows className="h-4 w-4" /> Saved comparisons</h2>
          </div>
          <div className="space-y-2">
            {(comparisons.data || []).map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg border bg-card p-3">
                <span className="text-sm flex-1 truncate">{c.label}</span>
                <Button variant="ghost" size="sm" asChild><Link to="/compare">Open</Link></Button>
                <button onClick={async () => { await base44.entities.SavedComparison.delete(c.id); qc.invalidateQueries({ queryKey: ["savedComparisons"] }); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {(comparisons.data || []).length === 0 && <p className="text-sm text-muted-foreground">No saved comparisons yet.</p>}
          </div>

          <div className="mt-6 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Indicators with data older than 3 years show a freshness warning on the detail page (e.g. noise maps 2017).
          </div>
        </>
      )}
    </div>
  );
}