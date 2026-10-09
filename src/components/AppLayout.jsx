import { Link, NavLink, Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Map, ListOrdered, GitCompareArrows, User, LogOut, Home, SlidersHorizontal, Bot } from "lucide-react";

const NAV = [
  { to: "/agent", label: "Agent", icon: Bot },
  { to: "/results", label: "Results", icon: ListOrdered },
  { to: "/map", label: "Map", icon: Map },
  { to: "/compare", label: "Compare", icon: GitCompareArrows },
  { to: "/priorities", label: "Priorities", icon: SlidersHorizontal }
];

const sideLinkClass = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
  }`;

export default function AppLayout() {
  async function logout() {
    await base44.auth.logout();
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r bg-background">
        <div className="flex items-center gap-2 h-14 px-4 border-b">
          <Link to="/results" className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-4 w-4" />
            </span>
            <span className="tracking-tight">BarrioMatch</span>
          </Link>
          <span className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">sample</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={sideLinkClass}>
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3 space-y-1">
          <NavLink to="/profile" className={sideLinkClass}>
            <User className="h-4 w-4" /> My Profile
          </NavLink>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="md:hidden sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to="/results" className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-4 w-4" />
            </span>
            <span className="tracking-tight">BarrioMatch</span>
          </Link>
          <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-md hover:bg-muted text-muted-foreground" title="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 md:ml-60 min-h-screen">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden sticky bottom-0 z-40 border-t bg-background">
        <div className="grid grid-cols-6">
          {[...NAV, { to: "/profile", label: "Profile", icon: User }].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? "text-foreground" : "text-muted-foreground"}`
              }
            >
              <n.icon className="h-5 w-5" /> {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}