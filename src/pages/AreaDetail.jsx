import { useParams, Link } from "react-router-dom";
import { MapContainer, TileLayer, Polygon, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useDistrict, useBarri } from "@/lib/useAreas";
import { useProfile } from "@/lib/useProfile";
import { CATEGORIES, CATEGORY_MAP, INDICATORS } from "@/lib/categories";
import { matchScore, scoreColor, isStale } from "@/lib/scoring";
import ScoreBadge from "@/components/ScoreBadge";
import ScoreBar from "@/components/ScoreBar";
import CategoryIcon from "@/components/CategoryIcon";
import { ArrowLeft, MapPin, Check, AlertTriangle, Database, Clock } from "lucide-react";

export default function AreaDetail() {
  const { type, id } = useParams();
  const districtQ = useDistrict(type === "district" ? id : undefined);
  const barriQ = useBarri(type === "barri" ? id : undefined);
  const q = type === "barri" ? barriQ : districtQ;
  const { data: profile } = useProfile();

  if (q.isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  const a = q.data;
  if (!a) return <div className="p-8 text-center">Area not found. <Link to="/results" className="text-primary underline">Back</Link></div>;

  const scores = a.category_scores || {};
  const weights = {};
  (profile?.priorities || []).forEach((p) => (weights[p.category_key] = p.weight));
  const ms = Object.keys(weights).length ? matchScore(scores, weights) : null;

  const sorted = CATEGORIES.map((c) => ({ ...c, score: scores[c.key] })).filter((c) => c.score != null);
  const good = [...sorted].sort((x, y) => y.score - x.score).slice(0, 3);
  const watch = [...sorted].sort((x, y) => x.score - y.score).slice(0, 3);

  const position = a.centroid ? [a.centroid.lat, a.centroid.lon] : [41.395, 2.16];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link to="/results" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Results</Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{a.name}</h1>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">sample data</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />
            {type === "barri" ? `Barri · ${a.district_name}` : "District"} · {a.population?.toLocaleString()} inhabitants
          </p>
        </div>
        {ms != null && (
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: scoreColor((ms / 10) + 1) }}>{ms}%</div>
            <div className="text-xs text-muted-foreground">personal match</div>
          </div>
        )}
      </div>

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
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; OSM &copy; CARTO" />
          {type === "district" && a.geometry?.coordinates?.[0] && (
            <Polygon positions={a.geometry.coordinates[0].map(([lon, lat]) => [lat, lon])} pathOptions={{ color: "#0ea5e9", weight: 1.5, fillColor: scoreColor((ms || 50) / 10 + 1), fillOpacity: 0.4 }} />
          )}
          <CircleMarker center={position} radius={6} pathOptions={{ color: "#0f172a", fillColor: "#0ea5e9", fillOpacity: 0.9 }} />
        </MapContainer>
      </div>

      {/* all category scores */}
      <h2 className="mt-6 mb-2 font-semibold">All category scores</h2>
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
              <th className="p-3 font-medium text-right">Value</th>
              <th className="p-3 font-medium text-center">Score</th>
              <th className="p-3 font-medium">Source</th>
              <th className="p-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(a.indicators || []).map((iv) => {
              const stale = isStale(iv.last_updated);
              const ind = INDICATORS.find((x) => x.name === iv.indicator_name);
              return (
                <tr key={iv.indicator_name} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2"><CategoryIcon categoryKey={iv.category_key} className="h-3.5 w-3.5 text-muted-foreground" />{iv.indicator_name}</div>
                    <span className="ml-5.5 text-[11px] text-muted-foreground">{iv.unit}</span>
                  </td>
                  <td className="p-3 text-right tabular-nums">{iv.external ? <span className="text-xs text-muted-foreground">coming soon</span> : iv.raw_value}</td>
                  <td className="p-3 text-center"><ScoreBadge score={iv.external ? null : iv.normalized_score} size="sm" /></td>
                  <td className="p-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Database className="h-3 w-3" />{iv.source}</span></td>
                  <td className="p-3 text-[11px]">
                    <span className={`inline-flex items-center gap-1 ${stale ? "text-amber-600 font-medium" : "text-muted-foreground"}`}><Clock className="h-3 w-3" />{iv.last_updated}{stale && " · stale"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}