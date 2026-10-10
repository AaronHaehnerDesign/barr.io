import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Open-source WebGL map. Base style "positron" comes from OpenFreeMap (built on
// OpenStreetMap). Free, no API key.
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

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

// MapLibre canvas with colored area polygons and workplace pins. Workplace pins
// are profile-driven (set during onboarding), passed in as `workMarkers`
// ([{label, lon, lat}]); the map does not manage them itself.
export default function BcnMap({ geojson, onAreaClick, workMarkers = [], highlightId = null }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const sourceRef = useRef(null);
  const workMarkersRef = useRef([]);
  const popupRef = useRef(null);
  const prevHighlight = useRef(null);
  const onAreaClickRef = useRef(onAreaClick);
  onAreaClickRef.current = onAreaClick;
  const workMarkersRef2 = useRef(workMarkers);
  workMarkersRef2.current = workMarkers;

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
      map.addSource("areas", { type: "geojson", data: geojson || { type: "FeatureCollection", features: [] }, promoteId: "id" });
      sourceRef.current = map.getSource("areas");
      map.addLayer({ id: "area-fill", type: "fill", source: "areas", paint: { "fill-color": ["get", "color"], "fill-opacity": ["case", ["boolean", ["feature-state", "highlight"], false], 0.92, 0.6] } });
      map.addLayer({ id: "area-line", type: "line", source: "areas", paint: { "line-color": ["case", ["boolean", ["feature-state", "highlight"], false], "#0f172a", "#ffffff"], "line-width": ["case", ["boolean", ["feature-state", "highlight"], false], 3, 0.8] } });

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
      popupRef.current = popup;
      const onMove = (e) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        popup.setLngLat(e.lngLat).setHTML(f.properties.label).addTo(map);
      };
      const onLeave = () => { map.getCanvas().style.cursor = ""; popup.remove(); };
      const onClick = (e) => {
        const f = e.features?.[0];
        if (f && onAreaClickRef.current) onAreaClickRef.current(f.properties.id);
      };
      map.on("mousemove", "area-fill", onMove);
      map.on("mouseleave", "area-fill", onLeave);
      map.on("click", "area-fill", onClick);

      fitToData(map, geojson);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sourceRef.current) return;
    sourceRef.current.setData(geojson || { type: "FeatureCollection", features: [] });
    fitToData(map, geojson);
  }, [geojson]);

  // Highlight a single area (e.g. when hovering its result card) via feature-state.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (prevHighlight.current != null) map.removeFeatureState({ source: "areas", id: prevHighlight.current });
    if (highlightId != null) map.setFeatureState({ source: "areas", id: highlightId }, { highlight: true });
    prevHighlight.current = highlightId;
  }, [highlightId]);

  // Workplace pins (one per partner) — 💼 markers with a hover tooltip label.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    workMarkersRef.current.forEach((m) => m.remove());
    workMarkersRef.current = [];
    (workMarkersRef2.current || []).forEach((w) => {
      if (w.lon == null || w.lat == null) return;
      const el = document.createElement("div");
      el.style.cssText = "background:#1e293b;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45);font-size:15px;";
      el.textContent = "💼";
      el.title = w.label || "Workplace";
      workMarkersRef.current.push(new maplibregl.Marker(el).setLngLat([w.lon, w.lat]).addTo(map));
    });
  }, [workMarkers]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}