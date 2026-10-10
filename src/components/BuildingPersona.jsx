import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

// Full-screen transition shown while the agent's profile is being confirmed
// and the user is routed to the dashboard.
export default function BuildingPersona() {
  return (
    <div className="flex flex-col items-center text-center px-6">
      <div className="relative mb-6">
        <motion.span
          className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="relative grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"
          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="h-9 w-9" />
        </motion.span>
      </div>
      <motion.h2
        className="text-2xl font-semibold tracking-tight"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        Building your persona now
      </motion.h2>
      <div className="mt-4 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -5, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
      <p className="mt-4 max-w-xs text-sm text-muted-foreground">Putting your priorities, budget and neighbourhood fit together.</p>
    </div>
  );
}