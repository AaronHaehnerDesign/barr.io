import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Map, ListOrdered, GitCompareArrows, User, LogOut, Home, SlidersHorizontal, Bot, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import AgentSidebar from "@/components/AgentSidebar";

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
  const [agentOpen, setAgentOpen] = useState(true); // desktop right sidebar
  const [mobileAgent, setMobileAgent] = useState(false); // mobile drawer

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
          <div className="flex items-center gap-1">
            <button onClick={() => setMobileAgent(true)} className="grid h-9 w-9 place-items-center rounded-md hover:bg-muted text-primary" title="Open agent">
              <Bot className="h-5 w-5" />
            </button>
            <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-md hover:bg-muted text-muted-foreground" title="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className={`flex-1 min-h-screen md:ml-60 transition-[margin] duration-200 ${agentOpen ? "lg:mr-[380px]" : ""}`}>
        <Outlet />
      </main>

      {/* Desktop right agent sidebar */}
      <aside className={`hidden lg:flex flex-col fixed top-0 right-0 bottom-0 w-[380px] border-l bg-background z-30 transition-transform duration-200 ${agentOpen ? "translate-x-0" : "translate-x-full"}`}>
        <AgentSidebar className="h-full" />
      </aside>
      <button
        onClick={() => setAgentOpen((v) => !v)}
        className="hidden lg:grid place-items-center fixed top-4 z-40 h-8 w-8 rounded-l-md border border-r-0 bg-background shadow-sm hover:bg-muted text-muted-foreground transition-all"
        style={{ right: agentOpen ? "380px" : "0" }}
        title={agentOpen ? "Hide agent" : "Show agent"}
      >
        {agentOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
      </button>

      {/* Mobile agent overlay */}
      {mobileAgent && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-3">
            <span className="text-sm font-semibold flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> Agent</span>
            <button onClick={() => setMobileAgent(false)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted text-muted-foreground" title="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <AgentSidebar className="flex-1 min-h-0" />
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className={`md:hidden sticky bottom-0 z-40 border-t bg-background ${mobileAgent ? "hidden" : ""}`}>
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