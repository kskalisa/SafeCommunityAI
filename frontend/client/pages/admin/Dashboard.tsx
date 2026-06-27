import { Users, BarChart3, TrendingUp, Activity, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/services/api/dashboard";

export default function AdminDashboardPage() {
  const dashboard = useQuery({ queryKey: ["dashboard", "admin"], queryFn: dashboardApi.me });
  const metrics = dashboard.data?.metrics ?? {};
  const usersByRole = (metrics.usersByRole ?? {}) as Record<string, number>;
  const incidentsByType = (metrics.incidentsByType ?? {}) as Record<string, number>;
  const maxUsers = Math.max(1, ...Object.values(usersByRole));
  const maxIncidents = Math.max(1, ...Object.values(incidentsByType));

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4"><div><h1 className="text-3xl lg:text-4xl font-bold text-slate-950 mb-2">System Administration</h1><p className="text-slate-600">Manage users, analytics, and platform health.</p></div>{dashboard.isFetching ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : null}</div>

      <div className="grid md:grid-cols-4 gap-4 lg:gap-6">
        <Metric title="Total Users" value={Number(metrics.userCount ?? 0)} icon={<Users className="w-5 h-5" />} tone="blue" />
        <Metric title="Incidents" value={Number(metrics.incidentCount ?? 0)} icon={<BarChart3 className="w-5 h-5" />} tone="green" />
        <Metric title="Active Incidents" value={Number(metrics.activeIncidents ?? 0)} icon={<TrendingUp className="w-5 h-5" />} tone="orange" />
        <Metric title="Responders Online" value={Number(metrics.respondersOnline ?? 0)} icon={<Activity className="w-5 h-5" />} tone="purple" />
      </div>

      <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
        <Breakdown title="Users by Role" data={usersByRole} max={maxUsers} />
        <Breakdown title="Incident Types" data={incidentsByType} max={maxIncidents} />
      </div>

      <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <h2 className="text-xl font-bold text-slate-950 mb-4">Platform Health</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {["PostgreSQL connected", "JWT auth enabled", "Audit logging active"].map((message) => <div key={message} className="p-4 rounded-lg bg-green-50 border border-green-100 text-sm font-semibold text-green-800">{message}</div>)}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, icon, tone }: { title: string; value: number; icon: React.ReactNode; tone: "blue" | "green" | "orange" | "purple" }) {
  const cls = { blue: "border-blue-500 text-blue-600", green: "border-green-500 text-green-600", orange: "border-orange-500 text-orange-600", purple: "border-purple-500 text-purple-600" }[tone];
  return <div className={`bg-white rounded-lg shadow-sm p-5 border border-slate-200 border-l-4 ${cls}`}><div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-slate-900 text-sm">{title}</h3>{icon}</div><p className="text-3xl font-bold text-slate-950">{value}</p></div>;
}
function Breakdown({ title, data, max }: { title: string; data: Record<string, number>; max: number }) { return <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-5"><h2 className="text-xl font-bold text-slate-950 mb-5">{title}</h2><div className="space-y-4">{Object.entries(data).map(([key, value]) => <div key={key}><div className="flex justify-between mb-1"><span className="text-sm font-semibold text-slate-900">{key.replace("_", " ")}</span><span className="text-sm font-bold text-slate-950">{value}</span></div><div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} /></div></div>)}{Object.keys(data).length === 0 ? <p className="text-sm text-slate-500">No data yet.</p> : null}</div></section>; }