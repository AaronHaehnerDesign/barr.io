import { useState, useEffect, useCallback } from "react";

// Shared, audience-scoped workplace location persisted in localStorage so the
// Map and Results pages read and update the same pin.
export function useWorkplace(audience) {
  const key = `barriomatch:workplace:${audience || "b2c"}`;
  const [workplace, setWorkplace] = useState(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setWorkplace(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [key]);
  const update = useCallback((pos) => {
    setWorkplace(pos);
    try {
      if (pos) localStorage.setItem(key, JSON.stringify(pos));
      else localStorage.removeItem(key);
    } catch { /* ignore */ }
  }, [key]);
  return { workplace, setWorkplace: update };
}