import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Filter,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminApi } from "@/services/api/admin";
import { resourcesApi } from "@/services/api/resources";
import { downloadCsv } from "@/lib/export";
import type { AnalyticsResponse, AuditLogResponse, IncidentResponse, IncidentStatus, PriorityLevel, ResourceResponse, UserResponse } from "@/types/api";

type SortKey = "referenceNumber" | "type" | "priority" | "status" | "reporterName" | "reportedAt" | "aiConfidenceScore";
type SortDirection = "asc" | "desc";
type ExportOptions = {
  summary: boolean;
  incidents: boolean;
  users: boolean;
  auditLogs: boolean;
  selectedOnly: boolean;
};
type PdfSection = {
  title: string;
  headers?: string[];
  rows: Array<Array<string | number>>;
};
type RealStats = {
  incidentCount: number;
  activeIncidents: number;
  resolvedIncidents: number;
  pendingIncidentQueue: number;
  userCount: number;
  activeResponders: number;
  availableResources: number;
  aiAverageConfidence: number;
};

const colors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];
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

const statusOptions: Array<"ALL" | IncidentStatus> = ["ALL", "PENDING", "PRIORITIZED", "ASSIGNED", "EN_ROUTE", "ON_SCENE", "RESOLVED", "CANCELLED"];
const priorityOptions: Array<"ALL" | PriorityLevel> = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const timeOptions = [
  { value: 0, label: "All time" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
];

export default function Analytics() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | IncidentStatus>("ALL");
  const [priority, setPriority] = useState<"ALL" | PriorityLevel>("ALL");
  const [days, setDays] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("reportedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    summary: true,
    incidents: true,
    users: false,
    auditLogs: false,
    selectedOnly: true,
  });

  const [analyticsQuery, usersQuery, logsQuery, incidentsQuery, resourcesQuery] = useQueries({
    queries: [
      { queryKey: ["admin", "analytics"], queryFn: adminApi.analytics },
      { queryKey: ["admin", "users"], queryFn: adminApi.users },
      { queryKey: ["admin", "audit-logs"], queryFn: adminApi.auditLogs },
      { queryKey: ["admin", "incidents"], queryFn: adminApi.incidents },
      { queryKey: ["resources"], queryFn: resourcesApi.list },
    ],
  });

  const analytics = analyticsQuery.data ?? emptyAnalytics;
  const users = usersQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const allIncidents = incidentsQuery.data ?? analytics.recentIncidents ?? [];
  const resources = resourcesQuery.data ?? [];
  const loading = analyticsQuery.isLoading || usersQuery.isLoading || logsQuery.isLoading || incidentsQuery.isLoading || resourcesQuery.isLoading;
  const dataErrors = [
    analyticsQuery.isError ? "analytics summary" : "",
    usersQuery.isError ? "users" : "",
    logsQuery.isError ? "audit logs" : "",
    incidentsQuery.isError ? "incidents" : "",
    resourcesQuery.isError ? "resources" : "",
  ].filter(Boolean);
  const since = useMemo(() => (days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null), [days]);

  const filteredIncidents = useMemo(() => {
    const query = search.toLowerCase();
    return allIncidents.filter((incident) => {
      const text = `${incident.referenceNumber} ${incident.type} ${incident.status} ${incident.priority} ${incident.reporterName} ${incident.manualLocation ?? ""} ${incident.description ?? ""}`.toLowerCase();
      return text.includes(query) && (!since || new Date(incident.reportedAt) >= since) && (status === "ALL" || incident.status === status) && (priority === "ALL" || incident.priority === priority);
    });
  }, [allIncidents, priority, search, since, status]);

  const filteredUsers = useMemo(() => users.filter((user) => `${user.fullName} ${user.email} ${user.role}`.toLowerCase().includes(search.toLowerCase()) && (!since || new Date(user.createdAt) >= since)), [search, since, users]);
  const filteredLogs = useMemo(() => logs.filter((log) => `${log.action} ${log.actorEmail} ${log.detail ?? ""}`.toLowerCase().includes(search.toLowerCase()) && (!since || new Date(log.createdAt) >= since)), [logs, search, since]);

  const sortedIncidents = useMemo(() => {
    return [...filteredIncidents].sort((a, b) => {
      const av = sortKey === "reportedAt" ? new Date(a.reportedAt).getTime() : a[sortKey] ?? "";
      const bv = sortKey === "reportedAt" ? new Date(b.reportedAt).getTime() : b[sortKey] ?? "";
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * (sortDirection === "asc" ? 1 : -1);
    });
  }, [filteredIncidents, sortDirection, sortKey]);

  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(sortedIncidents.length / pageSize));
  const pagedIncidents = sortedIncidents.slice((page - 1) * pageSize, page * pageSize);
  const selectedIncidents = sortedIncidents.filter((incident) => selectedRows.includes(incident.id));
  const exportRows = selectedIncidents.length ? incidentExportRows(selectedIncidents) : incidentExportRows(sortedIncidents);
  const realStats = useMemo(() => buildRealStats(allIncidents, users, resources, analytics), [allIncidents, analytics, resources, users]);
  const filteredStats = useMemo(() => buildRealStats(filteredIncidents, filteredUsers, resources, analytics), [analytics, filteredIncidents, filteredUsers, resources]);
  const confidencePct = realStats.aiAverageConfidence;
  const chartData = useMemo(() => buildChartDataFromRecords(allIncidents, users, analytics), [allIncidents, analytics, users]);
  const insights = useMemo(() => buildInsightsFromRecords(realStats, filteredStats, filteredIncidents), [filteredIncidents, filteredStats, realStats]);

  const resetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setPriority("ALL");
    setDays(0);
    setPage(1);
  };

  const refetchAll = () => {
    analyticsQuery.refetch();
    usersQuery.refetch();
    logsQuery.refetch();
    incidentsQuery.refetch();
    resourcesQuery.refetch();
  };

  const exportCsv = () => downloadCsv("safecommunity-reports.csv", exportRows.length ? exportRows : summaryRows(realStats, logs));
  const exportPdf = () => {
    const incidentsForPdf = exportOptions.selectedOnly && selectedIncidents.length ? selectedIncidents : sortedIncidents;
    const sections = buildPdfSections(exportOptions, realStats, filteredUsers, filteredLogs, incidentsForPdf, logs);
    downloadPdf("safecommunity-reports.pdf", "SafeCommunity Reports & Analytics", sections, {
      filters: [
        `Search: ${search || "Any"}`,
        `Status: ${status === "ALL" ? "All" : label(status)}`,
        `Priority: ${priority === "ALL" ? "All" : label(priority)}`,
        `Range: ${timeOptions.find((option) => option.value === days)?.label ?? "All time"}`,
      ],
    });
    setExportOpen(false);
  };

  const printReport = () => window.print();
  const toggleSort = (key: SortKey) => {
    setSortDirection(sortKey === key && sortDirection === "asc" ? "desc" : "asc");
    setSortKey(key);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 bg-slate-50/70 p-5 text-slate-950 lg:p-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Reports & Analytics</h1>
            <p className="mt-2 text-slate-600">Monitor incidents, users, responders, system activity and export comprehensive reports.</p>
            <p className="mt-3 text-sm text-slate-500">Live data loaded from {allIncidents.length} incident{allIncidents.length === 1 ? "" : "s"}, {users.length} user{users.length === 1 ? "" : "s"}, and {resources.length} resource{resources.length === 1 ? "" : "s"}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => setExportOpen(true)} icon={<FileText className="h-4 w-4" />} label="Export PDF" />
            <ActionButton onClick={exportCsv} icon={<Download className="h-4 w-4" />} label="Export CSV" variant="secondary" />
            <ActionButton onClick={printReport} icon={<Printer className="h-4 w-4" />} label="Print" variant="secondary" />
            <ActionButton onClick={() => setScheduleOpen(true)} icon={<CalendarClock className="h-4 w-4" />} label="Schedule" variant="secondary" />
            <ActionButton onClick={refetchAll} icon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />} label="Refresh" variant="ghost" />
          </div>
        </div>
      </header>

      {scheduleSaved ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-bold">Report schedule saved</p>
            <p className="text-sm">A recurring report alert has been configured in this browser session.</p>
          </div>
          <button onClick={() => setScheduleSaved(false)} className="ml-auto rounded-lg p-1 hover:bg-emerald-100" aria-label="Dismiss alert"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {dataErrors.length ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-bold">Some report data could not be loaded</p>
            <p className="text-sm">Missing source: {dataErrors.join(", ")}. The page is showing available live data and fallback summary values where possible.</p>
          </div>
        </div>
      ) : null}

      <section className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_170px_170px_150px_auto_auto]">
          <label className="relative block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Search</span>
            <Search className="absolute left-3 top-8 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search reference, reporter, category, location..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
          </label>
          <FilterSelect labelText="Status" value={status} onChange={(value) => { setStatus(value as "ALL" | IncidentStatus); setPage(1); }} options={statusOptions} />
          <FilterSelect labelText="Priority" value={priority} onChange={(value) => { setPriority(value as "ALL" | PriorityLevel); setPage(1); }} options={priorityOptions} />
          <FilterSelect labelText="Time Range" value={String(days)} onChange={(value) => { setDays(Number(value)); setPage(1); }} options={timeOptions.map((option) => String(option.value))} display={(value) => timeOptions.find((option) => String(option.value) === value)?.label ?? value} />
          <button onClick={resetFilters} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button onClick={() => setPage(1)} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700">
            <Filter className="h-4 w-4" />
            Apply
          </button>
        </div>
      </section>

      {loading ? <LoadingCards /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Incidents" value={realStats.incidentCount} helper={`${filteredIncidents.length} match current filters`} icon={<FileText className="h-5 w-5" />} tone="blue" />
        <MetricCard title="Open Incidents" value={realStats.activeIncidents} helper="Not resolved or cancelled" icon={<AlertTriangle className="h-5 w-5" />} tone="orange" />
        <MetricCard title="Resolved Incidents" value={realStats.resolvedIncidents} helper="Completed response cases" icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
        <MetricCard title="Pending Queue" value={realStats.pendingIncidentQueue} helper="Pending or prioritized cases" icon={<Clock3 className="h-5 w-5" />} tone="orange" />
        <MetricCard title="Total Users" value={realStats.userCount} helper={`${filteredUsers.length} match filters`} icon={<Users className="h-5 w-5" />} tone="blue" />
        <MetricCard title="Active Responders" value={realStats.activeResponders} helper="Enabled responder accounts" icon={<ShieldCheck className="h-5 w-5" />} tone="green" />
        <MetricCard title="Resources Available" value={realStats.availableResources} helper={`${resources.length} total resources`} icon={<BarChart3 className="h-5 w-5" />} tone="green" />
        <MetricCard title="AI Confidence" value={`${confidencePct}%`} helper="Average from incident records" icon={<Sparkles className="h-5 w-5" />} tone="purple" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Incident Trend" subtitle="Built from real incident report dates">
          {chartData.trend.length ? (
            <ResponsiveContainer width="100%" height={290}>
              <LineChart data={chartData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="incidents" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyBlock text="No incident trend data is available yet." />}
        </Panel>
        <Panel title="Status Distribution" subtitle="Current incident status totals">
          {chartData.status.length ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={chartData.status} dataKey="value" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {chartData.status.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <LegendRows rows={chartData.status} total={filteredIncidents.length} />
            </div>
          ) : <EmptyBlock text="No status data is available yet." />}
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel title="Priority Breakdown" subtitle="Real priority totals">
          {chartData.priority.length ? <SimpleBarChart data={chartData.priority} color="#f59e0b" /> : <EmptyBlock text="No priority data is available yet." />}
        </Panel>
        <Panel title="Users by Role" subtitle="Real user totals by role">
          {chartData.roles.length ? <SimpleBarChart data={chartData.roles} color="#2563eb" /> : <EmptyBlock text="No user role data is available yet." />}
        </Panel>
        <Panel title="Incident Categories" subtitle="Real category totals">
          {chartData.categories.length ? <SimpleBarChart data={chartData.categories} color="#8b5cf6" /> : <EmptyBlock text="No category data is available yet." />}
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title="AI Insights" subtitle="Generated only from live analytics values">
          <div className="space-y-3">
            {insights.length ? insights.map((insight) => <div key={insight} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">{insight}</div>) : <EmptyBlock text="No insights can be generated until more data is available." />}
          </div>
        </Panel>
        <Panel title="Incident Report Grid" subtitle={`${sortedIncidents.length} incidents match the current filters`}>
          {sortedIncidents.length === 0 ? (
            <EmptyReports onReset={resetFilters} />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{selectedRows.length} selected. Export actions use selected rows first.</p>
                <div className="flex gap-2">
                  <ActionButton onClick={exportCsv} icon={<Download className="h-4 w-4" />} label="Export rows" variant="secondary" />
                  <ActionButton onClick={() => setExportOpen(true)} icon={<FileText className="h-4 w-4" />} label="PDF rows" variant="secondary" />
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[980px] border-separate border-spacing-0">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-12 border-b border-slate-200 px-4 py-3 text-left">
                        <input type="checkbox" checked={pagedIncidents.length > 0 && pagedIncidents.every((incident) => selectedRows.includes(incident.id))} onChange={(event) => setSelectedRows(event.target.checked ? Array.from(new Set([...selectedRows, ...pagedIncidents.map((incident) => incident.id)])) : selectedRows.filter((id) => !pagedIncidents.some((incident) => incident.id === id)))} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                      </th>
                      <SortableTh text="Reference" sortKey="referenceNumber" active={sortKey} direction={sortDirection} onSort={toggleSort} />
                      <SortableTh text="Category" sortKey="type" active={sortKey} direction={sortDirection} onSort={toggleSort} />
                      <SortableTh text="Priority" sortKey="priority" active={sortKey} direction={sortDirection} onSort={toggleSort} />
                      <SortableTh text="Status" sortKey="status" active={sortKey} direction={sortDirection} onSort={toggleSort} />
                      <SortableTh text="Reporter" sortKey="reporterName" active={sortKey} direction={sortDirection} onSort={toggleSort} />
                      <Th>Location</Th>
                      <SortableTh text="Created" sortKey="reportedAt" active={sortKey} direction={sortDirection} onSort={toggleSort} />
                      <SortableTh text="AI Confidence" sortKey="aiConfidenceScore" active={sortKey} direction={sortDirection} onSort={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {pagedIncidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-blue-50/40">
                        <td className="border-b border-slate-100 px-4 py-4">
                          <input type="checkbox" checked={selectedRows.includes(incident.id)} onChange={(event) => setSelectedRows(event.target.checked ? [...selectedRows, incident.id] : selectedRows.filter((id) => id !== incident.id))} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                        </td>
                        <td className="border-b border-slate-100 px-4 py-4 font-bold text-slate-950">{incident.referenceNumber}</td>
                        <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">{label(incident.type)}</td>
                        <td className="border-b border-slate-100 px-4 py-4"><Badge tone={priorityTone(incident.priority)}>{label(incident.priority)}</Badge></td>
                        <td className="border-b border-slate-100 px-4 py-4"><Badge tone={statusTone(incident.status)}>{label(incident.status)}</Badge></td>
                        <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">{incident.anonymousReport ? "Anonymous" : incident.reporterName || "Citizen"}</td>
                        <td className="max-w-56 truncate border-b border-slate-100 px-4 py-4 text-sm text-slate-600">{incident.manualLocation || "GPS coordinates"}</td>
                        <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">{new Date(incident.reportedAt).toLocaleString()}</td>
                        <td className="border-b border-slate-100 px-4 py-4 text-sm font-bold text-purple-700">{Math.round((incident.aiConfidenceScore ?? 0) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">Page {page} of {pageCount}</p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Previous</button>
                  <button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Next</button>
                </div>
              </div>
            </>
          )}
        </Panel>
      </section>

      <ExportModal
        open={exportOpen}
        options={exportOptions}
        selectedCount={selectedRows.length}
        filteredCount={sortedIncidents.length}
        onChange={setExportOptions}
        onClose={() => setExportOpen(false)}
        onExport={exportPdf}
      />
      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} onSave={() => { setScheduleOpen(false); setScheduleSaved(true); }} />
    </div>
  );
}

function buildRealStats(incidents: IncidentResponse[], users: UserResponse[], resources: ResourceResponse[], analytics: AnalyticsResponse): RealStats {
  const confidenceScores = incidents.map((incident) => incident.aiConfidenceScore).filter((score): score is number => typeof score === "number");
  const hasIncidents = incidents.length > 0;
  const hasUsers = users.length > 0;
  const hasResources = resources.length > 0;
  const avgConfidence = confidenceScores.length ? Math.round((confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length) * 100) : Math.round((analytics.aiAverageConfidence ?? 0) * 100);
  return {
    incidentCount: hasIncidents ? incidents.length : analytics.incidentCount,
    activeIncidents: hasIncidents ? incidents.filter((incident) => isActiveIncident(incident.status)).length : analytics.activeIncidents,
    resolvedIncidents: hasIncidents ? incidents.filter((incident) => incident.status === "RESOLVED").length : analytics.resolvedIncidents,
    pendingIncidentQueue: hasIncidents ? incidents.filter((incident) => incident.status === "PENDING" || incident.status === "PRIORITIZED").length : analytics.pendingIncidentQueue,
    userCount: hasUsers ? users.length : analytics.userCount,
    activeResponders: hasUsers ? users.filter((user) => user.role === "RESPONDER" && user.enabled && !user.accountLocked).length : analytics.activeResponders,
    availableResources: hasResources ? resources.filter((resource) => resource.status === "AVAILABLE").length : analytics.availableResources,
    aiAverageConfidence: avgConfidence,
  };
}

function buildChartDataFromRecords(incidents: IncidentResponse[], users: UserResponse[], analytics: AnalyticsResponse) {
  const trend = trendRows(incidents);
  const status = countRows(incidents, (incident) => incident.status);
  const priority = countRows(incidents, (incident) => incident.priority);
  const roles = countRows(users, (user) => user.role);
  const categories = countRows(incidents, (incident) => incident.type);
  return {
    trend: trend.length ? trend : analytics.dailyIncidentTrend.map((row) => ({ date: formatShortDate(row.date), incidents: row.incidents })),
    status: status.length ? status : objectRows(analytics.incidentsByStatus),
    priority: priority.length ? priority : objectRows(analytics.incidentsByPriority),
    roles: roles.length ? roles : objectRows(analytics.usersByRole),
    categories: categories.length ? categories : objectRows(analytics.incidentsByType),
  };
}

function buildInsightsFromRecords(realStats: RealStats, filteredStats: RealStats, incidents: IncidentResponse[]) {
  const insights: string[] = [];
  const topType = countRows(incidents, (incident) => incident.type)[0];
  const topStatus = countRows(incidents, (incident) => incident.status)[0];
  if (topType) insights.push(`${topType.name} is the most common category in the current report view with ${topType.value} case${topType.value === 1 ? "" : "s"}.`);
  if (filteredStats.pendingIncidentQueue > 0) insights.push(`${filteredStats.pendingIncidentQueue} filtered incident${filteredStats.pendingIncidentQueue === 1 ? "" : "s"} are still pending or prioritized.`);
  if (topStatus) insights.push(`${topStatus.name} is currently the largest status group in the report grid.`);
  if (realStats.activeResponders > 0) insights.push(`${realStats.activeResponders} enabled responder account${realStats.activeResponders === 1 ? "" : "s"} are available in user records.`);
  if (realStats.aiAverageConfidence > 0) insights.push(`Average AI confidence across loaded incidents is ${realStats.aiAverageConfidence}%.`);
  return insights;
}

function summaryRows(stats: RealStats, logs: AuditLogResponse[]) {
  return [
    { metric: "Total Incidents", value: stats.incidentCount },
    { metric: "Open Incidents", value: stats.activeIncidents },
    { metric: "Resolved Incidents", value: stats.resolvedIncidents },
    { metric: "Pending Queue", value: stats.pendingIncidentQueue },
    { metric: "Total Users", value: stats.userCount },
    { metric: "Active Responders", value: stats.activeResponders },
    { metric: "Resources Available", value: stats.availableResources },
    { metric: "Audit Events", value: logs.length },
    { metric: "Average AI Confidence", value: `${stats.aiAverageConfidence}%` },
  ];
}

function incidentExportRows(incidents: IncidentResponse[]) {
  return incidents.map((incident) => ({
    reference: incident.referenceNumber,
    category: label(incident.type),
    priority: label(incident.priority),
    status: label(incident.status),
    reporter: incident.anonymousReport ? "Anonymous" : incident.reporterName || "Citizen",
    location: incident.manualLocation || "GPS coordinates",
    created: new Date(incident.reportedAt).toLocaleString(),
    aiConfidence: `${Math.round((incident.aiConfidenceScore ?? 0) * 100)}%`,
  }));
}

function buildPdfSections(options: ExportOptions, stats: RealStats, users: UserResponse[], logs: AuditLogResponse[], incidents: IncidentResponse[], allLogs: AuditLogResponse[]): PdfSection[] {
  const sections: PdfSection[] = [];
  if (options.summary) {
    sections.push({
      title: "Executive Summary",
      headers: ["Metric", "Value"],
      rows: summaryRows(stats, allLogs).map((row) => [row.metric, row.value]),
    });
  }
  if (options.incidents) {
    sections.push({
      title: options.selectedOnly && incidents.length ? "Selected Incident Rows" : "Filtered Incident Rows",
      headers: ["Reference", "Category", "Priority", "Status", "Reporter", "Location", "Created", "AI"],
      rows: incidentExportRows(incidents).map((row) => [row.reference, row.category, row.priority, row.status, row.reporter, row.location, row.created, row.aiConfidence]),
    });
  }
  if (options.users) {
    sections.push({
      title: "Users",
      headers: ["Name", "Email", "Role", "Status", "Created"],
      rows: users.map((user) => [user.fullName, user.email, user.role, user.accountLocked ? "Locked" : user.enabled ? "Active" : "Disabled", new Date(user.createdAt).toLocaleDateString()]),
    });
  }
  if (options.auditLogs) {
    sections.push({
      title: "Audit Logs",
      headers: ["Action", "Actor", "Entity", "Created"],
      rows: logs.map((log) => [log.action, log.actorEmail, log.entityType ?? "System", new Date(log.createdAt).toLocaleString()]),
    });
  }
  return sections.filter((section) => section.rows.length > 0);
}

function countRows<T>(items: T[], getKey: (item: T) => string) {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([name, value]) => ({ name: label(name), value }))
    .sort((a, b) => b.value - a.value);
}

function objectRows(record: Record<string, number>) {
  return Object.entries(record ?? {})
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name: label(name), value }))
    .sort((a, b) => b.value - a.value);
}

function trendRows(incidents: IncidentResponse[]) {
  const counts = incidents.reduce<Record<string, number>>((acc, incident) => {
    const date = new Date(incident.reportedAt);
    if (Number.isNaN(date.getTime())) return acc;
    const key = date.toISOString().slice(0, 10);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, incidents]) => ({ date: formatShortDate(date), incidents }));
}

function isActiveIncident(status: IncidentStatus) {
  return status !== "RESOLVED" && status !== "CANCELLED";
}

function downloadPdf(filename: string, title: string, sections: PdfSection[], meta: { filters: string[] }) {
  const content = makePdf(title, sections, meta);
  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function makePdf(title: string, sections: PdfSection[], meta: { filters: string[] }) {
  const pageWidth = 792;
  const pageHeight = 612;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const pages: string[] = [];
  let commands: string[] = [];
  let y = pageHeight - 160;

  const add = (command: string) => commands.push(command);
  const textWidth = (value: string, size: number) => value.length * size * 0.48;
  const text = (value: string, x: number, baseline: number, size = 9, color = "0.12 0.16 0.23") => {
    add(`BT /F1 ${size} Tf ${x} ${baseline} Td ${color} rg (${escapePdf(value)}) Tj ET`);
  };
  const centeredText = (value: string, baseline: number, size = 12, color = "0.12 0.16 0.23") => {
    text(value, Math.max(margin, (pageWidth - textWidth(value, size)) / 2), baseline, size, color);
  };
  const rect = (x: number, baseline: number, width: number, height: number, color: string) => {
    add(`${color} rg ${x} ${baseline} ${width} ${height} re f`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color = "0.82 0.87 0.93") => {
    add(`${color} RG ${x1} ${y1} m ${x2} ${y2} l S`);
  };

  const startPage = () => {
    commands = [];
    rect(0, 0, pageWidth, pageHeight, "0.97 0.98 1");
    rect(0, pageHeight - 88, pageWidth, 88, "0.05 0.16 0.36");
    centeredText(title, pageHeight - 38, 21, "1 1 1");
    centeredText("Operational report generated from selected live system records", pageHeight - 58, 9, "0.83 0.9 1");
    rect(margin, pageHeight - 126, contentWidth, 28, "0.9 0.95 1");
    centeredText(`Generated ${new Date().toLocaleString()}    |    ${meta.filters.join("    |    ")}`, pageHeight - 116, 8, "0.05 0.16 0.36");
    y = pageHeight - 160;
  };

  const finishPage = () => {
    line(margin, 42, pageWidth - margin, 42);
    text("SafeCommunity", margin, 24, 8, "0.38 0.45 0.55");
    centeredText(`Confidential emergency operations report - Page ${pages.length + 1}`, 24, 8, "0.38 0.45 0.55");
    text(new Date().toLocaleDateString(), pageWidth - margin - 70, 24, 8, "0.38 0.45 0.55");
    pages.push(commands.join("\n"));
  };

  const ensureSpace = (height: number) => {
    if (y - height < 62) {
      finishPage();
      startPage();
    }
  };

  const columnWidths = (headers: string[]) => {
    if (headers.length === 2) return [contentWidth * 0.72, contentWidth * 0.28];
    if (headers.length === 5) return [145, 205, 80, 90, 120];
    if (headers.length === 4) return [190, 220, 140, 150];
    if (headers.length === 8) return [100, 72, 62, 82, 96, 132, 118, 42];
    return headers.map(() => contentWidth / Math.max(1, headers.length));
  };

  const cellText = (value: string | number, width: number) => {
    const textValue = String(value ?? "");
    const maxChars = Math.max(5, Math.floor(width / 5.1));
    return textValue.length > maxChars ? `${textValue.slice(0, Math.max(0, maxChars - 3))}...` : textValue;
  };

  const drawTable = (section: PdfSection) => {
    const headers = section.headers ?? [];
    const widths = columnWidths(headers);
    const rowHeight = 24;
    ensureSpace(48);
    rect(margin, y - 18, contentWidth, 30, "0.05 0.16 0.36");
    text(section.title, margin + 14, y - 6, 12, "1 1 1");
    y -= 38;

    if (!headers.length) return;
    ensureSpace(rowHeight * 2);
    rect(margin, y - 16, contentWidth, rowHeight, "0.91 0.95 1");
    let x = margin;
    headers.forEach((header, index) => {
      text(header.toUpperCase(), x + 8, y - 7, 7, "0.26 0.36 0.52");
      if (index > 0) line(x, y + 8, x, y - 16, "0.78 0.84 0.91");
      x += widths[index] ?? 80;
    });
    y -= rowHeight;

    section.rows.forEach((row, rowIndex) => {
      ensureSpace(rowHeight + 8);
      rect(margin, y - 16, contentWidth, rowHeight, rowIndex % 2 === 0 ? "1 1 1" : "0.96 0.98 1");
      x = margin;
      row.forEach((cell, index) => {
        const width = widths[index] ?? 80;
        text(cellText(cell, width), x + 8, y - 7, 8, index === 0 ? "0.05 0.16 0.36" : "0.2 0.27 0.36");
        if (index > 0) line(x, y + 8, x, y - 16, "0.89 0.92 0.96");
        x += width;
      });
      line(margin, y - 16, pageWidth - margin, y - 16, "0.88 0.92 0.96");
      y -= rowHeight;
    });
    y -= 18;
  };

  startPage();
  if (sections.length === 0) {
    rect(margin, y - 40, contentWidth, 70, "1 1 1");
    centeredText("No export sections were selected, or no rows matched the current filters.", y - 4, 11, "0.38 0.45 0.55");
  } else {
    sections.forEach(drawTable);
  }
  finishPage();

  const fontObject = 3;
  const pageObjects = pages.map((_, index) => 4 + index * 2);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjects.map((objectId) => `${objectId} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  pages.forEach((stream, index) => {
    const pageObject = pageObjects[index];
    const contentObject = pageObject + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "");
}

function wrapPdfLine(value: string, max: number) {
  const words = String(value).split(" ");
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    if (`${current} ${word}`.trim().length > max) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current) lines.push(current);
  return lines;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ActionButton({ label: text, icon, onClick, variant = "primary", disabled = false }: { label: string; icon: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost"; disabled?: boolean }) {
  const variants = {
    primary: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "border border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
  };
  return <button onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}>{icon}{text}</button>;
}

function FilterSelect({ labelText, value, onChange, options, display }: { labelText: string; value: string; onChange: (value: string) => void; options: string[]; display?: (value: string) => string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">{labelText}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
        {options.map((option) => <option key={option} value={option}>{display ? display(option) : option === "ALL" ? "All" : label(option)}</option>)}
      </select>
    </label>
  );
}

function MetricCard({ title, value, helper, icon, tone }: { title: string; value: string | number; helper: string; icon: React.ReactNode; tone: "blue" | "green" | "orange" | "purple" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    purple: "bg-purple-50 text-purple-700 ring-purple-100",
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ring-1 ${tones[tone]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-sm text-slate-500">{helper}</p>
    </article>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function SimpleBarChart({ data, color }: { data: Array<{ name: string; value: number }>; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LegendRows({ rows, total }: { rows: Array<{ name: string; value: number }>; total: number }) {
  return <div className="space-y-3 self-center">{rows.map((row, index) => <div key={row.name} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2"><span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{row.name}</span><span className="text-sm font-bold text-slate-950">{percent(row.value, total)}%</span></div>)}</div>;
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="flex h-[250px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-500">{text}</div>;
}

function LoadingCards() {
  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"><div className="h-5 w-24 rounded bg-slate-100" /><div className="mt-5 h-9 w-20 rounded bg-slate-100" /></div>)}</section>;
}

function EmptyReports({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <Search className="mx-auto h-9 w-9 text-blue-500" />
      <h3 className="mt-3 text-lg font-bold text-slate-950">No reports match your filters.</h3>
      <p className="mt-1 text-sm text-slate-500">Try changing your filters or generate a new report.</p>
      <button onClick={onReset} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><RotateCcw className="h-4 w-4" />Reset Filters</button>
    </div>
  );
}

function SortableTh({ text, sortKey, active, direction, onSort }: { text: string; sortKey: SortKey; active: SortKey; direction: SortDirection; onSort: (key: SortKey) => void }) {
  return (
    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
      <button onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 hover:text-slate-950">{text}{active === sortKey ? direction === "asc" ? " up" : " down" : null}</button>
    </th>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">{children}</th>;
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "red" | "orange" | "blue" | "purple" | "slate" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    purple: "bg-purple-50 text-purple-700 ring-purple-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold uppercase ring-1 ${tones[tone]}`}>{children}</span>;
}

function ExportModal({ open, options, selectedCount, filteredCount, onChange, onClose, onExport }: { open: boolean; options: ExportOptions; selectedCount: number; filteredCount: number; onChange: (options: ExportOptions) => void; onClose: () => void; onExport: () => void }) {
  if (!open) return null;
  const sectionCount = Number(options.summary) + Number(options.incidents) + Number(options.users) + Number(options.auditLogs);
  const update = (key: keyof ExportOptions, value: boolean) => onChange({ ...options, [key]: value });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Export report PDF</h2>
            <p className="mt-1 text-sm text-slate-500">Choose exactly what should be included in the downloaded PDF.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close export modal"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-bold">Current export scope</p>
            <p className="mt-1">{options.selectedOnly && selectedCount > 0 ? `${selectedCount} selected incident row${selectedCount === 1 ? "" : "s"}` : `${filteredCount} filtered incident row${filteredCount === 1 ? "" : "s"}`}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ExportCheck labelText="Executive summary" checked={options.summary} onChange={(checked) => update("summary", checked)} />
            <ExportCheck labelText="Incident rows" checked={options.incidents} onChange={(checked) => update("incidents", checked)} />
            <ExportCheck labelText="Users" checked={options.users} onChange={(checked) => update("users", checked)} />
            <ExportCheck labelText="Audit logs" checked={options.auditLogs} onChange={(checked) => update("auditLogs", checked)} />
          </div>
          <label className={`flex items-start gap-3 rounded-xl border p-4 ${selectedCount === 0 ? "border-slate-200 bg-slate-50 text-slate-400" : "border-slate-200 bg-white text-slate-700"}`}>
            <input type="checkbox" disabled={selectedCount === 0} checked={options.selectedOnly && selectedCount > 0} onChange={(event) => update("selectedOnly", event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600" />
            <span>
              <span className="block font-bold">Use selected incident rows only</span>
              <span className="text-sm">{selectedCount === 0 ? "Select rows in the incident grid to enable this option." : "When off, the PDF uses all filtered incident rows."}</span>
            </span>
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-5">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button disabled={sectionCount === 0} onClick={onExport} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />Download PDF</button>
        </div>
      </section>
    </div>
  );
}

function ExportCheck({ labelText, checked, onChange }: { labelText: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-700 transition hover:bg-white">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
      {labelText}
    </label>
  );
}

function ScheduleModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  const [frequency, setFrequency] = useState("Weekly");
  const [recipient, setRecipient] = useState("admin@safecommunity.local");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Schedule report</h2>
            <p className="mt-1 text-sm text-slate-500">Create a browser-session schedule alert for recurring exports.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close schedule modal"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-700">Frequency</span>
            <select value={frequency} onChange={(event) => setFrequency(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-700">Recipient</span>
            <input value={recipient} onChange={(event) => setRecipient(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          </label>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-bold">Preview</p>
            <p className="mt-1">{frequency} reports will be prepared for {recipient || "the selected recipient"} using the current filters.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onSave} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Send className="h-4 w-4" />Save schedule</button>
        </div>
      </section>
    </div>
  );
}

function priorityTone(priority: PriorityLevel) {
  if (priority === "CRITICAL") return "red";
  if (priority === "HIGH") return "orange";
  if (priority === "MEDIUM") return "blue";
  return "green";
}

function statusTone(status: IncidentStatus) {
  if (status === "RESOLVED") return "green";
  if (status === "CANCELLED") return "slate";
  if (status === "PENDING") return "orange";
  if (status === "PRIORITIZED") return "purple";
  return "blue";
}
