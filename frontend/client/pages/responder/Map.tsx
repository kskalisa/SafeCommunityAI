import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock, ExternalLink, LocateFixed, Navigation, ShieldCheck } from "lucide-react";
import RealTimeMap, { type MapMarker } from "@/components/maps/RealTimeMap";
import { dispatchApi } from "@/services/api/dispatch";
import { locationsApi } from "@/services/api/locations";
import type { AssignmentResponse } from "@/types/api";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function Map() {
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatchApi.mine()
      .then((items) => {
        setAssignments(items);
        const firstActive = items.find((assignment) => !["COMPLETED", "OFFLINE"].includes(assignment.responderStatus));
        setSelectedAssignmentId(firstActive?.id ?? items[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    locateAndShare(false);
  }, []);

  const activeAssignments = useMemo(() => assignments.filter((assignment) => !["COMPLETED", "OFFLINE"].includes(assignment.responderStatus)), [assignments]);
  const selected = useMemo(() => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? activeAssignments[0] ?? assignments[0], [assignments, selectedAssignmentId, activeAssignments]);
  const markers: MapMarker[] = assignments
    .filter(hasAssignmentGps)
    .map((assignment) => ({
      id: `assignment-${assignment.id}`,
      lat: assignment.latitude as number,
      lng: assignment.longitude as number,
      title: assignment.referenceNumber,
      subtitle: `${label(assignment.type)} - ${label(assignment.priority)} - ${assignment.location}`,
      tone: assignment.priority === "CRITICAL" ? "red" : "amber",
    }));
  const mapCenter = selected && hasAssignmentGps(selected) ? { lat: selected.latitude as number, lng: selected.longitude as number } : undefined;

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
        await locationsApi.updateMe({ latitude: next.lat, longitude: next.lng, accuracyMeters: next.accuracy, consentProvided: true });
        setLocating(false);
      },
      () => {
        setError(force ? "Allow location access on this device to share responder GPS." : null);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    );
  }

  function handleMarkerClick(marker: MapMarker) {
    const assignmentId = markerIdNumber(marker.id, "assignment-");
    if (assignmentId) setSelectedAssignmentId(assignmentId);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Assigned Incident Map</h1>
        <p className="mt-1 text-slate-600">View assigned incident locations here and open Google Maps for turn-by-turn routing.</p>
      </div>

      {error ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RealTimeMap markers={markers} userLocation={userLocation} initialCenter={mapCenter} onLocate={() => locateAndShare(true)} locating={locating} onMarkerClick={handleMarkerClick} />
        </div>

        <div className="space-y-5">
          <AssignmentDetail assignment={selected} />

          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-950"><LocateFixed className="h-5 w-5 text-blue-600" /> Responder GPS</h3>
            <p className="text-sm text-slate-600">{userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : "No GPS fix yet"}</p>
            <p className="mt-1 text-xs text-slate-500">{userLocation?.accuracy ? `Accuracy ${Math.round(userLocation.accuracy)}m` : "Refresh GPS before accepting field work."}</p>
            <button onClick={() => locateAndShare(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50">
              <LocateFixed className="h-4 w-4" />
              Refresh GPS
            </button>
          </section>

          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-950"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Assignment Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-xl font-bold text-slate-950">{assignments.length}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Active</p>
                <p className="text-xl font-bold text-slate-950">{activeAssignments.length}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <p className="font-semibold text-slate-950">Keep status current</p>
                <p className="mt-1 text-sm text-slate-700">Manage assignment statuses from the Incidents page. This map is for location awareness and routing.</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading assignments...</p> : null}
    </div>
  );
}

function AssignmentDetail({ assignment }: { assignment?: AssignmentResponse }) {
  if (!assignment) return <section className="rounded-lg border bg-white p-5 text-sm text-slate-500 shadow-sm">You do not have an assigned incident with a location yet.</section>;
  const hasGps = hasAssignmentGps(assignment);
  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">Assigned Incident</h3>
          <p className="text-sm font-bold text-red-600">{assignment.referenceNumber}</p>
        </div>
        <AlertCircle className="h-5 w-5 text-red-600" />
      </div>
      <div className="space-y-3">
        <Info label="Type" value={label(assignment.type)} />
        <Info label="Priority" value={label(assignment.priority)} />
        <Info label="Status" value={`${label(assignment.incidentStatus)} / ${label(assignment.responderStatus)}`} />
        <Info label="Location" value={assignment.location || (hasGps ? `${assignment.latitude?.toFixed(5)}, ${assignment.longitude?.toFixed(5)}` : "Waiting for GPS coordinates")} />
        <Info label="Details" value={assignment.description || "No extra details provided."} />
      </div>
      {hasGps ? <a className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700" href={googleMapUrl(assignment.latitude as number, assignment.longitude as number)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Open in Google Maps</a> : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-sm font-medium text-slate-950">{value}</p></div>;
}

function hasAssignmentGps(assignment: AssignmentResponse) {
  return typeof assignment.latitude === "number" && typeof assignment.longitude === "number";
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
