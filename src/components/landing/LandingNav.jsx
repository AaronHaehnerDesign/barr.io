import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Map } from "lucide-react";

const LINKS = [
  { label: "Home", to: "/" },
  { label: "How it works", to: "#how" },
  { label: "Map", to: "/map" },
  { label: "Compare", to: "/compare" },
  { label: "Data sources", to: "/data-sources" },
  { label: "Log in", to: "/login" },
];

function NavLink({ item, className, onClick, children }) {
  if (item.to.startsWith("#")) return <a href={item.to} className={className} onClick={onClick}>{children}</a>;
  return <Link to={item.to} className={className} onClick={onClick}>{children}</Link>;
}

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (open) overlayRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape" && open) { setOpen(false); toggleRef.current?.focus(); } };
    const mq = window.matchMedia("(min-width: 992px)");
    const onMq = (e) => e.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => { document.removeEventListener("keydown", onKey); mq.removeEventListener("change", onMq); document.documentElement.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="relative z-[60] px-4 py-4 md:px-10 lg:px-14">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="barr.io, home" className={`flex items-center gap-2 font-semibold tracking-tight ${open ? "text-background" : ""}`}>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-600 text-white"><Map className="h-4 w-4" /></span>
            barr.io
          </Link>
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-5">
            {LINKS.map((l) => (
              <NavLink key={l.label} item={l} className="p-3 text-muted-foreground transition-colors hover:text-foreground">{l.label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/register" className={`hidden md:flex h-10 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[0.93] ${open ? "invisible" : ""}`}>Start now</Link>
            <button ref={toggleRef} type="button" aria-label="Menu" aria-expanded={open} aria-controls="nav-overlay" onClick={() => setOpen(!open)}
              className={`lg:hidden relative h-10 w-10 rounded-md transition-colors ${open ? "bg-emerald-500" : "bg-primary"}`}>
              <span className={`absolute inset-x-[15%] top-1/2 h-[2px] transition-transform duration-300 ${open ? "bg-primary rotate-45" : "bg-primary-foreground -translate-y-[7px]"}`} />
              <span className={`absolute inset-x-[15%] top-1/2 h-[2px] bg-primary-foreground transition-transform duration-300 ${open ? "scale-x-0" : ""}`} />
              <span className={`absolute inset-x-[15%] top-1/2 h-[2px] transition-transform duration-300 ${open ? "bg-primary -rotate-45" : "bg-primary-foreground translate-y-[7px]"}`} />
            </button>
          </div>
        </div>
      </header>

      <div id="nav-overlay" ref={overlayRef} role="dialog" aria-modal="true" aria-label="Menu" tabIndex={-1} inert={open ? undefined : ""}
        className={`fixed inset-0 z-50 overflow-y-auto bg-primary text-primary-foreground outline-none transition-opacity duration-400 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="flex min-h-full flex-col px-4 pb-8 pt-28 md:px-10">
          <nav aria-label="Mobile" className="my-auto">
            <ul className="border-t border-white/10">
              {LINKS.map((l, i) => (
                <li key={l.label} style={{ transitionDelay: open ? `${120 + i * 50}ms` : "0ms" }}
                  className={`border-b border-white/10 transition-all duration-500 ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                  <NavLink item={l} onClick={() => setOpen(false)} className="flex items-baseline gap-4 py-3.5 transition-colors hover:text-emerald-400">
                    <span aria-hidden="true" className="w-8 text-sm font-medium text-emerald-400">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[clamp(2rem,9vw,3rem)] font-semibold leading-tight tracking-tighter">{l.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <Link to="/register" onClick={() => setOpen(false)} className="mt-10 flex h-12 items-center justify-center rounded-lg bg-emerald-500 text-sm font-semibold text-primary">Start now</Link>
        </div>
      </div>
    </>
  );
}