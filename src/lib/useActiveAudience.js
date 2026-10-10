import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

// The active mode (Personal = b2c / Business = b2b) is an explicit, persistent
// user choice — separate from the profile, because each mode keeps its own
// profile. It survives reloads (localStorage) and a module-level store keeps
// every hook instance in sync without an extra provider.
const KEY = "barriomatch:activeAudience";
const VALID = ["b2c", "b2b"];

function readInitial() {
  try {
    const v = localStorage.getItem(KEY);
    if (VALID.includes(v)) return v;
  } catch { /* ignore */ }
  return "b2c";
}

let current = readInitial();
const listeners = new Set();
function emit() { listeners.forEach((l) => l(current)); }

export function getActiveAudience() {
  return current;
}

export function useActiveAudience() {
  const [audience, setAudienceState] = useState(current);
  const qc = useQueryClient();
  useEffect(() => {
    const l = (v) => setAudienceState(v);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  const setAudience = useCallback((next) => {
    const v = VALID.includes(next) ? next : "b2c";
    if (v === current) return;
    current = v;
    try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
    emit();
    // Re-read the profile + conversation for the newly active mode.
    qc.invalidateQueries({ queryKey: ["userprofile"] });
    qc.invalidateQueries({ queryKey: ["agentconversation"] });
  }, [qc]);
  return { audience, setAudience };
}