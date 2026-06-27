import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock, LocateFixed, MapPin, Navigation, Phone } from "lucide-react";
import RealTimeMap, { type MapMarker } from "@/components/maps/RealTimeMap";
import { incidentsApi } from "@/services/api/incidents";
import { locationsApi } from "@/services/api/locations";
import type { IncidentResponse, LocationMarkerResponse } from "@/types/api";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function LiveMap() {
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [sharing, setSharing] = useState(true);
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [layer, setLayer] = useState<"street" | "satellite" | "terrain">("street");
  const [history, setHistory] = useState<LocationMarkerResponse[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    incidentsApi.mine()
      .then(setIncidents)
      .finally(() => setLoading(false));
    locationsApi.myHistory().then(setHistory).catch(() => undefined);
  }, []);

  useEffect(() => {
    locateAndShare(false);
  }, []);

  const activeIncidents = useMemo(() => incidents.filter((incident) => !["RESOLVED", "CANCELLED"].includes(incident.status)), [incidents]);
  const latest = activeIncidents[0] ?? incidents[0];
  const incidentMarkers: MapMarker[] = activeIncidents
    .filter((incident) => typeof incident.latitude === "number" && typeof incident.longitude === "number")
    .map((incident) => ({
      id: incident.id,
      lat: incident.latitude as number,
      lng: incident.longitude as number,
      title: incident.referenceNumber,
      subtitle: `${label(incident.type)} - ${label(incident.status)} - ${incident.manualLocation ?? "GPS alert"}`,
      tone: incident.priority === "CRITICAL" ? "red" : "amber",
    }));
  const historyMarkers: MapMarker[] = historyVisible ? history.map((item) => ({
    id: `history-${item.id}`,
    lat: item.latitude,
    lng: item.longitude,
    title: "Previous location",
    subtitle: `${new Date(item.capturedAt).toLocaleString()} - accuracy ${Math.round(item.accuracyMeters ?? 0)}m`,
    tone: "slate",
  })) : [];
  const markers = [...incidentMarkers, ...historyMarkers];
  const nearActiveIncident = userLocation && activeIncidents.some((incident) => typeof incident.latitude === "number" && typeof incident.longitude === "number" && distanceKm(userLocation.lat, userLocation.lng, incident.latitude as number, incident.longitude as number) < 1);

  async function locateAndShare(force = true) {
    if (!navigator.geolocation) {
      setError("This browser does not support GPS location.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy };
        setUserLocation(next);
        if (sharing) {
          await locationsApi.updateMe({ latitude: next.lat, longitude: next.lng, accuracyMeters: next.accuracy, consentProvided: true });
        }
        setLocating(false);
      },
      () => {
        setError(force ? "Allow location access on this phone/browser to share live GPS." : null);
        setLocating(false);
      },
      { enableHighAccuracy: highAccuracy, timeout: 12000, maximumAge: 15000 },
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Live Map & Tracking</h1>
        <p className="mt-1 text-slate-600">Real GPS tracking with OpenStreetMap and your live emergency reports.</p>
      </div>

      {error ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RealTimeMap markers={markers} userLocation={userLocation} onLocate={() => locateAndShare(true)} locating={locating} layer={layer} />
        </div>

        <div className="space-y-5">
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-950">Current Response</h3>
            {latest ? (
              <div className="space-y-3">
                <Info label="Reference" value={latest.referenceNumber} />
                <Info label="Status" value={label(latest.status)} />
                <Info label="Location" value={latest.manualLocation ?? `${latest.latitude ?? "GPS"}, ${latest.longitude ?? "coordinates"}`} />
              </div>
            ) : (
              <p className="text-sm text-slate-500">No reports yet. Send a GPS emergency alert when you need help.</p>
            )}
          </section>

          <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
            <h3 className="mb-4 font-semibold text-slate-950">Your GPS Status</h3>
            <div className="space-y-3">
              {nearActiveIncident ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">You are within 1 km of an active incident marker.</div> : null}
              <div className="flex items-center gap-3">
                <Navigation className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-950">Location {sharing ? "Sharing Enabled" : "Sharing Paused"}</p>
                  <p className="text-xs text-slate-600">Latest fix {userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : "not captured yet"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-950">Accuracy</p>
                  <p className="text-xs text-slate-600">{userLocation?.accuracy ? `${Math.round(userLocation.accuracy)} meters` : "Waiting for GPS"}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-2">
            <button onClick={() => locateAndShare(true)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700">
              <LocateFixed className="h-4 w-4" />
              Refresh Phone GPS
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-900 transition hover:bg-slate-50">
              <Phone className="h-4 w-4" />
              Call Dispatch
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-950">Location Sharing Settings</h3>
        <div className="space-y-4">
          <Toggle label="Real-time GPS Sharing" description="Share your latest consented location with dispatch." value={sharing} onChange={setSharing} />
          <Toggle label="High Accuracy Mode" description="Uses phone GPS for the best emergency location." value={highAccuracy} onChange={setHighAccuracy} />
          <Toggle label="Show Location History" description="Display your recent shared locations on the map." value={historyVisible} onChange={setHistoryVisible} />
          <label className="block text-sm font-semibold text-slate-900">Map layer<select value={layer} onChange={(event) => setLayer(event.target.value as typeof layer)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="street">Street</option><option value="satellite">Satellite</option><option value="terrain">Terrain</option></select></label>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-sm font-medium text-slate-950">{value}</p></div>;
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4"><div><p className="font-medium text-slate-950">{label}</p><p className="text-sm text-slate-600">{description}</p></div><button onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value ? "bg-blue-600" : "bg-slate-300"}`} aria-pressed={value}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${value ? "left-6" : "left-1"}`} /></button></div>;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

