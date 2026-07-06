import { Crosshair, ExternalLink, LocateFixed, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type MapMarkerTone = "red" | "blue" | "green" | "amber" | "slate";

export interface MapMarker {
  id: string | number;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  details?: Array<{ label: string; value: string }>;
  actionLabel?: string;
  tone?: MapMarkerTone;
}

export interface MapRoute {
  id: string | number;
  points: Array<{ lat: number; lng: number }>;
  tone?: "blue" | "red" | "green";
}

interface RealTimeMapProps {
  markers: MapMarker[];
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  initialCenter?: { lat: number; lng: number };
  heightClass?: string;
  onLocate?: () => void;
  locating?: boolean;
  layer?: "street" | "satellite" | "terrain";
  routes?: MapRoute[];
  onMarkerClick?: (marker: MapMarker) => void;
}

const TILE_SIZE = 256;
const DEFAULT_CENTER = { lat: -1.9441, lng: 30.0619 };
const toneClass: Record<MapMarkerTone, string> = {
  red: "border-red-900 bg-red-600",
  blue: "border-blue-900 bg-blue-600",
  green: "border-emerald-900 bg-emerald-600",
  amber: "border-amber-900 bg-amber-500",
  slate: "border-slate-900 bg-slate-600",
};

export default function RealTimeMap({ markers, userLocation, initialCenter = DEFAULT_CENTER, heightClass = "h-[32rem]", onLocate, locating, layer = "street", routes = [], onMarkerClick }: RealTimeMapProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; center: { lat: number; lng: number } } | null>(null);
  const [size, setSize] = useState({ width: 900, height: 520 });
  const [center, setCenter] = useState(initialCenter);
  const [zoom, setZoom] = useState(14);
  const [activeMarker, setActiveMarker] = useState<string | number | null>(null);

  useEffect(() => {
    setCenter(initialCenter);
  }, [initialCenter.lat, initialCenter.lng]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const update = () => setSize({ width: node.clientWidth || 900, height: node.clientHeight || 520 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const allMarkers = useMemo(() => {
    const points = [...markers];
    if (userLocation) {
      points.unshift({
        id: "current-location",
        lat: userLocation.lat,
        lng: userLocation.lng,
        title: "You are here",
        subtitle: userLocation.accuracy ? `Within about ${Math.round(userLocation.accuracy)} meters` : "Shared from this device",
        details: [
          { label: "Place", value: `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` },
          ...(userLocation.accuracy ? [{ label: "Location range", value: `${Math.round(userLocation.accuracy)} meters` }] : []),
        ],
        actionLabel: "Get directions here",
        tone: "blue",
      });
    }
    return points;
  }, [markers, userLocation]);

  const centerPoint = latLngToPoint(center.lat, center.lng, zoom);
  const tiles = useMemo(() => visibleTiles(centerPoint, size, zoom), [centerPoint.x, centerPoint.y, size.width, size.height, zoom]);

  function fitMarkers() {
    if (allMarkers.length === 0) return;
    const lat = allMarkers.reduce((sum, marker) => sum + marker.lat, 0) / allMarkers.length;
    const lng = allMarkers.reduce((sum, marker) => sum + marker.lng, 0) / allMarkers.length;
    setCenter({ lat, lng });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = { x: event.clientX, y: event.clientY, center };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const start = dragRef.current;
    const startPoint = latLngToPoint(start.center.lat, start.center.lng, zoom);
    const nextPoint = { x: startPoint.x - (event.clientX - start.x), y: startPoint.y - (event.clientY - start.y) };
    setCenter(pointToLatLng(nextPoint.x, nextPoint.y, zoom));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoom((value) => Math.max(3, Math.min(18, value + (event.deltaY < 0 ? 1 : -1))));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
      <div
        ref={viewportRef}
        className={`relative w-full touch-none select-none overflow-hidden ${heightClass}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {tiles.map((tile) => (
          <img
            key={`${tile.z}-${tile.x}-${tile.y}`}
            src={tileUrl(layer, tile.z, wrapTileX(tile.x, tile.z), tile.y)}
            className="absolute h-64 w-64 max-w-none select-none"
            style={{ left: tile.left, top: tile.top }}
            draggable={false}
            alt=""
          />
        ))}

        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {routes.map((route) => {
            const points = route.points
              .map((point) => {
                const pixel = latLngToPoint(point.lat, point.lng, zoom);
                return `${size.width / 2 + (pixel.x - centerPoint.x)},${size.height / 2 + (pixel.y - centerPoint.y)}`;
              })
              .join(" ");
            const stroke = route.tone === "red" ? "#dc2626" : route.tone === "green" ? "#059669" : "#2563eb";
            return <polyline key={route.id} points={points} fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />;
          })}
        </svg>

        {allMarkers.map((marker, index) => {
          const point = latLngToPoint(marker.lat, marker.lng, zoom);
          const offset = markerOffset(marker, index, allMarkers);
          const left = size.width / 2 + (point.x - centerPoint.x) + offset.x;
          const top = size.height / 2 + (point.y - centerPoint.y) + offset.y;
          const isActive = activeMarker === marker.id;
          const tone = marker.tone ?? "red";
          return (
            <button
              key={marker.id}
              className={`absolute -translate-x-1/2 -translate-y-full cursor-pointer ${isActive ? "z-30" : "z-20"}`}
              style={{ left, top }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setActiveMarker(isActive ? null : marker.id);
                onMarkerClick?.(marker);
              }}
              aria-label={marker.title}
            >
              <span className={`block h-8 w-8 rounded-full border-4 shadow-lg ${toneClass[tone]}`}>
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
              </span>
              {isActive ? (
                <span className="absolute bottom-10 left-1/2 w-64 -translate-x-1/2 rounded-lg bg-slate-950 p-3 text-left text-xs text-white shadow-xl">
                  <span className="block font-semibold">{marker.title}</span>
                  {marker.subtitle ? <span className="mt-1 block text-slate-300">{marker.subtitle}</span> : null}
                  {marker.details?.length ? (
                    <span className="mt-3 block space-y-2 border-t border-white/10 pt-3">
                      {marker.details.map((detail) => (
                        <span key={`${marker.id}-${detail.label}`} className="block">
                          <span className="block text-[10px] font-semibold uppercase text-slate-400">{detail.label}</span>
                          <span className="block text-xs text-white">{detail.value}</span>
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <a className="mt-3 inline-flex items-center gap-1 font-semibold text-blue-200" href={`https://www.google.com/maps/dir/?api=1&destination=${marker.lat},${marker.lng}`} target="_blank" rel="noreferrer">
                    {marker.actionLabel ?? "Get directions"} <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              ) : null}
            </button>
          );
        })}

        <div className="absolute right-4 top-4 z-40 flex flex-col gap-2" onPointerDown={(event) => event.stopPropagation()}>
          <button className="rounded-lg bg-white p-2 shadow transition hover:bg-slate-50" onClick={(event) => { event.stopPropagation(); setZoom((value) => Math.min(18, value + 1)); }} aria-label="Zoom in">
            <Plus className="h-5 w-5 text-slate-700" />
          </button>
          <button className="rounded-lg bg-white p-2 shadow transition hover:bg-slate-50" onClick={(event) => { event.stopPropagation(); setZoom((value) => Math.max(3, value - 1)); }} aria-label="Zoom out">
            <Minus className="h-5 w-5 text-slate-700" />
          </button>
          <button className="rounded-lg bg-white p-2 shadow transition hover:bg-slate-50" onClick={(event) => { event.stopPropagation(); fitMarkers(); }} aria-label="Fit markers">
            <Crosshair className="h-5 w-5 text-slate-700" />
          </button>
          {onLocate ? (
            <button className="rounded-lg bg-white p-2 shadow transition hover:bg-slate-50 disabled:opacity-60" onClick={(event) => { event.stopPropagation(); onLocate(); }} disabled={locating} aria-label="Find my location">
              <LocateFixed className={`h-5 w-5 text-slate-700 ${locating ? "animate-pulse" : ""}`} />
            </button>
          ) : null}
        </div>

        <div className="absolute bottom-3 right-3 rounded bg-white/90 px-2 py-1 text-[11px] text-slate-600 shadow">
          Map provided by OpenStreetMap
        </div>
      </div>
    </div>
  );
}

function markerOffset(marker: MapMarker, index: number, markers: MapMarker[]) {
  const key = markerPositionKey(marker);
  const group = markers.filter((item) => markerPositionKey(item) === key);
  if (group.length <= 1) return { x: 0, y: 0 };
  const groupIndex = group.findIndex((item) => item.id === marker.id);
  const angle = (Math.PI * 2 * groupIndex) / group.length - Math.PI / 2;
  const radius = Math.min(30, 12 + group.length * 3);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function markerPositionKey(marker: MapMarker) {
  return `${marker.lat.toFixed(4)},${marker.lng.toFixed(4)}`;
}
function visibleTiles(centerPoint: { x: number; y: number }, size: { width: number; height: number }, zoom: number) {
  const minX = Math.floor((centerPoint.x - size.width / 2) / TILE_SIZE) - 1;
  const maxX = Math.floor((centerPoint.x + size.width / 2) / TILE_SIZE) + 1;
  const minY = Math.max(0, Math.floor((centerPoint.y - size.height / 2) / TILE_SIZE) - 1);
  const maxTile = 2 ** zoom - 1;
  const maxY = Math.min(maxTile, Math.floor((centerPoint.y + size.height / 2) / TILE_SIZE) + 1);
  const tiles: Array<{ x: number; y: number; z: number; left: number; top: number }> = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      tiles.push({ x, y, z: zoom, left: x * TILE_SIZE - centerPoint.x + size.width / 2, top: y * TILE_SIZE - centerPoint.y + size.height / 2 });
    }
  }
  return tiles;
}

function latLngToPoint(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function pointToLatLng(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function wrapTileX(x: number, zoom: number) {
  const max = 2 ** zoom;
  return ((x % max) + max) % max;
}

function tileUrl(layer: "street" | "satellite" | "terrain", z: number, x: number, y: number) {
  if (layer === "terrain") return `https://tile.opentopomap.org/${z}/${x}/${y}.png`;
  if (layer === "satellite") return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}
