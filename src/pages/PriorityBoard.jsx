import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile, useSaveProfile } from "@/lib/useProfile";
import { CATEGORIES, CATEGORY_MAP, categoriesForMode } from "@/lib/categories";
import CategoryIcon from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { X, Check, Sparkles, Shield } from "lucide-react";

const HARD_FILTER_SUGGESTIONS = [
  { type: "metro_500", label: "Metro within 500 m", value: true },
  { type: "school_1km", label: "School within 1 km", value: true },
  { type: "green_space", label: "Green space nearby", value: true },
  { type: "low_noise", label: "Low-noise area", value: true },
  { type: "beach", label: "Beach access", value: true },
  { type: "pedestrian", label: "Pedestrian / low-traffic street", value: true },
  { type: "parking", label: "Parking available", value: true },
  { type: "market", label: "Market / supermarket nearby", value: true },
  { type: "no_tourist_flats", label: "Tourist-flat hotspot", value: false }
];

// Order priorities by weight (highest first) and assign rank by position.
function ranked(arr) {
  return [...arr]
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

export default function PriorityBoard() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const saveProfile = useSaveProfile();
  const [items, setItems] = useState(() => profile?.priorities || []);
  const [saved, setSaved] = useState(false);
  const [filters, setFilters] = useState([]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading your profile…</div>;
  if (!profile) return <div className="p-8 text-center"><p className="text-muted-foreground mb-3">Start the onboarding chat first.</p><Button onClick={() => navigate("/onboarding")}><Sparkles className="h-4 w-4" /> Start onboarding</Button></div>;

  const cats = categoriesForMode(profile.audience || "b2c");
  const list = items.length ? items : (profile.priorities || []);
  // The board always reflects the chosen weights: highest weight on top.
  const ordered = ranked(list);

  function setWeight(key, w) {
    const base = (items.length ? items : profile.priorities || []).map((p) =>
      p.category_key === key ? { ...p, weight: w } : p
    );
    setItems(ranked(base));
  }

  function remove(key) {
    const base = (items.length ? items : profile.priorities || []).filter((p) => p.category_key !== key);
    setItems(ranked(base));
  }

  const filterList = filters.length ? filters : (profile?.hard_filters || []);
  function addFilter(s) {
    if (filterList.some((f) => f.type === s.type)) return;
    setFilters([...filterList, { label: s.label, type: s.type, value: s.value }]);
  }
  function removeFilter(i) {
    setFilters(filterList.filter((_, idx) => idx !== i));
  }
  function toggleFilter(i) {
    const next = Array.from(filterList);
    next[i] = { ...next[i], value: !next[i].value };
    setFilters(next);
  }
  const suggestions = HARD_FILTER_SUGGESTIONS.filter((s) => !filterList.some((f) => f.type === s.type));

  function addCategory(key) {
    if (list.some((p) => p.category_key === key)) return;
    setItems(ranked([...list, { category_key: key, rank: list.length + 1, weight: 50 }]));
  }

  async function confirm() {
    const finalItems = ranked(list);
    await saveProfile.mutateAsync({ ...profile, priorities: finalItems, hard_filters: filterList, confirmed: true });
    setSaved(true);
    setTimeout(() => navigate("/results"), 400);
  }

  const usedKeys = ordered.map((p) => p.category_key);
  const unused = cats.filter((c) => !usedKeys.includes(c.key));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Your priority board</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Set how much each category matters (0–100). The board re-orders by weight as you adjust — confirm to save.</p>
      {profile.persona && <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Persona: {profile.persona}</div>}

      <div className="space-y-2">
        {ordered.map((p, idx) => {
          const cat = CATEGORY_MAP[p.category_key];
          if (!cat) return null;
          return (
            <div key={p.category_key} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
              <div className="flex w-9 flex-col items-center">
                <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">{p.weight}%</span>
              </div>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted"><CategoryIcon categoryKey={cat.key} className="h-4 w-4" /></span>
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">{cat.name}</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <input type="range" min={0} max={100} value={p.weight} onChange={(e) => setWeight(p.category_key, +e.target.value)} className="flex-1 accent-primary" />
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{p.weight}</span>
                </div>
              </div>
              <button onClick={() => remove(p.category_key)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>

      {unused.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium text-muted-foreground mb-2">Add a category</p>
          <div className="flex flex-wrap gap-1.5">
            {unused.map((c) => (
              <button key={c.key} onClick={() => addCategory(c.key)} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-muted">
                <CategoryIcon categoryKey={c.key} className="h-3 w-3" /> {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Hard filters</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Non-negotiable must-haves or must-avoids. Tap "Must"/"No" to toggle, remove with the ×.</p>
        {filterList.length > 0 && (
          <div className="space-y-2 mb-3">
            {filterList.map((f, i) => (
              <div key={f.type || i} className="flex items-center gap-2 rounded-xl border bg-card p-2.5 shadow-sm">
                <button onClick={() => toggleFilter(i)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${f.value ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{f.value ? "Must" : "No"}</button>
                <span className="text-sm flex-1 truncate">{f.label}</span>
                <button onClick={() => removeFilter(i)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
        {suggestions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Recommended filters</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s.type} onClick={() => addFilter(s)} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-muted">
                  <Shield className="h-3 w-3" /> {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={confirm} disabled={saveProfile.isPending || ordered.length < 3} className="gap-1.5">
          {saved ? <><Check className="h-4 w-4" /> Saved</> : <>Confirm profile</>}
        </Button>
        <Button variant="ghost" onClick={() => navigate("/onboarding")}>Back to chat</Button>
        {ordered.length < 3 && <span className="text-xs text-muted-foreground">Pick at least 3 priorities.</span>}
      </div>
    </div>
  );
}