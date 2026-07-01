import { useEffect, useMemo, useState } from "react";
import { BarChart3, Calendar, Download, FileText, Search, TrendingUp } from "lucide-react";
import { reportsApi } from "@/services/api/reports";
import { downloadCsv, printPdf } from "@/lib/export";
import type { AnalyticsResponse, IncidentResponse, IncidentStatus, IncidentType, PriorityLevel } from "@/types/api";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
const pct = (count: number, total: number) => Math.round((count / Math.max(1, total)) * 100);

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

const incidentExportRows = (incidents: IncidentResponse[]) =>
  incidents.map((incident) => ({
    reference: incident.referenceNumber,
    type: label(incident.type),
    status: label(incident.status),
    priority: label(incident.priority),
    aiScore: incident.priorityScore,
    aiConfidence: `${Math.round((incident.aiConfidenceScore ?? 0) * 100)}%`,
    recommendedSupport: incident.resourceSuggestion ?? "",
    location: incident.manualLocation ?? `${incident.latitude ?? ""}, ${incident.longitude ?? ""}`,
    reportedAt: new Date(incident.reportedAt).toLocaleString(),
  }));

export default function Reports() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse>(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"ALL" | IncidentType>("ALL");
  const [status, setStatus] = useState<"ALL" | IncidentStatus>("ALL");
  const [priority, setPriority] = useState<"ALL" | PriorityLevel>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    reportsApi
      .analytics()
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, []);

  const filteredIncidents = useMemo(() => {
    const text = search.toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;
    return analytics.recentIncidents.filter((incident) => {
      const reported = new Date(incident.reportedAt);
      const matchesText = `${incident.referenceNumber} ${incident.type} ${incident.status} ${incident.priority} ${incident.manualLocation ?? ""} ${incident.description ?? ""}`.toLowerCase().includes(text);
      return matchesText && (type === "ALL" || incident.type === type) && (status === "ALL" || incident.status === status) && (priority === "ALL" || incident.priority === priority) && (!from || reported >= from) && (!to || reported <= to);
    });
  }, [analytics.recentIncidents, fromDate, priority, search, status, toDate, type]);

  const reportTitle = useMemo(() => {
    const parts = ["Dispatch Report"];
    if (priority !== "ALL") parts.push(label(priority));
    if (type !== "ALL") parts.push(label(type));
    if (status !== "ALL") parts.push(label(status));
    if (fromDate || toDate) parts.push(`${fromDate || "Start"} to ${toDate || "Today"}`);
    return parts.join(" - ");
  }, [fromDate, priority, status, toDate, type]);

  const priorityRows = useMemo(() => Object.entries(analytics.incidentsByPriority).map(([name, count]) => ({ priority: name, count })), [analytics.incidentsByPriority]);
  const typeRows = useMemo(() => Object.entries(analytics.incidentsByType).filter(([, count]) => count > 0).map(([name, count]) => ({ type: name, count, pct: pct(count, analytics.incidentCount) })), [analytics.incidentCount, analytics.incidentsByType]);
  const resourceTotal = Object.values(analytics.resourcesByStatus).reduce((sum, count) => sum + count, 0);
  const resourceAvailability = pct(analytics.availableResources, resourceTotal);
  const confidencePct = Math.round((analytics.aiAverageConfidence ?? 0) * 100);

  const exportCsv = () => {
    downloadCsv(`${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, incidentExportRows(filteredIncidents));
  };

  const exportPdf = () => {
    printPdf(`SafeCommunity - ${reportTitle}`, [
      {
        heading: "Report Summary",
        rows: [
          { metric: "Filtered incidents", value: filteredIncidents.length },
          { metric: "Active incidents", value: analytics.activeIncidents },
          { metric: "Resolved incidents", value: analytics.resolvedIncidents },
          { metric: "Average response minutes", value: analytics.averageResponseMinutes },
          { metric: "Average AI confidence", value: `${confidencePct}%` },
          { metric: "Report filters", value: reportTitle },
        ],
      },
      { heading: "Filtered Incidents", rows: incidentExportRows(filteredIncidents) },
      {
        heading: "Responder Performance",
        rows: analytics.responderPerformance.map((row) => ({
          responder: row.responder,
          assignments: row.assignments,
          completed: row.completed,
          averageEtaMinutes: row.averageEtaMinutes,
        })),
      },
    ]);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Reports</h1>
          <p className="mt-1 text-slate-600">Filter incident records, review response performance, and export exactly what is on screen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={filteredIncidents.length === 0} onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"><Download className="h-4 w-4" /> CSV</button>
          <button disabled={filteredIncidents.length === 0} onClick={exportPdf} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"><FileText className="h-4 w-4" /> PDF</button>
        </div>
      </div>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Calendar className="h-4 w-4" /> {analytics.generatedAt ? `Data refreshed ${new Date(analytics.generatedAt).toLocaleString()}` : "Loading report data"}</div>
        <div className="grid gap-3 lg:grid-cols-[1fr_repeat(5,160px)]">
          <label className="relative block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <FilterSelect value={type} onChange={(value) => setType(value as "ALL" | IncidentType)} options={["ALL", ...Object.keys(analytics.incidentsByType)]} />
          <FilterSelect value={status} onChange={(value) => setStatus(value as "ALL" | IncidentStatus)} options={["ALL", ...Object.keys(analytics.incidentsByStatus)]} />
          <FilterSelect value={priority} onChange={(value) => setPriority(value as "ALL" | PriorityLevel)} options={["ALL", ...Object.keys(analytics.incidentsByPriority)]} />
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Filtered Results", value: filteredIncidents.length },
          { label: "Active Incidents", value: analytics.activeIncidents },
          { label: "Avg Response", value: `${analytics.averageResponseMinutes} min` },
          { label: "AI Confidence", value: `${confidencePct}%` },
        ].map((item) => <div key={item.label} className="rounded-lg border bg-white p-5 shadow-sm"><h3 className="text-sm font-medium text-slate-600">{item.label}</h3><p className="mt-3 text-3xl font-bold text-slate-950">{loading ? "-" : item.value}</p></div>)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-950"><BarChart3 className="h-5 w-5" /> Incidents by Priority</h2>
          <div className="flex h-52 items-end justify-around gap-3">
            {priorityRows.map((item) => <div key={item.priority} className="flex flex-1 flex-col items-center"><div className="w-full rounded-t bg-blue-600" style={{ height: Math.max(12, pct(item.count, analytics.incidentCount) * 1.8) }} /><p className="mt-2 text-xs font-medium text-slate-600">{label(item.priority)}</p><p className="text-xs font-semibold text-slate-950">{item.count}</p></div>)}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-950"><TrendingUp className="h-5 w-5" /> Incident Types</h2>
          <div className="space-y-4">
            {typeRows.length === 0 ? <p className="text-sm text-slate-500">No incident history is available yet.</p> : typeRows.map((item) => <div key={item.type}><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-800">{label(item.type)}</span><span className="font-semibold text-slate-950">{item.count} ({item.pct}%)</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-600" style={{ width: `${item.pct}%` }} /></div></div>)}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-4"><p className="text-sm font-medium text-slate-700">Resource availability</p><p className="mt-1 text-2xl font-bold text-slate-950">{resourceAvailability}%</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-sm font-medium text-slate-700">Resolved incidents</p><p className="mt-1 text-2xl font-bold text-slate-950">{analytics.resolvedIncidents}</p></div></div>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="border-b p-5"><h2 className="text-lg font-semibold text-slate-950">{reportTitle}</h2><p className="mt-1 text-sm text-slate-500">{filteredIncidents.length} incidents match the selected filters.</p></div>
        <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50"><tr>{["Reference", "Type", "Status", "Priority", "Location", "Reported"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-sm font-bold text-slate-800">{heading}</th>)}</tr></thead><tbody className="divide-y">{filteredIncidents.map((incident) => <tr key={incident.id}><td className="px-4 py-3 text-sm font-semibold text-slate-950">{incident.referenceNumber}</td><td className="px-4 py-3 text-sm text-slate-600">{label(incident.type)}</td><td className="px-4 py-3 text-sm text-slate-600">{label(incident.status)}</td><td className="px-4 py-3 text-sm text-slate-600">{label(incident.priority)}</td><td className="px-4 py-3 text-sm text-slate-600">{incident.manualLocation || "Shared GPS"}</td><td className="px-4 py-3 text-sm text-slate-600">{new Date(incident.reportedAt).toLocaleString()}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700">{options.map((option) => <option key={option} value={option}>{option === "ALL" ? "All" : label(option)}</option>)}</select>;
}
