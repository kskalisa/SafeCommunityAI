import { AlertCircle, ArrowRight, Clock, Loader2, MapPin, Radio, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/services/api/dashboard";
import { incidentsApi } from "@/services/api/incidents";
import { usersApi } from "@/services/api/users";
import { resourcesApi } from "@/services/api/resources";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function DispatcherDashboardPage() {
  const dashboard = useQuery({ queryKey: ["dashboard", "dispatcher"], queryFn: dashboardApi.me });
  const queue = useQuery({ queryKey: ["incidents", "queue"], queryFn: incidentsApi.queue });
  const responders = useQuery({ queryKey: ["responders", "details"], queryFn: usersApi.responderDetails });
  const resources = useQuery({ queryKey: ["resources"], queryFn: resourcesApi.list });
  const metrics = dashboard.data?.metrics ?? {};
  const incidents = queue.data ?? [];
  const responderList = responders.data ?? [];
  const availableResponders = responderList.filter((responder) => responder.availabilityStatus === "AVAILABLE");
  const readyResources = (resources.data ?? []).filter((resource) => resource.status === "AVAILABLE");

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-5 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-950 lg:text-4xl">Dispatcher Workbench</h1>
          <p className="text-slate-600">Watch incoming reports, choose responders, and keep field support moving.</p>
        </div>
        {dashboard.isFetching || queue.isFetching ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4 lg:gap-6">
        <Metric title="Waiting for dispatch" value={Number(metrics.pendingIncidentQueue ?? 0)} icon={<AlertCircle className="h-5 w-5" />} tone="red" />
        <Metric title="Active responses" value={Number(metrics.activeIncidents ?? 0)} icon={<MapPin className="h-5 w-5" />} tone="orange" />
        <Metric title="Available responders" value={availableResponders.length} icon={<Users className="h-5 w-5" />} tone="blue" />
        <Metric title="Ready resources" value={readyResources.length} icon={<ShieldCheck className="h-5 w-5" />} tone="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-950">Incidents Needing Attention</h2>
            <Link to="/dashboard/dispatcher/queue" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
              Open queue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {incidents.slice(0, 5).map((incident) => (
              <div key={incident.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="font-bold text-slate-950">{incident.referenceNumber}</span>
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${incident.priority === "CRITICAL" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{label(incident.priority)}</span>
                </div>
                <p className="text-sm text-slate-700">{incident.description || label(incident.type)}</p>
                <p className="mt-2 text-xs text-slate-500">{incident.manualLocation || "Location shared by GPS"} - {new Date(incident.reportedAt).toLocaleString()}</p>
              </div>
            ))}
            {!queue.isLoading && incidents.length === 0 ? <p className="text-sm text-slate-500">No incidents are waiting right now.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-950">Responder Readiness</h2>
          <div className="space-y-3">
            {responderList.slice(0, 6).map((responder) => (
              <div key={responder.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">{responder.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{responder.organization || responder.email}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs font-bold ${responder.availabilityStatus === "AVAILABLE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {label(responder.availabilityStatus || "OFFLINE")}
                </span>
              </div>
            ))}
            {!responders.isLoading && responderList.length === 0 ? <p className="text-sm text-slate-500">No responders registered yet.</p> : null}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link to="/dashboard/dispatcher/map" className="rounded-lg bg-blue-50 p-4 text-sm font-semibold text-blue-700 hover:bg-blue-100"><Radio className="mb-2 h-5 w-5" /> View live map</Link>
            <Link to="/dashboard/dispatcher/reports" className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-800 hover:bg-slate-100"><Clock className="mb-2 h-5 w-5" /> Review reports</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ title, value, icon, tone }: { title: string; value: string | number; icon: React.ReactNode; tone: "red" | "orange" | "blue" | "green" }) {
  const cls = { red: "border-red-500 text-red-600", orange: "border-orange-500 text-orange-600", blue: "border-blue-500 text-blue-600", green: "border-green-500 text-green-600" }[tone];
  return <div className={`rounded-lg border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${cls}`}><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">{title}</h3>{icon}</div><p className="text-3xl font-bold text-slate-950">{value}</p></div>;
}
