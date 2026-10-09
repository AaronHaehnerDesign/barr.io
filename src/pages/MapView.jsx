import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useProfile } from "@/lib/useProfile";
import { useDistricts, useBarris } from "@/lib/useAreas";
import { matchScore, scoreColor, scoreLabel, categoryScoresFromArea } from "@/lib/scoring";
import { CATEGORIES, PERSONA_FLIPS } from "@/lib/categories";
import { audienceConfig } from "@/lib/audience";

export default function MapView() {
  const { data: profile } = useProfile();
  const districts = useDistricts();
  const barris = useBarris();
  const [level, setLevel] = useState("district");
  const [metric, setMetric] = useState("match");

  const ac = audienceConfig(profile);

  const weights = useMemo(() => {
    const o = {};
    (profile?.priorities || []).forEach((p) => (o[p.category_key] = p.weight));
    return o;
  }, [profile]);
  const flip = (profile?.persona && PERSONA_FLIPS[profile.persona]) || {};

  // Derive per-category scores from each area's indicators (not the sparse
  // category_scores field), so every metric is colourable on the heatmap.
  const derived = useMemo(() => {
    const map = new Map();
    const areas = level === "district" ? (districts.data || []) : (barris.data || []);
    areas.forEach((a) => map.set(a.id, categoryScoresFromArea(a)));
    return map;
  }, [level, districts.data, barris.data]);

  function catScore(area, key) {
    const scores = derived.get(area.id) || {};
    let s = scores[key];
    if (s == null) return null;
    if (flip[key] === "negative") s = 11 - s;
    return Math.max(1, Math.min(10, Math.round(s * 10) / 10));
  }
  function matchOf(area) {
    const cs = {};
    CATEGORIES.forEach((c) => (cs[c.key] = catScore(area, c.key)));
    return matchScore(cs, weights);
  }
  // a 1-10 value for coloring:
  function value10(area) {
    if (metric === "match") return (matchOf(area) / 10) + 1;
    return catScore(area, metric);
  }

  const loading = level === "district" ? districts.isLoading : barris.isLoading;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h1 className="text-lg font-semibold">{ac.mapTitle}</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex rounded-lg border p-0.5 bg-muted">
            <button onClick={() => setLevel("district")} className={`px-3 py-1 text-xs rounded-md ${level === "district" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Districts</button>
            <button onClick={() => setLevel("barri")} className={`px-3 py-1 text-xs rounded-md ${level === "barri" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Barris</button>
          </div>
          <select value={metric} onChange={(e) => setMetric(e.target.value)} className="rounded-lg border bg-background px-2 py-1.5 text-xs">
            <option value="match">{ac.mapMetricLabel}</option>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <span>Low</span>
        <div className="h-2 flex-1 rounded-full" style={{ background: "linear-gradient(to right,#dc463c,#f5d23c,#28aa50)" }} />
        <span>High</span>
      </div>

      <div className="rounded-xl border overflow-hidden h-[70vh]">
        <MapContainer center={[41.395, 2.16]} zoom={12} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
            maxZoom={19}
          />
          {(!loading && level === "district" && (districts.data || []).map((d) => {
            const v = value10(d);
            const ms = matchOf(d);
            const pos = d.geometry?.coordinates?.[0]?.map(([lon, lat]) => [lat, lon]) || [];
            const c = v == null ? "#ccc" : scoreColor(v);
            return (
              <Polygon key={d.id} positions={pos} pathOptions={{ color: "#1f2937", weight: 1, fillColor: c, fillOpacity: 0.75 }}>
                <Tooltip sticky>{d.name}{metric === "match" ? ` — ${ms}% match` : v != null ? ` — ${v.toFixed(1)}/10 (${scoreLabel(v)})` : " — n/a"}</Tooltip>
              </Polygon>
            );
          }))}
          {(!loading && level === "barri" && (barris.data || []).map((b) => {
            const v = value10(b);
            const ms = matchOf(b);
            const c = v == null ? "#ccc" : scoreColor(v);
            return (
              <CircleMarker key={b.id} center={[b.centroid.lat, b.centroid.lon]} radius={9} pathOptions={{ color: "#1f2937", weight: 0.5, fillColor: c, fillOpacity: 0.85 }}>
                <Tooltip>{b.name} ({b.district_name}){metric === "match" ? ` — ${ms}%` : v != null ? ` — ${v.toFixed(1)}/10` : " — n/a"}</Tooltip>
              </CircleMarker>
            );
          }))}
        </MapContainer>
      </div>
      {loading && <p className="text-center text-sm text-muted-foreground mt-3">Loading map data…</p>}
    </div>
  );
}