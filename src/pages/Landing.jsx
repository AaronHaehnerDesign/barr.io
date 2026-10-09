import { Link } from "react-router-dom";
import { Map, Sparkles, GitCompareArrows, Footprints } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="absolute top-0 inset-x-0 z-10">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Map className="h-4 w-4" />
            </span>
            BarrioMatch
          </span>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-medium px-3 py-1.5 hover:bg-muted rounded-md">Log in</Link>
            <Link to="/register" className="text-sm font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground">Sign up</Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-background to-background" />
        <div className="mx-auto max-w-6xl px-4 pt-32 pb-20 sm:pt-40 sm:pb-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Powered by Barcelona Open Data
            </span>
            <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
              Find your barrio in <span className="text-emerald-600">Barcelona</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Tell the AI agent what matters to you — budget, schools, parks, a quiet street, a metro stop. We score all 10 districts and 73 neighbourhoods across 13 categories and rank them by your personal fit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90">
                <Sparkles className="h-4 w-4" /> Find your barrio
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold hover:bg-muted">
                I already have an account
              </Link>
            </div>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Sparkles, t: "AI interview", d: "Describe your life in plain words — or a voice note. The agent builds your weighted priority profile." },
              { icon: Map, t: "Map-first scoring", d: "Every neighbourhood scored 1–10 across 13 categories, mapped as a red→green heatmap." },
              { icon: GitCompareArrows, t: "Compare side by side", d: "Stack 2–3 areas with radar charts and the underlying open-data indicators." }
            ].map(f => (
              <div key={f.t} className="rounded-xl border bg-card p-5 shadow-sm">
                <f.icon className="h-5 w-5 text-emerald-600" />
                <h3 className="mt-3 font-semibold">{f.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Footprints className="h-3.5 w-3.5" /> Built for Barcelona · 10 districts · 73 barris</span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 font-medium">sample data</span>
        </div>
      </footer>
    </div>
  );
}