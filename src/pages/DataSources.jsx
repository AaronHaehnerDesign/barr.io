import { CATEGORIES, INDICATORS } from "@/lib/categories";
import CategoryIcon from "@/components/CategoryIcon";
import { Database, TrendingUp, TrendingDown, ExternalLink, AlertTriangle, Scale } from "lucide-react";

const PORTAL = "https://opendata-ajuntament.barcelona.cat";

const STEPS = [
  {
    title: "1. Collect official indicators",
    body: "Every neighbourhood is described by raw indicators pulled from Barcelona's Open Data BCN portal — cadastral values, metro stations, air quality, schools, noise, parks and more. Each one belongs to one of 13 scoring categories."
  },
  {
    title: "2. Normalise to a 1–10 score",
    body: "Each raw value is converted to a 1–10 score where 10 is always better for the resident. For 'higher is better' indicators (e.g. schools) a higher raw value scores higher; for 'lower is better' ones (e.g. noise, accidents) the scale is flipped so lower raw values still score higher. This keeps every category comparable."
  },
  {
    title: "3. Roll up to a category score",
    body: "A category's score is the average of its indicator scores. So 'Transport & Walkability' combines metro, bus, bike lanes and pedestrian streets into one 1–10 rating."
  },
  {
    title: "4. Weight to your priorities",
    body: "Your priority weights (0–100 per category) turn the category scores into a personal match: a weighted average scaled to 0–100%. The more important a category is to you, the more it moves your match score."
  },
  {
    title: "5. Persona adjustments",
    body: "Some personas read a category differently. An Investor sees rising prices as opportunity, a Retiree sees nightlife as noise. Personas flip the polarity of those categories before scoring."
  },
  {
    title: "6. Freshness & gaps",
    body: "Indicators older than three years carry a freshness warning. A few indicators (rent burden, crime, employment) are not yet in Open Data BCN — they show as 'coming soon' and are not scored until added."
  }
];

export default function DataSources() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Database className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Data sources</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Every score in BarrioMatch is built from official city data. All datasets come from{" "}
        <a href={PORTAL} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
          Open Data BCN <ExternalLink className="h-3 w-3" />
        </a>, the open-data portal of Barcelona City Council.
      </p>

      <div className="rounded-xl border bg-card p-4 mb-6">
        <h2 className="flex items-center gap-2 font-semibold mb-3"><Scale className="h-4 w-4 text-primary" /> How the scoring works</h2>
        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li key={s.title} className="text-sm">
              <div className="font-medium">{s.title}</div>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Scores use a consistent colour scale across the app: <span className="font-medium text-rose-600">red (1)</span> → yellow (5) → <span className="font-medium text-emerald-600">green (10)</span>.
        </p>
      </div>

      <h2 className="font-semibold mb-2">Datasets by category</h2>
      <div className="space-y-4">
        {CATEGORIES.map((cat) => {
          const inds = INDICATORS.filter((i) => i.category_key === cat.key);
          return (
            <div key={cat.key} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted"><CategoryIcon categoryKey={cat.key} className="h-4 w-4" /></span>
                <h3 className="font-semibold">{cat.name}</h3>
                <span className="ml-auto text-xs text-muted-foreground">{inds.length} indicator{inds.length !== 1 ? "s" : ""}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{cat.description}</p>
              <div className="space-y-2">
                {inds.map((ind) => (
                  <div key={ind.name} className="rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{ind.name}</span>
                      {ind.external ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700"><AlertTriangle className="h-3 w-3" /> coming soon</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                          {ind.direction === "positive" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {ind.direction === "positive" ? "Higher is better" : "Lower is better"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{ind.description}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Database className="h-3 w-3" /> dataset: <code className="bg-muted rounded px-1">{ind.source_dataset}</code></span>
                      <span>unit: {ind.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}