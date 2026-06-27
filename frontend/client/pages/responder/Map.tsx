import { useEffect, useMemo, useState } from "react";
import { Clock, LocateFixed, MapPin, Navigation, ShieldCheck } from "lucide-react";
import RealTimeMap, { type MapMarker, type MapRoute } from "@/components/maps/RealTimeMap";
import { dispatchApi } from "@/services/api/dispatch";
import { locationsApi } from "@/services/api/locations";
import type { AssignmentResponse } from "@/types/api";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function Map() {
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<{ distanceKm: number; etaMinutes: number; instructions: string[]; route: MapRoute } | null>(null);

  useEffect(() => {
    dispatchApi.mine()
      .then(setAssignments)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    locateAndShare(false);
  }, []);

  const active = useMemo(
    () => assignments.find((assignment) => !["COMPLETED", "OFFLINE"].includes(assignment.responderStatus)) ?? assignments[0],
    [assignments],
  );

  useEffect(() => {
    if (!active) {
      setRoute(null);
      return;
    }
    dispatchApi.route(active.id)
      .then((response) => setRoute({
        distanceKm: response.distanceKm,
        etaMinutes: response.etaMinutes,
        instructions: response.instructions,
        route: {
          id: `assignment-route-${active.id}`,
          tone: "blue",
          points: response.geometry.map((point) => ({ lat: point.latitude, lng: point.longitude })),
        },
      }))
      .catch(() => setRoute(null));
  }, [active?.id]);

  const markers: MapMarker[] = assignments
    .filter((assignment) => typeof assignment.latitude === "number" && typeof assignment.longitude === "number")
    .map((assignment) => ({
      id: assignment.id,
      lat: assignment.latitude as number,
      lng: assignment.longitude as number,
      title: assignment.referenceNumber,
      subtitle: `${label(assignment.type)} - ${label(assignment.priority)} - ${assignment.location}`,
      tone: assignment.priority === "CRITICAL" ? "red" : "amber",
    }));

  const routeSteps = active
    ? [
        { label: "Current Status", value: label(active.responderStatus), tone: "bg-blue-50" },
        { label: "Destination", value: active.location, tone: "bg-emerald-50" },
        { label: "Priority", value: label(active.priority), tone: "bg-amber-50" },
        { label: "ETA", value: `${active.etaMinutes} minutes`, tone: "bg-slate-50" },
      ]
    : [];

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

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Live GPS & Navigation</h1>
        <p className="mt-1 text-slate-600">Real map navigation to assigned incident destinations.</p>
      </div>

      {error ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RealTimeMap markers={markers} userLocation={userLocation} onLocate={() => locateAndShare(true)} locating={locating} routes={route ? [route.route] : []} />
        </div>

        <div className="space-y-5">
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-950">Current Route</h3>
            {active ? (
              <div className="space-y-3">
                {routeSteps.map((step) => (
                  <div key={step.label} className={`rounded-lg p-3 ${step.tone}`}>
                    <p className="text-xs font-semibold text-slate-500">{step.label}</p>
                    <p className="text-sm font-medium text-slate-950">{step.value}</p>
                  </div>
                ))}
                {route ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs font-semibold text-blue-700">Optimized route</p>
                    <p className="text-sm font-bold text-slate-950">{route.distanceKm} km - {route.etaMinutes} min</p>
                  </div>
                ) : null}
                <a className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700" href={active.latitude && active.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${active.latitude},${active.longitude}` : undefined} target="_blank" rel="noreferrer">
                  <Navigation className="h-4 w-4" />
                  Open Turn-by-Turn Route
                </a>
              </div>
            ) : (
              <p className="text-sm text-slate-500">You do not have an active assignment right now.</p>
            )}
          </section>

          {route ? (
            <section className="rounded-lg border bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-semibold text-slate-950">Route Instructions</h3>
              <ol className="space-y-2 text-sm text-slate-700">
                {route.instructions.map((instruction, index) => <li key={instruction} className="rounded-lg bg-slate-50 p-3"><span className="font-bold">{index + 1}.</span> {instruction}</li>)}
              </ol>
            </section>
          ) : null}

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
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-xl font-bold text-slate-950">{assignments.filter((item) => item.responderStatus === "ASSIGNED").length}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <p className="font-semibold text-slate-950">Keep status current</p>
                <p className="mt-1 text-sm text-slate-700">Dispatcher maps refresh from your consented GPS updates.</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading assignments...</p> : null}
    </div>
  );
}

