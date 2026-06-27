import { TrendingUp, Clock, CheckCircle, AlertCircle, BarChart3, Star } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dispatchApi } from "@/services/api/dispatch";

export default function Performance() {
  const assignments = useQuery({ queryKey: ["assignments", "mine"], queryFn: dispatchApi.mine });
  const data = assignments.data ?? [];
  const completed = data.filter((item) => item.responderStatus === "COMPLETED").length;
  const active = data.filter((item) => ["EN_ROUTE", "ON_SCENE", "TRANSPORTING"].includes(item.responderStatus)).length;
  const pending = data.filter((item) => item.responderStatus === "ASSIGNED").length;
  const avgEta = data.length ? Math.round(data.reduce((sum, item) => sum + (item.etaMinutes || 0), 0) / data.length) : 0;

  const byType = useMemo(() => {
    const counts = data.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([type, count]) => ({ type: friendly(type), count }));
  }, [data]);

  const timeline = data.slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-red-600">Performance</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 lg:text-4xl">Your response summary</h1>
        <p className="mt-2 text-slate-600">Track assignments, response activity, and the kinds of calls you have handled.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Total assignments" value={data.length} helper="All assigned calls" icon={<CheckCircle className="h-5 w-5" />} tone="blue" />
        <Metric title="Completed" value={completed} helper="Finished responses" icon={<TrendingUp className="h-5 w-5" />} tone="green" />
        <Metric title="Active now" value={active + pending} helper="Needs attention" icon={<AlertCircle className="h-5 w-5" />} tone="orange" />
        <Metric title="Avg ETA" value={avgEta ? `${avgEta}m` : "-"} helper="From assignments" icon={<Clock className="h-5 w-5" />} tone="slate" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-slate-950"><BarChart3 className="h-5 w-5 text-red-600" /> Calls by type</h2>
          {byType.length === 0 ? <Empty text="No assignments yet. Your call mix will appear here." /> : <div className="space-y-4">{byType.map((item) => <Progress key={item.type} label={item.type} value={item.count} max={Math.max(...byType.map((row) => row.count), 1)} />)}</div>}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-slate-950"><Star className="h-5 w-5 text-amber-500" /> Service quality</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Quality label="Status updates" value={data.length ? "Good" : "Waiting"} />
            <Quality label="Route readiness" value={data.some((item) => item.latitude && item.longitude) ? "Ready" : "No routes yet"} />
            <Quality label="Open requests" value={String(pending)} />
            <Quality label="Field activity" value={active ? "In progress" : "Calm"} />
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-bold text-slate-950">Recent assignments</h2><p className="mt-1 text-sm text-slate-500">Latest calls assigned to you</p></div>
        {timeline.length === 0 ? <Empty text="No recent assignments yet." /> : <div className="divide-y divide-slate-200">{timeline.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold text-slate-950">{item.referenceNumber}</p><p className="text-sm text-slate-500">{friendly(item.type)} - {item.location}</p></div><span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{friendly(item.responderStatus)}</span></div>)}</div>}
      </section>
    </div>
  );
}

function Metric({ title, value, helper, icon, tone }: { title: string; value: string | number; helper: string; icon: React.ReactNode; tone: "blue" | "green" | "orange" | "slate" }) {
  const cls = { blue: "border-blue-500 text-blue-600", green: "border-emerald-500 text-emerald-600", orange: "border-orange-500 text-orange-600", slate: "border-slate-500 text-slate-600" }[tone];
  return <div className={`rounded-lg border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${cls}`}><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">{title}</h3>{icon}</div><p className="text-3xl font-bold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{helper}</p></div>;
}
function Progress({ label, value, max }: { label: string; value: number; max: number }) { return <div><div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-slate-900">{label}</span><span className="font-bold text-slate-950">{value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-red-600" style={{ width: `${Math.max(8, (value / max) * 100)}%` }} /></div></div>; }
function Quality({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-950">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">{text}</div>; }
function friendly(value: string) { return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()); }
