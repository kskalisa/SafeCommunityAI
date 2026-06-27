import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, MapPin, Navigation, Radio, Users } from "lucide-react";
import RealTimeMap, { type MapMarker } from "@/components/maps/RealTimeMap";
import { incidentsApi } from "@/services/api/incidents";
import { locationsApi } from "@/services/api/locations";
import { resourcesApi } from "@/services/api/resources";
import { usersApi } from "@/services/api/users";
import type { IncidentResponse, LocationMarkerResponse, ResourceResponse, ResponderDetailResponse } from "@/types/api";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function DispatcherLiveMap() {
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
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

  const availableResources = useMemo(() => resources.filter((resource) => resource.status === "AVAILABLE"), [resources]);
  const availableResponders = responders.filter((responder) => responder.availabilityStatus === "AVAILABLE");
  const mapMarkers: MapMarker[] = [
    ...incidents
      .filter((incident) => typeof incident.latitude === "number" && typeof incident.longitude === "number")
      .map((incident) => ({
        id: `incident-${incident.id}`,
        lat: incident.latitude as number,
        lng: incident.longitude as number,
        title: incident.referenceNumber,
        subtitle: `${label(incident.type)} - ${label(incident.priority)} - ${incident.manualLocation ?? "Shared location"}`,
        tone: incident.priority === "CRITICAL" ? "red" : "amber",
      } satisfies MapMarker)),
    ...locations.map((location) => ({
      id: `location-${location.id}`,
      lat: location.latitude,
      lng: location.longitude,
      title: location.fullName,
      subtitle: `${label(location.role)} location updated ${new Date(location.capturedAt).toLocaleTimeString()}`,
      tone: location.role === "RESPONDER" ? "green" : "blue",
    } satisfies MapMarker)),
  ];

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
          <RealTimeMap markers={mapMarkers} />
        </div>

        <div className="space-y-5">
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-950"><AlertCircle className="h-5 w-5 text-red-600" /> Incidents on the Map</h3>
            <div className="space-y-2">
              {incidents.slice(0, 6).map((incident) => (
                <div key={incident.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-900">{incident.referenceNumber}</p>
                  <p className="text-xs text-slate-500">{label(incident.type)} - {label(incident.priority)}</p>
                  <p className="mt-1 text-xs text-slate-500">{incident.latitude && incident.longitude ? `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}` : incident.manualLocation ?? "Waiting for location"}</p>
                </div>
              ))}
              {!loading && incidents.length === 0 && <p className="text-sm text-slate-500">No active incidents need dispatch.</p>}
            </div>
          </section>

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
            <Summary icon={<Radio className="h-5 w-5 text-emerald-600" />} label="Shared locations" value={locations.length} />
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

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-lg border bg-white p-4 shadow-sm">{icon}<p className="mt-3 text-2xl font-bold text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>;
}
