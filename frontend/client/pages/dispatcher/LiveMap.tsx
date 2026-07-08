import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, MapPin, Navigation, Radio, Users } from "lucide-react";
import RealTimeMap, { type MapMarker, type MapRoute } from "@/components/maps/RealTimeMap";
import { incidentsApi } from "@/services/api/incidents";
import { locationsApi } from "@/services/api/locations";
import { resourcesApi } from "@/services/api/resources";
import { usersApi } from "@/services/api/users";
import type { IncidentResponse, LocationMarkerResponse, ResourceResponse, ResponderDetailResponse } from "@/types/api";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function DispatcherLiveMap() {
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [responders, setResponders] = useState<ResponderDetailResponse[]>([]);
  const [resources, setResources] = useState<ResourceResponse[]>([]);
  const [locations, setLocations] = useState<LocationMarkerResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const [queue, responderList, resourceList, markerList] = await Promise.all([incidentsApi.queue(), usersApi.responderDetails(), resourcesApi.list(), locationsApi.markers()]);
      if (!active) return;
      setIncidents(queue);
      setSelectedIncidentId((current) => current ?? queue.find(hasIncidentGps)?.id ?? queue[0]?.id ?? null);
      setResponders(responderList);
      setResources(resourceList);
      setLocations(markerList);
      setLoading(false);
    }
    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const selectedIncident = useMemo(() => incidents.find((incident) => incident.id === selectedIncidentId) ?? incidents[0], [incidents, selectedIncidentId]);
  const availableResources = useMemo(() => resources.filter((resource) => resource.status === "AVAILABLE"), [resources]);
  const responderLocations = useMemo(() => {
    const seen = new Set<number>();
    return locations.filter((location) => {
      if (location.role !== "RESPONDER" || seen.has(location.userId)) return false;
      seen.add(location.userId);
      return true;
    });
  }, [locations]);
  const availableResponders = responders.filter((responder) => responder.availabilityStatus === "AVAILABLE");
  const mapRoutes = useMemo(() => {
    const route = buildSelectedIncidentRoute(selectedIncident, responderLocations);
    return route ? [route] : [];
  }, [responderLocations, selectedIncident]);
  const mapMarkers: MapMarker[] = [
    ...incidents
      .filter(hasIncidentGps)
      .map((incident) => ({
        id: `incident-${incident.id}`,
        lat: incident.latitude as number,
        lng: incident.longitude as number,
        title: incident.referenceNumber,
        subtitle: `${label(incident.type)} - ${label(incident.priority)} - ${incident.manualLocation ?? "Shared location"}`,
        details: incidentMapDetails(incident),
        actionLabel: "Open route",
        tone: selectedIncident?.id === incident.id ? "red" : incident.priority === "CRITICAL" ? "red" : "amber",
      } satisfies MapMarker)),
    ...responderLocations.map((location) => ({
      id: `location-${location.id}`,
      lat: location.latitude,
      lng: location.longitude,
      title: location.fullName,
      subtitle: `${label(location.role)} location updated ${new Date(location.capturedAt).toLocaleTimeString()}`,
      details: [
        { label: "Person", value: location.fullName },
        { label: "Role", value: label(location.role) },
        { label: "Updated", value: new Date(location.capturedAt).toLocaleString() },
      ],
      tone: "green",
    } satisfies MapMarker)),
  ];
  const mapCenter = selectedIncident && hasIncidentGps(selectedIncident) ? { lat: selectedIncident.latitude as number, lng: selectedIncident.longitude as number } : undefined;

  function handleMarkerClick(marker: MapMarker) {
    const incidentId = markerIdNumber(marker.id, "incident-");
    if (incidentId) setSelectedIncidentId(incidentId);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Response Map</h1>
          <p className="mt-1 text-slate-600">See active incidents, responders who shared location, and available support in one place.</p>
        </div>
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Updated every 15 seconds</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <RealTimeMap markers={mapMarkers} initialCenter={mapCenter} routes={mapRoutes} onMarkerClick={handleMarkerClick} />
          {!loading && responderLocations.length === 0 ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">No responder GPS has been shared yet. Ask responders to use Share GPS now or open GPS & Navigation and allow location access.</div> : null}
        </div>

        <div className="space-y-5">
          <IncidentDetail incident={selectedIncident} />

          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-950"><Users className="h-5 w-5 text-blue-600" /> Available Responders</h3>
            <div className="space-y-2">
              {availableResponders.slice(0, 5).map((responder) => (
                <div key={responder.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-900">{responder.fullName}</p>
                  <p className="text-xs text-slate-500">{responder.vehicleNumber || responder.organization || responder.email}</p>
                </div>
              ))}
              {!loading && availableResponders.length === 0 ? <p className="text-sm text-slate-500">No responders are marked available.</p> : null}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Summary icon={<Radio className="h-5 w-5 text-emerald-600" />} label="Responder locations" value={responderLocations.length} />
            <Summary icon={<Navigation className="h-5 w-5 text-emerald-600" />} label="Ready resources" value={availableResources.length} />
          </div>

          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-950"><MapPin className="h-5 w-5 text-emerald-600" /> Resource Districts</h3>
            <div className="space-y-2">
              {availableResources.slice(0, 5).map((resource) => (
                <div key={resource.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <span className="font-medium text-slate-900">{resource.name}</span>
                  <span className="text-xs text-slate-500">{resource.location || "Not set"}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function incidentMapDetails(incident: IncidentResponse) {
  return [
    { label: "Type", value: label(incident.type) },
    { label: "Priority", value: label(incident.priority) },
    { label: "Status", value: label(incident.status) },
    { label: "Location", value: incident.manualLocation ?? `${Number(incident.latitude).toFixed(5)}, ${Number(incident.longitude).toFixed(5)}` },
    { label: "Reporter", value: incident.anonymousReport ? "Anonymous" : incident.reporterName || "Citizen" },
    ...(incident.description ? [{ label: "Details", value: incident.description }] : []),
  ];
}

function buildSelectedIncidentRoute(incident: IncidentResponse | undefined, locations: LocationMarkerResponse[]): MapRoute | null {
  if (!incident || !hasIncidentGps(incident)) return null;
  const responderLocations = locations.filter((location) => location.role === "RESPONDER");
  if (!responderLocations.length) return null;
  const incidentLat = incident.latitude as number;
  const incidentLng = incident.longitude as number;
  const nearest = responderLocations
    .map((location) => ({ location, distance: distanceKm(incidentLat, incidentLng, location.latitude, location.longitude) }))
    .sort((a, b) => a.distance - b.distance)[0]?.location;
  if (!nearest) return null;
  return {
    id: `selected-route-${incident.id}-${nearest.id}`,
    tone: "blue",
    points: [
      { lat: nearest.latitude, lng: nearest.longitude },
      { lat: incidentLat, lng: incidentLng },
    ],
  };
}

function IncidentDetail({ incident }: { incident?: IncidentResponse }) {
  if (!incident) return <section className="rounded-lg border bg-white p-5 text-sm text-slate-500 shadow-sm">Select an incident marker to view details.</section>;
  const hasGps = hasIncidentGps(incident);
  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">Selected Incident</h3>
      <p className="mt-1 text-sm font-bold text-red-600">{incident.referenceNumber}</p>
      <div className="mt-4 space-y-3">
        <Info label="Type" value={label(incident.type)} />
        <Info label="Priority" value={`${label(incident.priority)} - ${incident.priorityScore ?? 0}/100`} />
        <Info label="Status" value={label(incident.status)} />
        <Info label="Location" value={incident.manualLocation ?? (hasGps ? `${incident.latitude?.toFixed(5)}, ${incident.longitude?.toFixed(5)}` : "Waiting for location")} />
        <Info label="Reporter" value={incident.anonymousReport ? "Anonymous" : incident.reporterName || "Citizen"} />
        <Info label="Details" value={incident.description || "No description provided."} />
      </div>
      {hasGps ? <a className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" href={googleMapUrl(incident.latitude as number, incident.longitude as number)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Open route</a> : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-sm font-medium text-slate-950">{value}</p></div>;
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-lg border bg-white p-4 shadow-sm">{icon}<p className="mt-3 text-2xl font-bold text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>;
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

