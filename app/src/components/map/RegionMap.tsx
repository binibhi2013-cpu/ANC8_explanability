"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import { REGION_BY_PCODE } from "@/lib/regions";

/**
 * The regional choropleth, on Leaflet. Loaded only in the browser (see MapPanel):
 * Leaflet touches `window` on import.
 *
 * Styles are applied to the existing layers rather than by remounting, so changing
 * the metric recolours the regions in place and the CSS transition on the paths
 * animates the change. Every region carries its value as a label, so the map can be
 * read without the legend, and hovering shows the region's name and value.
 */

export interface MapDatum {
  value: string;
  fill: string;
  ink: string;
}

type Props = {
  geo: FeatureCollection;
  data: Record<string, MapDatum>;
  selected: string;
  onSelect: (region: string) => void;
  basemap: boolean;
  theme: "light" | "dark";
  labels: boolean;
  height?: number | string;
};

const ETHIOPIA: L.LatLngBoundsExpression = [[3.3, 32.9], [15.0, 48.0]];

function ringArea(ring: Position[]) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

/** A label point for a region: the area-weighted centroid of its largest ring. */
export function labelPoint(g: Geometry): [number, number] | null {
  const polys: Position[][][] =
    g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  let best: Position[] | null = null;
  let bestA = -1;
  for (const p of polys) {
    const a = ringArea(p[0]);
    if (a > bestA) {
      bestA = a;
      best = p[0];
    }
  }
  if (!best) return null;
  let x = 0, y = 0, a = 0;
  for (let i = 0, j = best.length - 1; i < best.length; j = i++) {
    const f = best[j][0] * best[i][1] - best[i][0] * best[j][1];
    x += (best[j][0] + best[i][0]) * f;
    y += (best[j][1] + best[i][1]) * f;
    a += f;
  }
  a *= 0.5;
  return a ? [y / (6 * a), x / (6 * a)] : [best[0][1], best[0][0]];
}

// Small regions whose label would sit on a neighbour's border get a nudge.
const LABEL_NUDGE: Record<string, [number, number]> = {
  "Addis Ababa": [0.05, 0],
  Harari: [-0.3, 0.45],
  "Dire Dawa": [0.45, -0.1],
};

function Labels({ geo, data, show }: { geo: FeatureCollection; data: Record<string, MapDatum>; show: boolean }) {
  const map = useMap();
  const layer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    layer.current = L.layerGroup().addTo(map);
    return () => {
      layer.current?.remove();
    };
  }, [map]);
  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    if (!show) return;
    for (const f of geo.features) {
      const region = REGION_BY_PCODE[(f.properties as { pcode: string }).pcode]?.name;
      if (!region || !data[region]) continue;
      const pt = labelPoint(f.geometry);
      if (!pt) continue;
      const nudge = LABEL_NUDGE[region] ?? [0, 0];
      const d = data[region];
      const html = `<span class="studio-maplabel" style="color:${d.ink}">${d.value}</span>`;
      L.marker([pt[0] + nudge[0], pt[1] + nudge[1]], {
        icon: L.divIcon({ className: "studio-maplabel-wrap", html, iconSize: [0, 0] }),
        interactive: false,
        keyboard: false,
      }).addTo(g);
    }
  }, [geo, data, show]);
  return null;
}

function FitOnce() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(ETHIOPIA, { padding: [4, 4] });
  }, [map]);
  return null;
}

export default function RegionMap({ geo, data, selected, onSelect, basemap, theme, labels, height = 460 }: Props) {
  const layerRef = useRef<L.GeoJSON | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const style = useMemo(
    () =>
      (f?: Feature): L.PathOptions => {
        const pcode = (f?.properties as { pcode?: string } | undefined)?.pcode ?? "";
        const region = REGION_BY_PCODE[pcode]?.name;
        const on = region && region === selected;
        if (!region) {
          // the OCHA "Contested" polygon has no survey region
          return { fillColor: theme === "dark" ? "#26313c" : "#d2dbe5", fillOpacity: 0.55, color: theme === "dark" ? "#37444f" : "#b7c4d2",
                   weight: 0.6, dashArray: "3 3" };
        }
        return {
          fillColor: dataRef.current[region]?.fill ?? (theme === "dark" ? "#1f2830" : "#dfe5ec"),
          fillOpacity: 1,
          color: on ? (theme === "dark" ? "#7cc2f5" : "#0a4e86") : theme === "dark" ? "#0d131a" : "#ffffff",
          weight: on ? 2.6 : 0.9,
        };
      },
    [selected, theme],
  );

  const styleRef = useRef(style);
  styleRef.current = style;

  // Restyle in place when the data, the selection or the theme change.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.eachLayer((l) => {
      const path = l as L.Path & { feature?: Feature };
      path.setStyle(style(path.feature));
      const region = REGION_BY_PCODE[(path.feature?.properties as { pcode: string }).pcode]?.name;
      if (region) {
        const d = data[region];
        path.setTooltipContent(`<b>${region}</b><br/><span class="num">${d?.value ?? "no data"}</span>`);
        if (region === selected) path.bringToFront();
      }
    });
  }, [data, style, selected]);

  return (
    <div style={{ height }} className="w-full relative">
      <MapContainer
        bounds={ETHIOPIA}
        scrollWheelZoom={false}
        zoomSnap={0.25}
        minZoom={4.5}
        maxZoom={9}
        maxBounds={[[0, 29], [18, 52]]}
        attributionControl
        style={{ height: "100%", width: "100%" }}
      >
        <FitOnce />
        {basemap && (
          <TileLayer
            key={theme}
            url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${theme === "dark" ? "Dark" : "Light"}_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
            attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors · boundaries UN OCHA"
            maxNativeZoom={16}
          />
        )}
        <GeoJSON
          data={geo}
          style={style}
          ref={(l) => {
            layerRef.current = l;
          }}
          onEachFeature={(f, layer) => {
            const region = REGION_BY_PCODE[(f.properties as { pcode: string }).pcode]?.name;
            if (!region) {
              layer.bindTooltip("Contested area", { className: "studio-tip", sticky: true });
              return;
            }
            layer.bindTooltip(`<b>${region}</b>`, { className: "studio-tip", sticky: true });
            layer.on({
              click: () => selectRef.current(region),
              mouseover: (e) => (e.target as L.Path).setStyle({ weight: 2.2 }),
              mouseout: (e) => (e.target as L.Path).setStyle(styleRef.current(f)),
            });
          }}
        />
        <Labels geo={geo} data={data} show={labels} />
      </MapContainer>
    </div>
  );
}
