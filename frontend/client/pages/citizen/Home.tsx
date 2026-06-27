import { Link } from "react-router-dom";
import { AlertCircle, Clock, Shield, MapPin, MessageCircle, Phone, CheckCircle2, Loader2, Navigation, PlusCircle, HeartPulse } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "@/services/api/dashboard";
import { incidentsApi } from "@/services/api/incidents";
import { locationsApi } from "@/services/api/locations";
import type { IncidentResponse } from "@/types/api";

export default function CitizenHome() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ["dashboard", "citizen"], queryFn: dashboardApi.me });
  const incidents = useQuery({ queryKey: ["incidents", "mine"], queryFn: incidentsApi.mine });

  const panic = useMutation({
    mutationFn: async () => {
      const position = await currentPosition();
      await locationsApi.updateMe({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy, consentProvided: true });
      return incidentsApi.panic({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy, consentProvided: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const allIncidents = incidents.data ?? [];
  const recentIncidents = allIncidents.slice(0, 4);
  const activeIncidents = Number(dashboard.data?.metrics.activeIncidents ?? allIncidents.filter((i) => !["RESOLVED", "CANCELLED"].includes(i.status)).length);
  const resolvedCount = allIncidents.filter((i) => i.status === "RESOLVED").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 lg:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-red-600">Citizen dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 lg:text-4xl">Help is one tap away</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Send an emergency alert, share your live location, and follow the latest response updates from one place.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatusPill icon={<Shield className="h-4 w-4" />} label="Location consent" value="Ready" />
              <StatusPill icon={<Clock className="h-4 w-4" />} label="Open reports" value={String(activeIncidents)} />
              <StatusPill icon={<CheckCircle2 className="h-4 w-4" />} label="Resolved" value={String(resolvedCount)} />
            </div>
          </div>
          <div className="border-t border-slate-200 bg-red-50 p-6 lg:border-l lg:border-t-0 lg:p-8">
            {panic.isSuccess ? <Alert tone="success" message="Emergency alert sent. Dispatch can now see your location and report." /> : null}
            {panic.isError ? <Alert tone="danger" message={panic.error instanceof Error ? panic.error.message : "Unable to send emergency alert."} /> : null}
            <button
              onClick={() => panic.mutate()}
              disabled={panic.isPending}
              className="mt-4 flex min-h-40 w-full items-center justify-center gap-5 rounded-lg bg-red-600 p-6 text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-70"
            >
              {panic.isPending ? <Loader2 className="h-14 w-14 animate-spin" /> : <AlertCircle className="h-16 w-16" />}
              <span className="text-left">
                <span className="block text-5xl font-bold">SOS</span>
                <span className="mt-1 block text-base text-red-50">Send live location emergency alert</span>
              </span>
            </button>
            <Link to="/dashboard/citizen/report" className="mt-3 flex w-full items-center justify-center gap-3 rounded-lg border border-red-200 bg-white px-5 py-4 font-bold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50">
              <PlusCircle className="h-5 w-5" />
              Report non-emergency incident
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <Metric title="Active incidents" value={activeIncidents} helper="Open emergency reports" icon={<Clock className="h-5 w-5" />} color="red" />
        <Metric title="Unread alerts" value={Number(dashboard.data?.metrics.unreadNotifications ?? 0)} helper="Messages waiting" icon={<Shield className="h-5 w-5" />} color="blue" />
        <Metric title="Expected response" value={`${Number(dashboard.data?.metrics.averageResponseMinutes ?? 4)}m`} helper="Current estimate" icon={<MapPin className="h-5 w-5" />} color="green" />
        <Metric title="Total reports" value={allIncidents.length} helper="Your report history" icon={<HeartPulse className="h-5 w-5" />} color="slate" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Latest reports</h2>
              <p className="text-sm text-slate-500">Recent activity and response progress</p>
            </div>
            {incidents.isFetching ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <Link to="/dashboard/citizen/incidents" className="text-sm font-semibold text-red-600 hover:text-red-700">View all</Link>}
          </div>
          <IncidentList incidents={recentIncidents} loading={incidents.isLoading} />
        </section>

        <section className="space-y-4">
          <QuickAction to="/dashboard/citizen/map" icon={<Navigation className="h-5 w-5" />} title="Open live map" text="Check your shared location and active report markers." />
          <QuickAction to="/dashboard/citizen/report" icon={<PlusCircle className="h-5 w-5" />} title="Report non-emergency" text="Send details, location, witness, and evidence for dispatcher review." />
          <QuickAction to="/dashboard/citizen/contacts" icon={<Phone className="h-5 w-5" />} title="Manage contacts" text="Keep family, medical, and trusted contacts ready." />
          <QuickAction to="/dashboard/citizen/safety" icon={<Shield className="h-5 w-5" />} title="Safety guide" text="Review simple steps for common emergency situations." />
        </section>
      </div>
    </div>
  );
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("Location permission is required to send a GPS panic alert.")), { enableHighAccuracy: true, timeout: 10000 });
  });
}

function IncidentList({ incidents, loading }: { incidents: IncidentResponse[]; loading: boolean }) {
  if (loading) return <div className="p-8 text-sm text-slate-500">Loading your reports...</div>;
  if (incidents.length === 0) {
    return (
      <div className="p-8 text-center">
        <PlusCircle className="mx-auto h-10 w-10 text-slate-300" />
        <h3 className="mt-3 font-bold text-slate-950">No reports yet</h3>
        <p className="mt-1 text-sm text-slate-500">When you send an alert or report an incident, it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {incidents.map((incident) => (
        <div key={incident.id} className="p-5 transition hover:bg-slate-50">
          <div className="flex items-start gap-4">
            <StatusIcon status={incident.status} />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-950">{incident.referenceNumber}</h3>
                <Badge label={friendlyStatus(incident.status)} tone="blue" />
                <Badge label={friendlyPriority(incident.priority)} tone={incident.priority === "CRITICAL" ? "red" : "slate"} />
              </div>
              <p className="mb-3 text-sm text-slate-700">{incident.description || "Emergency alert sent from your phone."}</p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {incident.manualLocation || "Shared GPS location"}</span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(incident.reportedAt).toLocaleString()}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/dashboard/citizen/incidents" className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"><MessageCircle className="h-4 w-4" /> Updates</Link>
                <a href="tel:112" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"><Phone className="h-4 w-4" /> Call emergency</a>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex items-center gap-2 text-slate-500">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div><p className="mt-1 font-bold text-slate-950">{value}</p></div>;
}

function Metric({ title, value, helper, icon, color }: { title: string; value: string | number; helper: string; icon: React.ReactNode; color: "red" | "blue" | "green" | "slate" }) {
  const colors = { red: "border-red-500 text-red-600", blue: "border-blue-500 text-blue-600", green: "border-emerald-500 text-emerald-600", slate: "border-slate-500 text-slate-600" };
  return <div className={`rounded-lg border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${colors[color]}`}><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">{title}</h3>{icon}</div><p className="text-3xl font-bold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{helper}</p></div>;
}

function QuickAction({ to, icon, title, text }: { to: string; icon: React.ReactNode; title: string; text: string }) {
  return <Link to={to} className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">{icon}</div><div><h3 className="font-bold text-slate-950">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div></div></Link>;
}

function Badge({ label, tone }: { label: string; tone: "blue" | "red" | "slate" }) {
  const tones = { blue: "bg-blue-50 text-blue-700", red: "bg-red-50 text-red-700", slate: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{label}</span>;
}

function StatusIcon({ status }: { status: string }) {
  const cls = status === "RESOLVED" ? "bg-emerald-50 text-emerald-600" : ["EN_ROUTE", "ON_SCENE"].includes(status) ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600";
  return <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cls}`}><CheckCircle2 className="h-5 w-5" /></div>;
}

function friendlyStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function friendlyPriority(priority: string) {
  if (priority === "CRITICAL") return "Urgent";
  return friendlyStatus(priority);
}

function Alert({ tone, message }: { tone: "success" | "danger"; message: string }) {
  const cls = tone === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800";
  return <div className={`rounded-lg border p-4 text-sm font-semibold ${cls}`}>{message}</div>;
}
