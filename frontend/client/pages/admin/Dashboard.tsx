import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { Activity, AlertTriangle, Bell, Building2, Clock, FileBarChart, LifeBuoy, Package, Settings, Shield, Siren, Users } from "lucide-react";
import { adminApi } from "@/services/api/admin";
import { resourcesApi, hospitalsApi } from "@/services/api/resources";
import { notificationsApi } from "@/services/api/notifications";
import { AdminButton, AdminPageShell, EmptyState, LoadingState, MetricCard, Panel, StatusBadge } from "@/components/admin/AdminUI";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function AdminDashboardPage() {
  const [analytics, users, logs, resources, hospitals, notifications] = useQueries({
    queries: [
      { queryKey: ["admin", "analytics"], queryFn: adminApi.analytics },
      { queryKey: ["admin", "users"], queryFn: adminApi.users },
      { queryKey: ["admin", "audit-logs"], queryFn: adminApi.auditLogs },
      { queryKey: ["resources"], queryFn: resourcesApi.list },
      { queryKey: ["hospitals"], queryFn: () => hospitalsApi.list() },
      { queryKey: ["notifications"], queryFn: notificationsApi.list },
    ],
  });

  const data = analytics.data;
  const userList = users.data ?? [];
  const auditLogs = logs.data ?? [];
  const resourceList = resources.data ?? [];
  const facilityList = hospitals.data ?? [];
  const notificationList = notifications.data ?? [];
  const onlineResponders = userList.filter((user) => user.role === "RESPONDER" && user.enabled && !user.accountLocked).length;
  const pendingReports = data?.pendingIncidentQueue ?? 0;
  const auditAlerts = auditLogs.filter((log) => /FAIL|LOCK|DENIED|INVALID|ERROR/i.test(`${log.action} ${log.detail ?? ""}`)).length;
  const loading = [analytics, users, logs, resources, hospitals, notifications].some((query) => query.isLoading);

  return (
    <AdminPageShell
      title="System Command Center"
      description="A complete administrative view of users, incidents, response capacity, resources, facilities, notifications, and security activity."
      actions={<AdminButton variant="secondary" onClick={() => window.location.reload()}><Activity className="h-4 w-4" />Refresh</AdminButton>}
    >
      {loading ? <LoadingState /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total users" value={data?.userCount ?? 0} helper={`${userList.filter((user) => user.enabled).length} active accounts`} icon={<Users className="h-5 w-5" />} tone="blue" />
        <MetricCard label="Active incidents" value={data?.activeIncidents ?? 0} helper={`${data?.incidentCount ?? 0} total logged`} icon={<Siren className="h-5 w-5" />} tone="red" />
        <MetricCard label="Responders online" value={onlineResponders} helper={`${data?.activeResponders ?? onlineResponders} active responders`} icon={<LifeBuoy className="h-5 w-5" />} tone="emerald" />
        <MetricCard label="Pending reports" value={pendingReports} helper="Awaiting triage or dispatch" icon={<AlertTriangle className="h-5 w-5" />} tone="amber" />
        <MetricCard label="Resources available" value={data?.availableResources ?? resourceList.filter((item) => item.status === "AVAILABLE").length} helper={`${resourceList.length} total assets`} icon={<Package className="h-5 w-5" />} tone="purple" />
        <MetricCard label="Facilities" value={facilityList.length} helper={`${facilityList.filter((item) => !item.ambulanceDiversion).length} accepting patients`} icon={<Building2 className="h-5 w-5" />} tone="blue" />
        <MetricCard label="Notifications" value={notificationList.length} helper={`${notificationList.filter((item) => !item.read).length} unread updates`} icon={<Bell className="h-5 w-5" />} tone="slate" />
        <MetricCard label="Audit alerts" value={auditAlerts} helper="Security-sensitive events" icon={<Shield className="h-5 w-5" />} tone={auditAlerts > 0 ? "red" : "emerald"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Incident Statistics & Trends" description="Recent operating tempo and status distribution.">
          <div className="space-y-5">
            {(data?.dailyIncidentTrend ?? []).slice(-7).map((row) => {
              const max = Math.max(1, ...(data?.dailyIncidentTrend ?? []).map((item) => item.incidents));
              return (
                <div key={row.date}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-slate-700">{new Date(row.date).toLocaleDateString()}</span>
                    <span className="font-bold text-slate-950">{row.incidents}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-red-600" style={{ width: `${Math.max(4, (row.incidents / max) * 100)}%` }} /></div>
                </div>
              );
            })}
            {(data?.dailyIncidentTrend ?? []).length === 0 ? <EmptyState title="No trend data yet" text="Incident trends will appear once reports are submitted." /> : null}
          </div>
        </Panel>

        <Panel title="Quick Actions" description="Frequent administration workflows.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {[
              { to: "/dashboard/admin/users", label: "Manage users", icon: Users },
              { to: "/dashboard/admin/incidents", label: "Review incidents", icon: Siren },
              { to: "/dashboard/admin/responders", label: "Responder readiness", icon: LifeBuoy },
              { to: "/dashboard/admin/resources", label: "Resource inventory", icon: Package },
              { to: "/dashboard/admin/analytics", label: "Reports & analytics", icon: FileBarChart },
              { to: "/dashboard/admin/settings", label: "System settings", icon: Settings },
            ].map((action) => (
              <Link key={action.to} to={action.to} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 font-bold text-slate-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">
                <span className="flex items-center gap-3"><action.icon className="h-5 w-5" />{action.label}</span>
                <span>Open</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="User Statistics by Role">
          <div className="space-y-4">
            {Object.entries(data?.usersByRole ?? {}).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <StatusBadge tone={role === "ADMIN" ? "red" : role === "DISPATCHER" ? "purple" : role === "RESPONDER" ? "amber" : "blue"}>{label(role)}</StatusBadge>
                <span className="text-xl font-bold text-slate-950">{count}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Response Performance">
          <div className="space-y-4">
            <MetricLine label="Average response" value={`${data?.averageResponseMinutes ?? 0} min`} />
            <MetricLine label="Resolved incidents" value={data?.resolvedIncidents ?? 0} />
            <MetricLine label="AI confidence" value={`${Math.round((data?.aiAverageConfidence ?? 0) * 100)}%`} />
          </div>
        </Panel>
        <Panel title="Recent Activity Feed">
          <div className="space-y-4">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-red-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{label(log.action)}</p>
                  <p className="text-xs text-slate-500">{log.actorEmail} · {new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AdminPageShell>
  );
}

function MetricLine({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><span className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Clock className="h-4 w-4" />{label}</span><span className="font-bold text-slate-950">{value}</span></div>;
}
