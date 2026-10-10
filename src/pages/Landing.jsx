import { Link } from "react-router-dom";
import { Map, Sparkles, GitCompareArrows, Footprints } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <LandingHero />

      <section id="how" className="scroll-mt-8">
        <div className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
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
        </div>
      </footer>
    </div>
  );
}