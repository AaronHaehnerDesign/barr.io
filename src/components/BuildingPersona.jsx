import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useBarris } from "@/lib/useAreas";
import { useProfile } from "@/lib/useProfile";
import { rankAreas } from "@/lib/rankAreas";

// Full-screen transition: scans every barrio, ticking each one off, then
// reveals the user's best-match barrio before routing to the dashboard.
export default function BuildingPersona() {
  const { data: barris } = useBarris();
  const { data: profile } = useProfile();
  const ranked = useMemo(() => rankAreas(barris, profile), [barris, profile]);
  const [i, setI] = useState(0);
  const total = ranked.length;
  const done = total > 0 && i >= total;

  useEffect(() => {
    if (!total || done) return;
    const t = setTimeout(() => setI((n) => n + 1), Math.max(25, 2600 / total));
    return () => clearTimeout(t);
  }, [i, total, done]);

  const current = ranked.length ? [...ranked].sort((a, b) => a.name.localeCompare(b.name))[Math.min(i, total - 1)] : null;
  const best = ranked[0];

  return (
    <div className="flex flex-col items-center text-center px-6">
      <div className="relative mb-6 grid h-24 w-24 place-items-center">
        <motion.span className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
        <motion.span
          className="relative grid h-20 w-20 place-items-center rounded-full bg-emerald-600 text-white shadow-lg"
          animate={done ? { scale: [0.8, 1.15, 1] } : { rotate: 360 }}
          transition={done ? { duration: 0.5 } : { duration: 2, repeat: Infinity, ease: "linear" }}
        >
          {done ? (
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="M5 12l5 5L20 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
            </svg>
          ) : (
            <span className="h-10 w-10 rounded-full border-4 border-white/30 border-t-white" />
          )}
        </motion.span>
      </div>

      {done && best ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Your best match</p>
          <h2 className="mt-1 font-heading text-4xl">{best.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{best.match_score}% match · {best.district_name}</p>
        </motion.div>
      ) : (
        <>
          <h2 className="text-2xl font-semibold tracking-tight">Analysing all {total || 73} barrios</h2>
          <div className="mt-4 h-7">
            <AnimatePresence mode="wait">
              {current && (
                <motion.span key={current.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.08 }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-emerald-600" /> {current.name}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{Math.min(i, total)} / {total} checked</p>
        </>
      )}
    </div>
  );
}