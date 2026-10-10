import { Link } from "react-router-dom";
import { useSavedComparisons, useDeleteComparison } from "@/lib/useSavedComparisons";
import { useDistricts, useBarris } from "@/lib/useAreas";
import { Bookmark, Trash2, ChevronRight, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SavedComparisons() {
  const { data: items = [], isLoading } = useSavedComparisons();
  const del = useDeleteComparison();
  const districts = useDistricts();
  const barris = useBarris();

  function namesFor(sc) {
    const src = sc.area_type === "district" ? districts.data : barris.data;
    return (sc.area_ids || []).map((id) => src?.find((a) => a.id === id)?.name).filter(Boolean);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Bookmark className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Saved comparisons</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Jump back into your past research.</p>

      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <GitCompareArrows className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No saved comparisons yet.</p>
          <Button asChild className="mt-4"><Link to="/compare">Compare areas</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((sc) => {
            const names = namesFor(sc);
            const url = `/compare?type=${sc.area_type}&ids=${(sc.area_ids || []).join(",")}`;
            return (
              <div key={sc.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold truncate">{sc.label || names.join(" vs ")}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{sc.area_type === "district" ? "Districts" : "Barris"} · {names.length} areas</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {names.map((n) => <span key={n} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">{n}</span>)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button size="sm" variant="outline" asChild><Link to={url}>Open <ChevronRight className="h-3.5 w-3.5" /></Link></Button>
                    <button onClick={() => del.mutate(sc.id)} className="text-muted-foreground hover:text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}