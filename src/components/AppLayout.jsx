import { Link, Outlet, useNavigate } from "react-router-dom";
import { useProfile } from "@/lib/useProfile";
import { base44 } from "@/api/base44Client";
import { Map, ListOrdered, GitCompareArrows, User, Sparkles, LogOut, Home } from "lucide-react";

const NAV = [
  { to: "/results", label: "Results", icon: ListOrdered },
  { to: "/map", label: "Map", icon: Map },
  { to: "/compare", label: "Compare", icon: GitCompareArrows },
  { to: "/profile", label: "My Profile", icon: User }
];

export default function AppLayout() {
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  async function logout() {
    await base44.auth.logout();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/results" className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-4 w-4" />
            </span>
            <span className="tracking-tight">BarrioMatch</span>
            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">sample data</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(n => (
              <Link key={n.to} to={n.to} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {profile?.persona ? (
              <Link to="/onboarding" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
                <Sparkles className="h-4 w-4 text-primary" /> {profile.persona}
              </Link>
            ) : (
              <Link to="/onboarding" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                <Sparkles className="h-4 w-4" /> Start
              </Link>
            )}
            <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-md hover:bg-muted text-muted-foreground" title="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="md:hidden sticky bottom-0 z-40 border-t bg-background">
        <div className="grid grid-cols-4">
          {NAV.map(n => (
            <Link key={n.to} to={n.to} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground hover:text-foreground">
              <n.icon className="h-5 w-5" /> {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}