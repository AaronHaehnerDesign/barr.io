import { useEffect, useMemo } from "react";
import { useDistricts, useBarris } from "@/lib/useAreas";
import { rankAreas } from "@/lib/rankAreas";
import { MATCH_NOTE } from "@/lib/scoring";
import { useParams, Link } from "react-router-dom";
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useDistrict, useBarri } from "@/lib/useAreas";
import { useProfile } from "@/lib/useProfile";
import { useActiveAudience } from "@/lib/useActiveAudience";
import { CATEGORIES, CATEGORY_MAP, INDICATORS, categoriesForMode, indicatorsForMode } from "@/lib/categories";
import { matchScore, scoreColor, categoryScoresFromArea } from "@/lib/scoring";
import { areaIntro } from "@/lib/areaIntro";
import AreaApartments from "@/components/AreaApartments";

// Fit the detail map tightly to the area's boundary so the polygon is centered
// and fills the frame (no matter whether it is a district or a barri).
function FitBounds({ area }) {
  const map = useMap();
  useEffect(() => {
    const ring = area.geometry?.coordinates?.[0];
    if (!ring || ring.length < 4) return;
    const pts = ring.map(([lon, lat]) => [lat, lon]);
    const lats = pts.map((p) => p[0]);
    const lons = pts.map((p) => p[1]);
    const pad = 0.004;
    map.fitBounds(
      [[Math.min(...lats) - pad, Math.min(...lons) - pad], [Math.max(...lats) + pad, Math.max(...lons) + pad]],
      { animate: false }
    );
  }, [area, map]);
  return null;
}
import ScoreBadge from "@/components/ScoreBadge";
import ScoreBar from "@/components/ScoreBar";
import CategoryIcon from "@/components/CategoryIcon";
import { ArrowLeft, MapPin, Check, AlertTriangle } from "lucide-react";

function readingFor(score) {
  if (score == null) return "";
  if (score >= 8) return "High";
  if (score >= 6) return "Good";
  if (score >= 4.5) return "Average";
  if (score >= 2.5) return "Low";
  return "Very low";
}

export default function AreaDetail() {
  const { type, id } = useParams();
  const districtQ = useDistrict(type === "district" ? id : undefined);
  const barriQ = useBarri(type === "barri" ? id : undefined);
  const q = type === "barri" ? barriQ : districtQ;
  const { data: profile } = useProfile();
  const { audience } = useActiveAudience();
  const allDistricts = useDistricts();
  const allBarris = useBarris();
  const peers = (type === "barri" ? allBarris.data : allDistricts.data) || [];
  const ranked = useMemo(() => rankAreas(peers, profile), [peers, profile]);

  if (q.isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  const a = q.data;
  if (!a) return <div className="p-8 text-center">Area not found. <Link to="/results" className="text-primary underline">Back</Link></div>;

  const scores = categoryScoresFromArea(a);
  const aud = profile?.audience || audience;
  const cats = categoriesForMode(aud);
  const inds = indicatorsForMode(aud);
  const weights = {};
  (profile?.priorities || []).forEach((p) => (weights[p.category_key] = p.weight));
  const ms = Object.keys(weights).length ? (ranked.find((r) => r.id === a.id)?.match_score ?? null) : null;

  // Rank category scores by the user's priority weights (most relevant first);
  // categories without a weight fall back to their default order.
  const sorted = cats
    .map((c) => ({ ...c, score: scores[c.key], weight: weights[c.key] ?? -1 }))
    .filter((c) => c.score != null)
    .sort((x, y) => y.weight - x.weight);
  const good = [...sorted].sort((x, y) => y.score - x.score).slice(0, 3);
  const watch = [...sorted].sort((x, y) => x.score - y.score).slice(0, 3);

  const position = a.centroid ? [a.centroid.lat, a.centroid.lon] : [41.395, 2.16];
  const polyRing = a.geometry?.coordinates?.[0];
  const polyPositions = polyRing && polyRing.length >= 4 ? polyRing.map(([lon, lat]) => [lat, lon]) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link to="/results" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Results</Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{a.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />
            {type === "barri" ? `Barri · ${a.district_name}` : "District"} · {a.population?.toLocaleString()} inhabitants
          </p>
        </div>
        {ms != null && (
          <div className="text-right cursor-help" title={MATCH_NOTE}>
            <div className="text-3xl font-bold" style={{ color: scoreColor((ms / 10) + 1) }}>{ms}%</div>
            <div className="text-xs text-muted-foreground">relative match</div>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{areaIntro(a, type)}</p>

      {/* AI summary */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-emerald-50/50 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> Good for</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {good.map((c) => <li key={c.key} className="flex items-center gap-2"><CategoryIcon categoryKey={c.key} className="h-4 w-4 text-emerald-600" /> {c.name} <ScoreBadge score={c.score} size="sm" /></li>)}
          </ul>
        </div>
        <div className="rounded-xl border bg-rose-50/50 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-rose-700"><AlertTriangle className="h-4 w-4" /> Watch out for</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {watch.map((c) => <li key={c.key} className="flex items-center gap-2"><CategoryIcon categoryKey={c.key} className="h-4 w-4 text-rose-600" /> {c.name} <ScoreBadge score={c.score} size="sm" /></li>)}
          </ul>
        </div>
      </div>

      {/* mini map */}
      <div className="mt-5 rounded-xl border overflow-hidden h-52">
        <MapContainer center={position} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" maxZoom={19} />
          <FitBounds area={a} />
          {polyPositions ? (
            <Polygon positions={polyPositions} pathOptions={{ color: "#0ea5e9", weight: 1.5, fillColor: scoreColor((ms || 50) / 10 + 1), fillOpacity: 0.4 }} />
          ) : (
            <CircleMarker center={position} radius={7} pathOptions={{ color: "#0f172a", fillColor: "#0ea5e9", fillOpacity: 0.9 }} />
          )}
        </MapContainer>
      </div>

      {/* all category scores */}
      <h2 className="mt-6 mb-2 font-semibold">Category scores · ranked by your relevance</h2>
      <div className="space-y-2">
        {sorted.map((c) => (
          <div key={c.key} className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted"><CategoryIcon categoryKey={c.key} className="h-4 w-4" /></span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{c.name}</div>
              <div className="mt-1"><ScoreBar score={c.score} /></div>
            </div>
            <ScoreBadge score={c.score} />
          </div>
        ))}
      </div>

      {/* key indicators */}
      <h2 className="mt-6 mb-2 font-semibold">Key indicators</h2>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3 font-medium">Indicator</th>
              <th className="p-3 font-medium">What it means here</th>
              <th className="p-3 font-medium text-right">Value</th>
              <th className="p-3 font-medium text-center">Score</th>
            </tr>
          </thead>
          <tbody>
            {inds.map((ind) => {
              const iv = (a.indicators || []).find((x) => x.indicator_name === ind.name);
              const noValue = !iv || iv.external || ind.external || iv.raw_value == null;
              return (
                <tr key={ind.name} className="border-b last:border-0">
                  <td className="p-3 align-top">
                    <div className="flex items-center gap-2 font-medium"><CategoryIcon categoryKey={ind.category_key} className="h-3.5 w-3.5 text-muted-foreground" />{ind.name}</div>
                    <span className="text-[11px] leading-snug text-muted-foreground">{ind.description}</span>
                  </td>
                  <td className="p-3 align-top">
                    {noValue ? (
                      <span className="text-xs text-muted-foreground">coming soon</span>
                    ) : (
                      <div>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: scoreColor(iv.normalized_score) }}>{readingFor(iv.normalized_score)}</span>
                        <span className="block mt-1 text-[11px] text-muted-foreground">{ind.direction === "negative" ? "lower raw value is better" : "higher raw value is better"}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right align-top tabular-nums">{noValue ? <span className="text-xs text-muted-foreground">—</span> : <span>{iv.raw_value} <span className="text-[11px] text-muted-foreground">{ind.unit}</span></span>}</td>
                  <td className="p-3 text-center align-top"><ScoreBadge score={noValue ? null : iv.normalized_score} size="sm" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Apartments available in this area, filtered by the user's profile */}
      <AreaApartments districtName={type === "district" ? a.name : a.district_name} barriName={type === "barri" ? a.name : undefined} />
    </div>
  );
}