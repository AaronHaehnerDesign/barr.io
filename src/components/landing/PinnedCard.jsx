import { scoreColor } from "@/lib/scoring";

function Pin() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 45" className="pointer-events-none absolute right-0 top-0 z-10 h-11 w-[1.4375rem] translate-x-[10%] -translate-y-[40%] rotate-[25.5deg]">
      <line x1="12" y1="20" x2="12" y2="44" stroke="#a8a167" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="11" r="10" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
      <circle cx="8.5" cy="7.5" r="3" fill="#6ee7b7" />
    </svg>
  );
}

export default function PinnedCard({ tag, area, score, rows, className = "" }) {
  return (
    <div className={`relative w-full rounded-[1.5rem] bg-muted px-2 pb-2 md:rounded-[1.75rem] lg:rounded-[2rem] ${className}`}>
      <div className="p-3 md:p-4 text-lg md:text-xl font-semibold leading-normal">{tag}</div>
      <div className="relative overflow-hidden rounded-2xl bg-background md:rounded-[1.25rem] lg:rounded-[1.5rem]">
        <div className="relative pt-[111%]">
          <div className="absolute inset-0 flex flex-col p-5 text-left">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Your match</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{area}</p>
            <p className="mt-4 text-6xl font-semibold tracking-tighter" style={{ color: scoreColor(score) }}>{score.toFixed(1)}</p>
            <div className="mt-auto space-y-3">
              {rows.map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">{r.label}</span><span className="font-semibold">{r.value}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${r.value * 10}%`, background: scoreColor(r.value) }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Pin />
    </div>
  );
}