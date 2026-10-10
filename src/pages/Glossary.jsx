import { CATEGORIES, INDICATORS } from "@/lib/categories";
import { isStale } from "@/lib/scoring";
import CategoryIcon from "@/components/CategoryIcon";
import { BookOpen, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export default function Glossary() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Glossary</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">What each category and indicator means in the scoring engine, and whether higher or lower is better.</p>

      <div className="space-y-5">
        {CATEGORIES.map((cat) => {
          const inds = INDICATORS.filter((i) => i.category_key === cat.key);
          return (
            <div key={cat.key} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted"><CategoryIcon categoryKey={cat.key} className="h-4 w-4" /></span>
                <h2 className="font-semibold">{cat.name}</h2>
                {(cat.modes || []).length === 1 && <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Business</span>}
                <span className="ml-auto text-xs text-muted-foreground">{inds.length} indicator{inds.length !== 1 ? "s" : ""}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{cat.description}</p>
              <div className="space-y-2">
                {inds.map((ind) => (
                  <div key={ind.name} className="rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{ind.name}</span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-muted">
                        {ind.direction === "positive" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {ind.direction === "positive" ? "Higher is better" : "Lower is better"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{ind.description}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>Unit: {ind.unit}</span>
                      <span>· Source: {ind.source_dataset}</span>
                      {ind.year && <span>· Year: {ind.year}</span>}
                      {ind.external && <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3 w-3" /> External — coming soon</span>}
                      {!ind.external && isStale(ind.last_updated) && <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3 w-3" /> Data older than 3 years</span>}
                    </div>
                  </div>
                ))}
                {inds.length === 0 && <p className="text-xs text-muted-foreground">No indicators defined yet.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}