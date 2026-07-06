import { Activity, AlertCircle, CheckCircle, Clock, MapPin, RadioTower, Route, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dispatchApi } from "@/services/api/dispatch";

export default function ResponderHome() {
  const assignments = useQuery({ queryKey: ["assignments", "mine"], queryFn: dispatchApi.mine });
  const data = assignments.data ?? [];
  const pending = data.filter((item) => item.responderStatus === "ASSIGNED");
  const active = data.filter((item) => ["EN_ROUTE", "ON_SCENE", "TRANSPORTING"].includes(item.responderStatus) || ["EN_ROUTE", "ON_SCENE"].includes(item.incidentStatus));
  const completed = data.filter((item) => item.responderStatus === "COMPLETED");
  const next = active[0] ?? pending[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-red-600">Responder workspace</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 lg:text-4xl">Ready for the next call</h1>
            <p className="mt-2 max-w-2xl text-slate-600">Use Incidents to manage assigned work, and use GPS & Navigation to view live locations.</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-slate-950">Availability</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-700"><Activity className="h-4 w-4 animate-pulse" /> Ready for dispatch</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="New requests" value={pending.length} icon={<Clock className="h-5 w-5" />} tone="blue" />
        <Metric title="Active now" value={active.length} icon={<AlertCircle className="h-5 w-5" />} tone="orange" />
        <Metric title="Completed" value={completed.length} icon={<CheckCircle className="h-5 w-5" />} tone="green" />
        <Metric title="Total assigned" value={data.length} icon={<RadioTower className="h-5 w-5" />} tone="slate" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Current focus</h2>
              <p className="mt-1 text-sm text-slate-600">Your next actionable assignment appears here.</p>
            </div>
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          {next ? (
            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-5">
              <p className="font-bold text-slate-950">{next.referenceNumber}</p>
              <p className="mt-1 text-sm text-slate-700">{next.description || "No extra details provided."}</p>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><MapPin className="h-4 w-4" />{next.location}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/dashboard/responder/incidents" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700">Manage incident</Link>
                <Link to="/dashboard/responder/map" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"><Route className="h-4 w-4" />View map</Link>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">No active assignment right now.</div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Quick actions</h2>
          <div className="mt-5 grid gap-3">
            <Link to="/dashboard/responder/incidents" className="flex items-center justify-between rounded-lg border border-slate-200 p-4 font-semibold text-slate-900 transition hover:bg-slate-50">Assigned incidents <AlertCircle className="h-5 w-5 text-red-600" /></Link>
            <Link to="/dashboard/responder/map" className="flex items-center justify-between rounded-lg border border-slate-200 p-4 font-semibold text-slate-900 transition hover:bg-slate-50">GPS & Navigation <MapPin className="h-5 w-5 text-blue-600" /></Link>
          </div>
        </section>
      </div>

      {assignments.isLoading ? <p className="text-sm text-slate-500">Loading responder overview...</p> : null}
    </div>
  );
}

function Metric({ title, value, icon, tone }: { title: string; value: number; icon: React.ReactNode; tone: "orange" | "blue" | "green" | "slate" }) {
  const cls = { orange: "border-orange-500 text-orange-600", blue: "border-blue-500 text-blue-600", green: "border-emerald-500 text-emerald-600", slate: "border-slate-500 text-slate-600" }[tone];
  return <div className={`rounded-lg border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${cls}`}><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">{title}</h3>{icon}</div><p className="text-3xl font-bold text-slate-950">{value}</p></div>;
}
