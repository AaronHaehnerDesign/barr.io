import { useActiveAudience } from "@/lib/useActiveAudience";
import { Home, Building2 } from "lucide-react";

// Explicit Personal / Business mode toggle. Drives which profile, conversation
// and indicators the app shows. `variant="card"` is the larger chooser used in
// onboarding; `variant="compact"` is the sidebar/header switch.
export default function ModeSwitcher({ variant = "compact", className = "" }) {
  const { audience, setAudience } = useActiveAudience();

  if (variant === "card") {
    return (
      <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
        <ModeCard
          active={audience === "b2c"}
          onClick={() => setAudience("b2c")}
          icon={Home}
          title="Personal"
          desc="Find a home or neighbourhood for you and your household."
        />
        <ModeCard
          active={audience === "b2b"}
          onClick={() => setAudience("b2b")}
          icon={Building2}
          title="Business"
          desc="Find a location for your business — plus commercial, customer-access and operations data."
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex rounded-lg border p-0.5 bg-muted ${className}`}>
      <button
        onClick={() => setAudience("b2c")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${audience === "b2c" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Home className="h-3.5 w-3.5" /> Personal
      </button>
      <button
        onClick={() => setAudience("b2b")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${audience === "b2b" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Building2 className="h-3.5 w-3.5" /> Business
      </button>
    </div>
  );
}

function ModeCard({ active, onClick, icon: Icon, title, desc }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-colors ${active ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:bg-muted"}`}
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted"><Icon className="h-4 w-4" /></span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground leading-relaxed">{desc}</span>
    </button>
  );
}