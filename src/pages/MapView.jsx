import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/lib/useProfile";
import { useDistricts, useBarris } from "@/lib/useAreas";
import { scoreColor, categoryScoresFromArea, matchScoreWithCommute, commuteDistanceLabel } from "@/lib/scoring";
import { PERSONA_FLIPS, categoriesForMode } from "@/lib/categories";
import { audienceConfigByKey } from "@/lib/audience";
import { useActiveAudience } from "@/lib/useActiveAudience";
import { useWorkplace } from "@/lib/useWorkplace";
import BcnMap from "@/components/BcnMap";

const WELCOME_HINT = "(start onboarding to see matches)";

export default function MapView() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const districts = useDistricts();
  const barris = useBarris();
  const [level, setLevel] = useState("district");
  const [metric, setMetric] = useState("match");

  const { audience } = useActiveAudience();
  const ac = audienceConfigByKey(audience);
  const cats = categoriesForMode(audience);
  const { workplace, setWorkplace } = useWorkplace(audience);

  const weights = useMemo(() => {
    const o = {};
    (profile?.priorities || []).forEach((p) => (o[p.category_key] = p.weight));
    return o;
  }, [profile]);
  const flip = (profile?.persona && PERSONA_FLIPS[profile.persona]) || {};

  const areas = level === "district" ? (districts.data || []) : (barris.data || []);
  const loading = level === "district" ? districts.isLoading : barris.isLoading;

  function catScore(scores, key) {
    let s = scores[key];
    if (s == null) return null;
    if (flip[key] === "negative") s = 11 - s;
    return Math.max(1, Math.min(10, Math.round(s * 10) / 10));
  }
  function matchOf(area, scores) {
    const cs = {};
    cats.forEach((c) => (cs[c.key] = catScore(scores, c.key)));
    return matchScoreWithCommute(cs, weights, area, workplace);
  }
  function metricLabel(key) {
    const c = cats.find((x) => x.key === key);
    return c ? c.name : key;
  }

  // Build the GeoJSON the map renders: one feature per area, with a precomputed
  // fill color (1-10 scale) and a hover label. The fill layer reads ["get","color"].
  // The workplace proximity boost is already baked into the match score here.
  const geojson = useMemo(() => {
    const features = [];
    areas.forEach((a) => {
      const scores = categoryScoresFromArea(a);
      const ms = matchOf(a, scores);
      const v = metric === "match" ? (ms / 10) + 1 : catScore(scores, metric);
      const matchLine = profile?.priorities?.length ? `${ms}% match` : WELCOME_HINT;
      let label = `${a.name} · ${matchLine}`;
      const dist = commuteDistanceLabel(a, workplace);
      if (dist && profile?.priorities?.length) label += ` · ${dist} to workplace`;
      if (metric !== "match" && v != null) label += ` · ${metricLabel(metric)}: ${v.toFixed(1)}/10`;
      const props = { id: a.id, name: a.name, match: ms, color: v == null ? "#cbd5e1" : scoreColor(v), label };
      if (a.geometry && a.geometry.coordinates) {
        features.push({ type: "Feature", geometry: a.geometry, properties: props });
      }
    });
    return { type: "FeatureCollection", features };
  }, [areas, metric, weights, flip, profile, audience, workplace]);

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
            {cats.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
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
        <BcnMap
          geojson={geojson}
          workplace={workplace}
          onWorkplaceChange={setWorkplace}
          onAreaClick={(id) => navigate(`/area/${level}/${id}`)}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {workplace && profile?.priorities?.length && <span className="inline-flex items-center gap-1 text-emerald-700">Ranking includes commute distance to your workplace pin.</span>}
        {!profile?.priorities?.length && !loading && <span>Complete the onboarding chat to see personalised match percentages.</span>}
        {loading && <span>Loading map data…</span>}
      </div>
    </div>
  );
}