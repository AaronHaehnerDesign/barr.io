import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useProfile } from "@/lib/useProfile";
import { useDistricts, useBarris } from "@/lib/useAreas";
import { matchScore, scoreColor, scoreLabel, categoryScoresFromArea } from "@/lib/scoring";
import { CATEGORIES, PERSONA_FLIPS } from "@/lib/categories";
import { audienceConfig } from "@/lib/audience";

// Fit the map tightly to the visible areas so there is no wasted space between
// districts / barris.
function FitBounds({ areas }) {
  const map = useMap();
  useEffect(() => {
    const pts = [];
    areas.forEach((a) => {
      const ring = a.geometry?.coordinates?.[0];
      if (ring && ring.length) ring.forEach(([lon, lat]) => pts.push([lat, lon]));
      else if (a.centroid) pts.push([a.centroid.lat, a.centroid.lon]);
    });
    if (pts.length < 2) return;
    const lats = pts.map((p) => p[0]);
    const lons = pts.map((p) => p[1]);
    const pad = 0.012;
    map.fitBounds(
      [[Math.min(...lats) - pad, Math.min(...lons) - pad], [Math.max(...lats) + pad, Math.max(...lons) + pad]],
      { animate: false }
    );
  }, [areas, map]);
  return null;
}

const WELCOME_HINT = "(start onboarding to see matches)";

export default function MapView() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const districts = useDistricts();
  const barris = useBarris();
  const [level, setLevel] = useState("district");
  const [metric, setMetric] = useState("match");
  const [hovered, setHovered] = useState(null);

  const ac = audienceConfig(profile);

  const weights = useMemo(() => {
    const o = {};
    (profile?.priorities || []).forEach((p) => (o[p.category_key] = p.weight));
    return o;
  }, [profile]);
  const flip = (profile?.persona && PERSONA_FLIPS[profile.persona]) || {};

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
  function value10(area) {
    if (metric === "match") return (matchOf(area) / 10) + 1;
    return catScore(area, metric);
  }

  const loading = level === "district" ? districts.isLoading : barris.isLoading;
  const areas = level === "district" ? (districts.data || []) : (barris.data || []);

  function ringPositions(a) {
    const ring = a.geometry?.coordinates?.[0];
    if (!ring || ring.length < 4) return null;
    return ring.map(([lon, lat]) => [lat, lon]);
  }

  function polyStyle(a) {
    const v = value10(a);
    const isHover = hovered === a.id;
    return {
      color: isHover ? "#0f172a" : "#ffffff",
      weight: isHover ? 2.5 : 0.8,
      fillColor: v == null ? "#cbd5e1" : scoreColor(v),
      fillOpacity: isHover ? 0.92 : 0.68,
    };
  }

  function hoverLabel(a) {
    const ms = matchOf(a);
    const matchLine = profile?.priorities?.length ? ` · ${ms}% match` : ` · ${WELCOME_HINT}`;
    if (metric === "match" || !catScore(a, metric)) {
      return `${a.name}${matchLine}`;
    }
    return `${a.name} · ${ms}% match · ${metricLabel(metric)}: ${catScore(a, metric).toFixed(1)}/10`;
  }
  function metricLabel(key) {
    const c = CATEGORIES.find((x) => x.key === key);
    return c ? c.name : key;
  }

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
        <span className="ml-2 hidden sm:inline">Hover an area for your match %</span>
      </div>

      <div className="rounded-xl border overflow-hidden h-[70vh]">
        <MapContainer center={[41.395, 2.16]} zoom={12} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
            maxZoom={19}
          />
          <FitBounds areas={areas} />
          {!loading && areas.map((a) => {
            const pos = ringPositions(a);
            const style = polyStyle(a);
            const label = hoverLabel(a);
            const handlers = {
              mouseover: () => setHovered(a.id),
              mouseout: () => setHovered(null),
              click: () => navigate(`/area/${level}/${a.id}`),
            };
            if (pos) {
              return (
                <Polygon key={a.id} positions={pos} pathOptions={style} eventHandlers={handlers}>
                  <Tooltip sticky>{label}</Tooltip>
                </Polygon>
              );
            }
            // fallback for any area without a boundary yet
            return (
              <CircleMarker
                key={a.id}
                center={[a.centroid?.lat || 41.395, a.centroid?.lon || 2.16]}
                radius={7}
                pathOptions={{ ...style, weight: 0.5 }}
                eventHandlers={handlers}
              >
                <Tooltip>{label}</Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      {loading && <p className="text-center text-sm text-muted-foreground mt-3">Loading map data…</p>}
      {!profile?.priorities?.length && !loading && (
        <p className="text-center text-xs text-muted-foreground mt-2">Complete the onboarding chat to see personalised match percentages.</p>
      )}
    </div>
  );
}