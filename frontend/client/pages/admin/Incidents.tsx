import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Download, MapPin, Siren } from "lucide-react";
import { incidentsApi } from "@/services/api/incidents";
import { AdminButton, AdminPageShell, EmptyState, LoadingState, Notice, Panel, SearchInput, StatusBadge } from "@/components/admin/AdminUI";
import { downloadCsv } from "@/lib/export";
import type { IncidentStatus, PriorityLevel } from "@/types/api";

const statuses: Array<"ALL" | IncidentStatus> = ["ALL", "PENDING", "PRIORITIZED", "ASSIGNED", "EN_ROUTE", "ON_SCENE", "RESOLVED", "CANCELLED"];
const priorities: Array<"ALL" | PriorityLevel> = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function AdminIncidents() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | IncidentStatus>("ALL");
  const [priority, setPriority] = useState<"ALL" | PriorityLevel>("ALL");
  const [notice, setNotice] = useState("");
  const incidents = useQuery({ queryKey: ["admin", "incidents"], queryFn: incidentsApi.queue });
  const updateStatus = useMutation({
    mutationFn: ({ id, incidentStatus }: { id: number; incidentStatus: IncidentStatus }) => incidentsApi.updateStatus(id, { incidentStatus, reason: "Updated by admin" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "incidents"] });
      setNotice("Incident status updated.");
    },
  });
  const rows = useMemo(() => (incidents.data ?? []).filter((incident) => `${incident.referenceNumber} ${incident.type} ${incident.description ?? ""} ${incident.manualLocation ?? ""}`.toLowerCase().includes(search.toLowerCase()) && (status === "ALL" || incident.status === status) && (priority === "ALL" || incident.priority === priority)), [incidents.data, priority, search, status]);
  const exportRows = () => downloadCsv("admin-filtered-incidents.csv", rows.map((incident) => ({ reference: incident.referenceNumber, type: incident.type, status: incident.status, priority: incident.priority, location: incident.manualLocation ?? "Coordinates", reportedAt: new Date(incident.reportedAt).toLocaleString(), reporter: incident.reporterName })));
  return (
    <AdminPageShell title="Incident Management" description="Monitor, filter, triage, and resolve incident reports from across the response network." actions={<AdminButton variant="secondary" onClick={exportRows}><Download className="h-4 w-4" />Export filtered</AdminButton>}>
      {notice ? <Notice type="success">{notice}</Notice> : null}
      {incidents.isLoading ? <LoadingState label="Loading incidents..." /> : null}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_14rem_14rem]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search reference, location, type..." />
        <select value={status} onChange={(event) => setStatus(event.target.value as "ALL" | IncidentStatus)} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold">{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={priority} onChange={(event) => setPriority(event.target.value as "ALL" | PriorityLevel)} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold">{priorities.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </div>
      <Panel title="Incident Queue" description={`${rows.length} matching incidents`}>
        <div className="space-y-4">
          {rows.map((incident) => (
            <div key={incident.id} className="rounded-lg border border-slate-200 p-4 transition hover:border-red-200 hover:bg-red-50/30">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><Siren className="h-5 w-5 text-red-600" /><p className="font-bold text-slate-950">{incident.referenceNumber}</p><StatusBadge tone={incident.priority === "CRITICAL" ? "red" : incident.priority === "HIGH" ? "amber" : "blue"}>{incident.priority}</StatusBadge><StatusBadge>{incident.status}</StatusBadge></div>
                  <p className="mt-2 text-sm text-slate-600">{incident.description || "No description provided"}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><MapPin className="h-4 w-4" />{incident.manualLocation || "Coordinates supplied"} - {incident.type} - {new Date(incident.reportedAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select value={incident.status} onChange={(event) => updateStatus.mutate({ id: incident.id, incidentStatus: event.target.value as IncidentStatus })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"><option>PENDING</option><option>PRIORITIZED</option><option>ASSIGNED</option><option>EN_ROUTE</option><option>ON_SCENE</option><option>RESOLVED</option><option>CANCELLED</option></select>
                  <AdminButton variant="secondary" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: incident.id, incidentStatus: "PRIORITIZED" })}><Clock className="h-4 w-4" />Prioritize</AdminButton>
                  <AdminButton variant="secondary" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: incident.id, incidentStatus: "RESOLVED" })}><CheckCircle2 className="h-4 w-4" />Resolve</AdminButton>
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 ? <EmptyState title="No incidents found" text="Try a different filter or search term." /> : null}
        </div>
      </Panel>
    </AdminPageShell>
  );
}
