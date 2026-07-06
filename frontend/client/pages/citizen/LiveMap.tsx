import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock, ExternalLink, LocateFixed, Navigation, Phone } from "lucide-react";
import RealTimeMap, { type MapMarker } from "@/components/maps/RealTimeMap";
import { incidentsApi } from "@/services/api/incidents";
import { locationsApi } from "@/services/api/locations";
import type { IncidentResponse, LocationMarkerResponse } from "@/types/api";

export default function LiveMap() {
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
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
      .then((items) => {
        setIncidents(items);
        const firstLocated = items.find(hasIncidentGps);
        setSelectedIncidentId(firstLocated?.id ?? items[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
    locationsApi.myHistory().then(setHistory).catch(() => undefined);
  }, []);

  useEffect(() => {
    locateAndShare(false);
  }, []);

  const activeIncidents = useMemo(() => incidents.filter((incident) => !["RESOLVED", "CANCELLED"].includes(incident.status)), [incidents]);
  const locatedIncidents = useMemo(() => incidents.filter(hasIncidentGps), [incidents]);
  const selectedIncident = useMemo(() => incidents.find((incident) => incident.id === selectedIncidentId) ?? activeIncidents[0] ?? incidents[0], [incidents, selectedIncidentId, activeIncidents]);
  const latest = selectedIncident ?? activeIncidents[0] ?? incidents[0];
  const incidentMarkers: MapMarker[] = locatedIncidents.map((incident) => ({
    id: `incident-${incident.id}`,
    lat: incident.latitude as number,
    lng: incident.longitude as number,
    title: reportTitle(incident),
    subtitle: `${friendlyType(incident.type)} - ${friendlyStatus(incident.status)}${incident.manualLocation ? ` - ${incident.manualLocation}` : ""}`,
    details: incidentDetails(incident),
    actionLabel: "Get directions",
    tone: incident.status === "RESOLVED" ? "green" : incident.status === "CANCELLED" ? "slate" : incident.priority === "CRITICAL" ? "red" : "amber",
  }));
  const historyMarkers: MapMarker[] = historyVisible ? history.map((item) => ({
    id: `history-${item.id}`,
    lat: item.latitude,
    lng: item.longitude,
    title: "Place you shared before",
    subtitle: `${new Date(item.capturedAt).toLocaleString()} - within about ${Math.round(item.accuracyMeters ?? 0)} meters`,
    tone: "slate",
  })) : [];
  const markers = [...incidentMarkers, ...historyMarkers];
  const mapCenter = selectedIncident && hasIncidentGps(selectedIncident)
    ? { lat: selectedIncident.latitude as number, lng: selectedIncident.longitude as number }
    : userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : undefined;
  const nearActiveIncident = userLocation && activeIncidents.some((incident) => hasIncidentGps(incident) && distanceKm(userLocation.lat, userLocation.lng, incident.latitude as number, incident.longitude as number) < 1);

  async function locateAndShare(force = true) {
    if (!navigator.geolocation) {
      setError("This browser cannot find your location. Try another browser or device.");
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
        setError(force ? "Please allow location access so we can show where you are on the map." : null);
        setLocating(false);
      },
      { enableHighAccuracy: highAccuracy, timeout: 12000, maximumAge: 15000 },
    );
  }

  function handleMarkerClick(marker: MapMarker) {
    const incidentId = markerIdNumber(marker.id, "incident-");
    if (incidentId) setSelectedIncidentId(incidentId);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">My Reports Map</h1>
        <p className="mt-1 text-slate-600">See your emergency reports, your current location, and tap any pin for details.</p>
      </div>

      {error ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RealTimeMap markers={markers} userLocation={userLocation} initialCenter={mapCenter} onLocate={() => locateAndShare(true)} locating={locating} layer={layer} onMarkerClick={handleMarkerClick} />
        </div>

        <div className="space-y-5">
          <IncidentDetail incident={latest} />

          <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
            <h3 className="mb-4 font-semibold text-slate-950">Your Location</h3>
            <div className="space-y-3">
              {nearActiveIncident ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">You are close to one of your active reports.</div> : null}
              <div className="flex items-center gap-3">
                <Navigation className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-950">Location sharing is {sharing ? "on" : "paused"}</p>
                  <p className="text-xs text-slate-600">Last known place {userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : "not found yet"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-950">Location range</p>
                  <p className="text-xs text-slate-600">{userLocation?.accuracy ? `Within about ${Math.round(userLocation.accuracy)} meters` : "Finding your location"}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-2">
            <button onClick={() => locateAndShare(true)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700">
              <LocateFixed className="h-4 w-4" />
              Find My Location
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-900 transition hover:bg-slate-50">
              <Phone className="h-4 w-4" />
              Call for Help
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-950">Map Settings</h3>
        <div className="space-y-4">
          <Toggle label="Share my location" description="Let the response team see where you are while you need help." value={sharing} onChange={setSharing} />
          <Toggle label="Use precise location" description="Helps place your pin as close to you as possible." value={highAccuracy} onChange={setHighAccuracy} />
          <Toggle label="Show places I shared before" description="Display your recent shared places on the map." value={historyVisible} onChange={setHistoryVisible} />
          <label className="block text-sm font-semibold text-slate-900">Map style<select value={layer} onChange={(event) => setLayer(event.target.value as typeof layer)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="street">Road map</option><option value="satellite">Photo map</option><option value="terrain">Hills and roads</option></select></label>
        </div>
      </section>

      {loading ? <p className="text-sm text-slate-500">Loading your map...</p> : null}
    </div>
  );
}

function reportTitle(incident: IncidentResponse) {
  return incident.manualLocation ? `Report at ${incident.manualLocation}` : `Report ${incident.referenceNumber}`;
}

function incidentDetails(incident: IncidentResponse) {
  return [
    { label: "Report number", value: incident.referenceNumber },
    { label: "Emergency type", value: friendlyType(incident.type) },
    { label: "What is happening", value: friendlyStatus(incident.status) },
    { label: "How urgent", value: friendlyPriority(incident.priority) },
    { label: "Place", value: incident.manualLocation ?? `${Number(incident.latitude).toFixed(5)}, ${Number(incident.longitude).toFixed(5)}` },
    { label: "Reported", value: new Date(incident.reportedAt).toLocaleString() },
    ...(incident.description ? [{ label: "What you reported", value: incident.description }] : []),
  ];
}

function friendlyType(value: string) {
  const labels: Record<string, string> = {
    MEDICAL: "Medical help",
    FIRE: "Fire or smoke",
    ACCIDENT: "Accident",
    CRIME: "Safety concern",
    NATURAL_DISASTER: "Severe weather or disaster",
    OTHER: "Other emergency",
  };
  return labels[value] ?? humanize(value);
}

function friendlyPriority(value: string) {
  const labels: Record<string, string> = {
    CRITICAL: "Needs help immediately",
    HIGH: "Very urgent",
    MEDIUM: "Needs attention soon",
    LOW: "Lower urgency",
  };
  return labels[value] ?? humanize(value);
}

function friendlyStatus(value: string) {
  const labels: Record<string, string> = {
    PENDING: "Waiting for review",
    PRIORITIZED: "Being reviewed",
    ASSIGNED: "Help has been assigned",
    EN_ROUTE: "Help is on the way",
    ON_SCENE: "Help is at the scene",
    RESOLVED: "Handled",
    CANCELLED: "Cancelled",
  };
  return labels[value] ?? humanize(value);
}

function humanize(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
function IncidentDetail({ incident }: { incident?: IncidentResponse }) {
  if (!incident) {
    return <section className="rounded-lg border bg-white p-5 text-sm text-slate-500 shadow-sm">No reports yet. Send an emergency alert when you need help.</section>;
  }
  const hasGps = hasIncidentGps(incident);
  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">Report Details</h3>
          <p className="text-sm font-bold text-red-600">{incident.referenceNumber}</p>
        </div>
        <AlertCircle className="h-5 w-5 text-red-600" />
      </div>
      <div className="space-y-3">
        <Info label="Emergency type" value={friendlyType(incident.type)} />
        <Info label="How urgent" value={friendlyPriority(incident.priority)} />
        <Info label="What is happening" value={friendlyStatus(incident.status)} />
        <Info label="Place" value={incident.manualLocation ?? (hasGps ? `${incident.latitude?.toFixed(5)}, ${incident.longitude?.toFixed(5)}` : "Location not found yet")} />
        <Info label="What you reported" value={incident.description || "No description provided."} />
      </div>
      {hasGps ? <a className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" href={googleMapUrl(incident.latitude as number, incident.longitude as number)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Get directions</a> : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-sm font-medium text-slate-950">{value}</p></div>;
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4"><div><p className="font-medium text-slate-950">{label}</p><p className="text-sm text-slate-600">{description}</p></div><button onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value ? "bg-blue-600" : "bg-slate-300"}`} aria-pressed={value}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${value ? "left-6" : "left-1"}`} /></button></div>;
}

function hasIncidentGps(incident: IncidentResponse) {
  return typeof incident.latitude === "number" && typeof incident.longitude === "number";
}

function markerIdNumber(id: string | number, prefix: string) {
  if (typeof id === "number") return id;
  if (!id.startsWith(prefix)) return null;
  const value = Number(id.slice(prefix.length));
  return Number.isFinite(value) ? value : null;
}

function googleMapUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
