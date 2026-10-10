import { useMemo } from "react";
import { useProfile } from "./useProfile";
import { useDistricts, useBarris } from "./useAreas";

// Resolve the onboarding-captured work_locations (each {label, area_name}) to
// real {label, lat, lon} coordinates by matching area_name against the stored
// District/Barri names. Used by the Map and Results pages to drop pins and to
// compute commute proximity.
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const stripArticle = (s) => s.replace(/^(el|la|els|les|l')\s+/, "").trim();

export function useWorkplaces() {
  const { data: profile } = useProfile();
  const { data: districts } = useDistricts();
  const { data: barris } = useBarris();

  return useMemo(() => {
    const locs = profile?.work_locations || [];
    if (!locs.length) return [];
    const all = [
      ...(districts || []).map((d) => ({ name: d.name, centroid: d.centroid })),
      ...(barris || []).map((b) => ({ name: b.name, centroid: b.centroid })),
    ];
    const find = (areaName) => {
      if (!areaName) return null;
      const t = stripArticle(norm(areaName));
      return all.find((a) => {
        const n = stripArticle(norm(a.name));
        if (n.length < 4) return false;
        return n === t || t.includes(n) || n.includes(t);
      }) || null;
    };
    return locs
      .map((l) => {
        const exact = typeof l.lat === "number" && typeof l.lon === "number" && l.lat > 41.3 && l.lat < 41.5 && l.lon > 2.05 && l.lon < 2.25;
        const m = exact ? null : find(l.area_name);
        return { label: l.label || l.area_name || "Workplace", area_name: l.area_name, lat: exact ? l.lat : (m?.centroid?.lat ?? null), lon: exact ? l.lon : (m?.centroid?.lon ?? null) };
      })
      .filter((l) => l.lat != null && l.lon != null);
  }, [profile, districts, barris]);
}