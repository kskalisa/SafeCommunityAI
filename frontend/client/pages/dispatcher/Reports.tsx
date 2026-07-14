import { useEffect, useMemo, useState } from "react";
import { BarChart3, Calendar, Download, FileText, Search, TrendingUp } from "lucide-react";
import { reportsApi } from "@/services/api/reports";
import { downloadCsv, downloadPdf } from "@/lib/export";
import type { AnalyticsResponse, IncidentResponse, IncidentStatus, IncidentType, PriorityLevel } from "@/types/api";

type ReportRange = "TODAY" | "WEEK" | "MONTH" | "YEAR" | "CUSTOM";

const PROJECT_TITLE = "Smart Community Support & Emergency Response System";
const PDF_SUBTITLE = "Official emergency incident report generated from current filters";

const friendlyLabels: Record<string, string> = {
  PENDING: "Waiting for review",
  PRIORITIZED: "Reviewed",
  ASSIGNED: "Help assigned",
  EN_ROUTE: "Team on the way",
  ON_SCENE: "Team arrived",
  RESOLVED: "Closed",
  CANCELLED: "Cancelled",
  CRITICAL: "Life-threatening",
  HIGH: "High need",
  MEDIUM: "Medium need",
  LOW: "Low need",
  MEDICAL: "Medical help",
  FIRE: "Fire",
  ACCIDENT: "Accident",
  CRIME: "Safety threat",
  NATURAL_DISASTER: "Natural disaster",
  OTHER: "Other help",
  RESPONDER: "Response team member",
  DISPATCHER: "Dispatch team",
  CITIZEN: "Community member",
  ADMIN: "Administrator",
};
const label = (value: string) => friendlyLabels[value] ?? value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
const pct = (count: number, total: number) => Math.round((count / Math.max(1, total)) * 100);

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const rangeOptions: Array<{ value: ReportRange; label: string }> = [
  { value: "TODAY", label: "Today" },
  { value: "WEEK", label: "Weekly" },
  { value: "MONTH", label: "Monthly" },
  { value: "YEAR", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" },
];

function getRangeDates(range: ReportRange) {
  const now = new Date();
  const start = new Date(now);
  if (range === "TODAY") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "WEEK") {
    const day = start.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysSinceMonday);
    start.setHours(0, 0, 0, 0);
  } else if (range === "MONTH") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (range === "YEAR") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  return { from: toDateInputValue(start), to: toDateInputValue(now) };
}

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
  incidents.map((incident, index) => ({
    no: index + 1,
    reference: incident.referenceNumber,
    type: label(incident.type),
    status: label(incident.status),
    priority: label(incident.priority),
    reporter: incident.anonymousReport ? "Anonymous" : incident.reporterName || "Citizen",
    assignedResponder: incident.assignedResponderName || "No team assigned",
    responderStatus: incident.responderStatus ? label(incident.responderStatus) : "",
    systemScore: incident.priorityScore,
    systemConfidence: `${Math.round((incident.aiConfidenceScore ?? 0) * 100)}%`,
    suggestedSupport: incident.resourceSuggestion ?? "",
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
  const [reportRange, setReportRange] = useState<ReportRange>("TODAY");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const range = getRangeDates("TODAY");
    setFromDate(range.from);
    setToDate(range.to);
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
    const rangeLabel = rangeOptions.find((option) => option.value === reportRange)?.label ?? "Custom";
    const parts = ["Dispatch report", rangeLabel];
    if (priority !== "ALL") parts.push(label(priority));
    if (type !== "ALL") parts.push(label(type));
    if (status !== "ALL") parts.push(label(status));
    if (fromDate || toDate) parts.push(`${fromDate || "Start"} to ${toDate || "Today"}`);
    return parts.join(" - ");
  }, [fromDate, priority, reportRange, status, toDate, type]);

  const filteredActiveIncidents = filteredIncidents.filter((incident) => incident.status !== "RESOLVED" && incident.status !== "CANCELLED").length;
  const filteredResolvedIncidents = filteredIncidents.filter((incident) => incident.status === "RESOLVED").length;
  const responseDurations = filteredIncidents
    .filter((incident) => incident.resolvedAt)
    .map((incident) => Math.max(0, new Date(incident.resolvedAt as string).getTime() - new Date(incident.reportedAt).getTime()) / 60000);
  const filteredAverageResponseMinutes = Math.round(responseDurations.reduce((sum, minutes) => sum + minutes, 0) / Math.max(1, responseDurations.length));
  const priorityRows = useMemo(() => {
    const counts = filteredIncidents.reduce<Record<string, number>>((result, incident) => {
      result[incident.priority] = (result[incident.priority] ?? 0) + 1;
      return result;
    }, {});
    return Object.keys(analytics.incidentsByPriority).map((name) => ({ priority: name, count: counts[name] ?? 0 }));
  }, [analytics.incidentsByPriority, filteredIncidents]);
  const typeRows = useMemo(() => {
    const counts = filteredIncidents.reduce<Record<string, number>>((result, incident) => {
      result[incident.type] = (result[incident.type] ?? 0) + 1;
      return result;
    }, {});
    return Object.entries(counts).filter(([, count]) => count > 0).map(([name, count]) => ({ type: name, count, pct: pct(count, filteredIncidents.length) }));
  }, [filteredIncidents]);
  const resourceTotal = Object.values(analytics.resourcesByStatus).reduce((sum, count) => sum + count, 0);
  const resourceAvailability = pct(analytics.availableResources, resourceTotal);
  const confidencePct = Math.round((filteredIncidents.reduce((sum, incident) => sum + (incident.aiConfidenceScore ?? 0), 0) / Math.max(1, filteredIncidents.length)) * 100);

  const applyReportRange = (range: ReportRange) => {
    setReportRange(range);
    if (range === "CUSTOM") return;
    const dates = getRangeDates(range);
    setFromDate(dates.from);
    setToDate(dates.to);
  };

  const exportCsv = () => {
    downloadCsv(`${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, incidentExportRows(filteredIncidents));
  };

  const exportPdf = () => {
    downloadPdf(`${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`, PROJECT_TITLE, [
      {
        title: "Emergency Incident Report",
        headers: ["#", "Report number", "Incident type", "Status", "Priority", "Reported by", "Team member", "Support", "Place", "Reported on", "System certainty"],
        rows: incidentExportRows(filteredIncidents).map((row) => [row.no, row.reference, row.type, row.status, row.priority, row.reporter, row.assignedResponder, row.suggestedSupport || "-", row.location, row.reportedAt, row.systemConfidence]),
      },
    ], {
      subtitle: PDF_SUBTITLE,
      filters: [
        `Incident Type: ${type === "ALL" ? "All" : label(type)}`,
        `Priority: ${priority === "ALL" ? "All" : label(priority)}`,
        `Status: ${status === "ALL" ? "All" : label(status)}`,
        `Date Range: ${dateRangeLabel(fromDate, toDate)}`,
        `Search: ${search || "Any"}`,
      ],
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Reports</h1>
          <p className="mt-1 text-slate-600">Choose a time period, review emergency reports, and download what is on screen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={filteredIncidents.length === 0} onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"><Download className="h-4 w-4" /> CSV</button>
          <button disabled={filteredIncidents.length === 0} onClick={exportPdf} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"><FileText className="h-4 w-4" /> PDF</button>
        </div>
      </div>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Calendar className="h-4 w-4" /> {analytics.generatedAt ? `Information updated ${new Date(analytics.generatedAt).toLocaleString()}` : "Loading report information"}</div>
        <div className="mb-4 flex flex-wrap gap-2">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => applyReportRange(option.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${reportRange === option.value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_repeat(5,160px)]">
          <label className="relative block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <FilterSelect value={type} onChange={(value) => setType(value as "ALL" | IncidentType)} options={["ALL", ...Object.keys(analytics.incidentsByType)]} />
          <FilterSelect ariaLabel="Status" value={status} onChange={(value) => setStatus(value as "ALL" | IncidentStatus)} options={["ALL", ...Object.keys(analytics.incidentsByStatus)]} />
          <FilterSelect ariaLabel="Priority" value={priority} onChange={(value) => setPriority(value as "ALL" | PriorityLevel)} options={["ALL", ...Object.keys(analytics.incidentsByPriority)]} />
          <input type="date" value={fromDate} onChange={(event) => { setReportRange("CUSTOM"); setFromDate(event.target.value); }} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <input type="date" value={toDate} onChange={(event) => { setReportRange("CUSTOM"); setToDate(event.target.value); }} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Reports Shown", value: filteredIncidents.length },
          { label: "Open Reports", value: filteredActiveIncidents },
          { label: "Avg Response Time", value: `${filteredAverageResponseMinutes} min` },
          { label: "System Certainty", value: `${confidencePct}%` },
        ].map((item) => <div key={item.label} className="rounded-lg border bg-white p-5 shadow-sm"><h3 className="text-sm font-medium text-slate-600">{item.label}</h3><p className="mt-3 text-3xl font-bold text-slate-950">{loading ? "-" : item.value}</p></div>)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-950"><BarChart3 className="h-5 w-5" /> Reports by Priority</h2>
          <div className="flex h-52 items-end justify-around gap-3">
            {priorityRows.map((item) => <div key={item.priority} className="flex flex-1 flex-col items-center"><div className="w-full rounded-t bg-blue-600" style={{ height: Math.max(12, pct(item.count, filteredIncidents.length) * 1.8) }} /><p className="mt-2 text-xs font-medium text-slate-600">{label(item.priority)}</p><p className="text-xs font-semibold text-slate-950">{item.count}</p></div>)}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-950"><TrendingUp className="h-5 w-5" /> Kinds of Help</h2>
          <div className="space-y-4">
            {typeRows.length === 0 ? <p className="text-sm text-slate-500">No report history is available yet.</p> : typeRows.map((item) => <div key={item.type}><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-800">{label(item.type)}</span><span className="font-semibold text-slate-950">{item.count} ({item.pct}%)</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-600" style={{ width: `${item.pct}%` }} /></div></div>)}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-4"><p className="text-sm font-medium text-slate-700">Available support</p><p className="mt-1 text-2xl font-bold text-slate-950">{resourceAvailability}%</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-sm font-medium text-slate-700">Closed reports</p><p className="mt-1 text-2xl font-bold text-slate-950">{filteredResolvedIncidents}</p></div></div>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="border-b p-5"><h2 className="text-lg font-semibold text-slate-950">{reportTitle}</h2><p className="mt-1 text-sm text-slate-500">{filteredIncidents.length} reports match your choices.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1120px]"><thead className="bg-slate-50"><tr>{["#", "Report number", "Incident type", "Status", "Priority", "Reported by", "Team member", "Support", "Place", "Reported on", "System certainty"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-sm font-bold text-slate-800">{heading}</th>)}</tr></thead><tbody className="divide-y">{filteredIncidents.length === 0 ? <tr><td colSpan={11} className="px-4 py-8 text-center text-sm font-medium text-slate-500">{loading ? "Loading real report data..." : "No reports match your choices."}</td></tr> : filteredIncidents.map((incident, index) => <tr key={incident.id}><td className="px-4 py-3 text-sm font-bold text-slate-500">{index + 1}</td><td className="px-4 py-3 text-sm font-semibold text-slate-950">{incident.referenceNumber}</td><td className="px-4 py-3 text-sm text-slate-600">{label(incident.type)}</td><td className="px-4 py-3 text-sm text-slate-600">{label(incident.status)}</td><td className="px-4 py-3 text-sm text-slate-600">{label(incident.priority)}</td><td className="px-4 py-3 text-sm text-slate-600">{incident.anonymousReport ? "Anonymous" : incident.reporterName || "Citizen"}</td><td className="px-4 py-3 text-sm text-slate-600">{incident.assignedResponderName || "No team assigned"}</td><td className="px-4 py-3 text-sm text-slate-600">{incident.resourceSuggestion || "-"}</td><td className="px-4 py-3 text-sm text-slate-600">{incident.manualLocation || "Shared location"}</td><td className="px-4 py-3 text-sm text-slate-600">{new Date(incident.reportedAt).toLocaleString()}</td><td className="px-4 py-3 text-sm font-bold text-purple-700">{Math.round((incident.aiConfidenceScore ?? 0) * 100)}%</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

function dateRangeLabel(fromDate: string, toDate: string) {
  const from = fromDate ? formatReportDate(fromDate) : "Start";
  const to = toDate ? formatReportDate(toDate) : "Today";
  return `${from} to ${to}`;
}

function formatReportDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function FilterSelect({ value, onChange, options, ariaLabel = "Filter" }: { value: string; onChange: (value: string) => void; options: string[]; ariaLabel?: string }) {
  return <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700">{options.map((option) => <option key={option} value={option}>{option === "ALL" ? "All" : label(option)}</option>)}</select>;
}

