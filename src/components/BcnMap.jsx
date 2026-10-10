import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Briefcase, X } from "lucide-react";
import { scoreColor } from "@/lib/scoring";

// Open-source WebGL map. Base style "positron" comes from OpenFreeMap (built on
// OpenStreetMap). Free, no API key.
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

// Compute [lng,lat] bounds from a GeoJSON FeatureCollection (Polygon/MultiPolygon).
function bboxOf(gj) {
  let minLon = 180, minLat = 90, maxLon = -180, maxLat = -90;
  const walk = (coords) => {
    if (typeof coords[0] === "number") {
      const [lon, lat] = coords;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      coords.forEach(walk);
    }
  };
  (gj?.features || []).forEach((f) => f.geometry && walk(f.geometry.coordinates));
  if (minLon === 180) return null;
  return [[minLon, minLat], [maxLon, maxLat]];
}

function fitToData(map, gj) {
  const bb = bboxOf(gj);
  if (bb) map.fitBounds(bb, { padding: 30, animate: false });
}

export default function BcnMap({ geojson, pins, audience, onAreaClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const sourceRef = useRef(null);
  const pinMarkersRef = useRef([]);
  const workplaceMarkerRef = useRef(null);
  const popupRef = useRef(null);
  const placingRef = useRef(false);
  const onAreaClickRef = useRef(onAreaClick);
  onAreaClickRef.current = onAreaClick;

  const [placing, setPlacing] = useState(false);
  const [workplace, setWorkplace] = useState(null); // { lon, lat }
  const storageKey = `barriomatch:workplace:${audience || "b2c"}`;

  useEffect(() => { placingRef.current = placing; }, [placing]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = placing ? "crosshair" : "";
  }, [placing]);

  // Load saved workplace for this audience.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setWorkplace(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [storageKey]);

  // Init map once.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [2.16, 41.395],
      zoom: 12,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-left");

    map.on("load", () => {
      map.addSource("areas", { type: "geojson", data: geojson || { type: "FeatureCollection", features: [] } });
      sourceRef.current = map.getSource("areas");
      map.addLayer({ id: "area-fill", type: "fill", source: "areas", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.65 } });
      map.addLayer({ id: "area-line", type: "line", source: "areas", paint: { "line-color": "#ffffff", "line-width": 0.8 } });

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
      popupRef.current = popup;
      const onMove = (e) => {
        if (placingRef.current) return;
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        popup.setLngLat(e.lngLat).setHTML(f.properties.label).addTo(map);
      };
      const onLeave = () => {
        map.getCanvas().style.cursor = placingRef.current ? "crosshair" : "";
        popup.remove();
      };
      const onClick = (e) => {
        if (placingRef.current) return;
        const f = e.features?.[0];
        if (f && onAreaClickRef.current) onAreaClickRef.current(f.properties.id);
      };
      map.on("mousemove", "area-fill", onMove);
      map.on("mouseleave", "area-fill", onLeave);
      map.on("click", "area-fill", onClick);

      fitToData(map, geojson);
    });

    // Workplace placement: a click on the base map (drops the pin).
    map.on("click", (e) => {
      if (!placingRef.current) return;
      const pos = { lon: e.lngLat.lng, lat: e.lngLat.lat };
      setWorkplace(pos);
      localStorage.setItem(storageKey, JSON.stringify(pos));
      setPlacing(false);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []); // once

  // Re-sync the area source whenever the geojson (level / metric / data) changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sourceRef.current) return;
    sourceRef.current.setData(geojson || { type: "FeatureCollection", features: [] });
    fitToData(map, geojson);
  }, [geojson]);

  // Numbered rank pins — top areas, HTML markers positioned by MapLibre.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pinMarkersRef.current.forEach((m) => m.remove());
    pinMarkersRef.current = [];
    pins.forEach((p) => {
      if (p.lon == null || p.lat == null) return;
      const el = document.createElement("div");
      const bg = scoreColor((p.match / 10) + 1);
      el.style.cssText = `width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg) translateY(-4px);background:${bg};border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;cursor:pointer;`;
      const num = document.createElement("span");
      num.textContent = p.rank;
      num.style.cssText = "transform:rotate(45deg);font-weight:700;color:#fff;font-size:13px;line-height:1;";
      el.appendChild(num);
      el.title = `${p.rank}. ${p.name} · ${p.match}%`;
      el.addEventListener("click", (ev) => { ev.stopPropagation(); onAreaClickRef.current?.(p.id); });
      pinMarkersRef.current.push(new maplibregl.Marker(el).setLngLat([p.lon, p.lat]).addTo(map));
    });
  }, [pins]);

  // Workplace pin — draggable HTML marker, persisted per audience.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (workplaceMarkerRef.current) { workplaceMarkerRef.current.remove(); workplaceMarkerRef.current = null; }
    if (!workplace) return;
    const el = document.createElement("div");
    el.style.cssText = "background:#1e293b;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45);font-size:15px;";
    el.textContent = "💼";
    const marker = new maplibregl.Marker(el, { draggable: true }).setLngLat([workplace.lon, workplace.lat]).addTo(map);
    marker.on("dragend", () => {
      const ll = marker.getLngLat();
      const pos = { lon: ll.lng, lat: ll.lat };
      setWorkplace(pos);
      localStorage.setItem(storageKey, JSON.stringify(pos));
    });
    workplaceMarkerRef.current = marker;
  }, [workplace, storageKey]);

  function clearWorkplace() {
    setWorkplace(null);
    localStorage.removeItem(storageKey);
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        {workplace ? (
          <div className="flex items-center gap-1 rounded-full border bg-background/95 px-2.5 py-1 text-xs shadow">
            <Briefcase className="h-3.5 w-3.5 text-slate-700" /> Workplace
            <button onClick={clearWorkplace} className="ml-1 text-muted-foreground hover:text-foreground" aria-label="Clear workplace">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setPlacing((p) => !p)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow ${placing ? "bg-primary text-primary-foreground" : "bg-background/95 hover:bg-muted"}`}
          >
            <Briefcase className="h-3.5 w-3.5" /> {placing ? "Click map to place" : "Set workplace"}
          </button>
        )}
      </div>
    </div>
  );
}