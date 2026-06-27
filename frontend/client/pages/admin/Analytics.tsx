import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Download, FileText, TrendingUp, Users } from "lucide-react";
import { adminApi } from "@/services/api/admin";
import { downloadCsv, printPdf } from "@/lib/export";
import type { AnalyticsResponse, AuditLogResponse, UserResponse } from "@/types/api";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
const percent = (count: number, total: number) => Math.round((count / Math.max(1, total)) * 100);

const emptyAnalytics: AnalyticsResponse = {
  generatedAt: "",
  userCount: 0,
  incidentCount: 0,
  activeIncidents: 0,
  resolvedIncidents: 0,
  pendingIncidentQueue: 0,
  activeResponders: 0,
  availableResources: 0,
  averageResponseMinutes: 0,
  aiAverageConfidence: 0,
  usersByRole: {} as AnalyticsResponse["usersByRole"],
  incidentsByType: {} as AnalyticsResponse["incidentsByType"],
  incidentsByStatus: {} as AnalyticsResponse["incidentsByStatus"],
  incidentsByPriority: {} as AnalyticsResponse["incidentsByPriority"],
  resourcesByStatus: {} as AnalyticsResponse["resourcesByStatus"],
  dailyIncidentTrend: [],
  responderPerformance: [],
  recentIncidents: [],
};

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse>(emptyAnalytics);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.analytics(), adminApi.users(), adminApi.auditLogs()])
      .then(([analyticsData, userList, auditLogs]) => {
        setAnalytics(analyticsData);
        setUsers(userList);
        setLogs(auditLogs);
      })
      .finally(() => setLoading(false));
  }, []);

  const roleRows = useMemo(() => Object.entries(analytics.usersByRole).map(([role, count]) => ({ role, count })), [analytics.usersByRole]);

  const incidentRows = useMemo(
    () =>
      Object.entries(analytics.incidentsByType)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => ({ type, count, pct: percent(count, analytics.incidentCount) })),
    [analytics.incidentCount, analytics.incidentsByType],
  );

  const enabledUsers = users.filter((user) => user.enabled).length;
  const recentActions = logs.slice(0, 6);
  const confidencePct = Math.round((analytics.aiAverageConfidence ?? 0) * 100);

  const exportCsv = () => {
    downloadCsv("safecommunity-admin-analytics.csv", [
      { metric: "Total Users", value: analytics.userCount },
      { metric: "Enabled Users", value: enabledUsers },
      { metric: "Total Incidents", value: analytics.incidentCount },
      { metric: "Active Incidents", value: analytics.activeIncidents },
      { metric: "Resolved Incidents", value: analytics.resolvedIncidents },
      { metric: "Average Response Minutes", value: analytics.averageResponseMinutes },
      { metric: "Average AI Confidence", value: `${confidencePct}%` },
      ...roleRows.map((row) => ({ metric: `Users: ${row.role}`, value: row.count })),
      ...incidentRows.map((row) => ({ metric: `Incidents: ${row.type}`, value: row.count })),
    ]);
  };

  const exportPdf = () => {
    printPdf("SafeCommunityAI Admin Analytics", [
      {
        heading: "System Summary",
        rows: [
          { metric: "Total Users", value: analytics.userCount },
          { metric: "Enabled Users", value: enabledUsers },
          { metric: "Total Incidents", value: analytics.incidentCount },
          { metric: "Active Incidents", value: analytics.activeIncidents },
          { metric: "Average Response Minutes", value: analytics.averageResponseMinutes },
          { metric: "Average AI Confidence", value: `${confidencePct}%` },
        ],
      },
      { heading: "Users by Role", rows: roleRows },
      { heading: "Incident Types", rows: incidentRows },
      {
        heading: "Recent Activity",
        rows: recentActions.map((log) => ({
          action: log.action,
          actor: log.actorEmail,
          entity: log.entityType ?? "",
          detail: log.detail ?? "",
          createdAt: new Date(log.createdAt).toLocaleString(),
        })),
      },
    ]);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Analytics & Insights</h1>
          <p className="mt-1 text-slate-600">System-wide operating health from live users, incidents, resources, audits, and AI scoring.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700">
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 font-medium text-slate-800 transition hover:bg-slate-50">
            <FileText className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Users", value: analytics.userCount, icon: Users, tone: "border-blue-500" },
          { label: "Enabled Users", value: enabledUsers, icon: Users, tone: "border-emerald-500" },
          { label: "Total Incidents", value: analytics.incidentCount, icon: AlertCircle, tone: "border-amber-500" },
          { label: "AI Confidence", value: `${confidencePct}%`, icon: TrendingUp, tone: "border-rose-500" },
        ].map((item) => (
          <div key={item.label} className={`rounded-lg border bg-white p-5 shadow-sm ${item.tone}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">{item.label}</p>
              <item.icon className="h-5 w-5 text-slate-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-950">{loading ? "-" : item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-950">
            <BarChart3 className="h-5 w-5" />
            Users by Role
          </h2>
          <div className="space-y-4">
            {roleRows.map((item) => {
              const pct = percent(item.count, analytics.userCount);
              return (
                <div key={item.role}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{label(item.role)}</span>
                    <span className="font-semibold text-slate-950">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-950">
            <TrendingUp className="h-5 w-5" />
            Incident Distribution
          </h2>
          <div className="space-y-4">
            {incidentRows.length === 0 ? (
              <p className="text-sm text-slate-500">No incidents have been reported yet.</p>
            ) : (
              incidentRows.map((item) => (
                <div key={item.type}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{label(item.type)}</span>
                    <span className="font-semibold text-slate-950">
                      {item.count} ({item.pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-950">Recent Platform Activity</h2>
        <div className="divide-y divide-slate-100">
          {recentActions.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-slate-900">{label(log.action)}</p>
                <p className="text-sm text-slate-500">{log.actorEmail}</p>
              </div>
              <p className="text-sm text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
