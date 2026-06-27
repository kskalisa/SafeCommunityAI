import { AlertCircle, CheckCircle2, ChevronDown, Clock, Download, FileVideo, Filter, Loader2, MapIcon, MapPin, MessageCircle, Pencil, Save, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api/client";
import { incidentsApi } from "@/services/api/incidents";
import type { AttachmentResponse, IncidentResponse, IncidentStatus, IncidentType } from "@/types/api";

type EditForm = {
  type: IncidentType;
  severity: string;
  latitude?: number;
  longitude?: number;
  manualLocation: string;
  description: string;
  witnessName: string;
  witnessPhone: string;
  anonymousReport: boolean;
  notifyEmergencyContacts: boolean;
};

export default function Incidents() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "resolved">("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IncidentResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const incidents = useQuery({ queryKey: ["incidents", "mine"], queryFn: incidentsApi.mine });
  const data = incidents.data ?? [];

  const updateIncident = useMutation({
    mutationFn: ({ id, form }: { id: number; form: EditForm }) => incidentsApi.update(id, { ...form, attachments: [] }),
    onSuccess: () => {
      setNotice("Incident report updated.");
      setError(null);
      setEditingId(null);
      setEditForm(null);
      queryClient.invalidateQueries({ queryKey: ["incidents", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Unable to update this report.");
    },
  });

  const deleteIncident = useMutation({
    mutationFn: (id: number) => incidentsApi.delete(id),
    onSuccess: () => {
      setNotice("Incident report deleted.");
      setError(null);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["incidents", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Unable to delete this report.");
    },
  });

  const filtered = useMemo(() => data.filter((incident) => {
    const matchesSearch = `${incident.referenceNumber} ${incident.description ?? ""} ${incident.manualLocation ?? ""} ${incident.type}`.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "all") return true;
    if (filter === "pending") return incident.status === "PENDING" || incident.status === "PRIORITIZED";
    if (filter === "active") return ["ASSIGNED", "EN_ROUTE", "ON_SCENE"].includes(incident.status);
    return incident.status === "RESOLVED";
  }), [data, filter, search]);

  function startEdit(incident: IncidentResponse) {
    setError(null);
    setNotice(null);
    setExpandedId(incident.id);
    setEditingId(incident.id);
    setEditForm({
      type: incident.type,
      severity: incident.severity ?? "",
      latitude: incident.latitude,
      longitude: incident.longitude,
      manualLocation: incident.manualLocation ?? "",
      description: incident.description ?? "",
      witnessName: incident.witnessName ?? "",
      witnessPhone: incident.witnessPhone ?? "",
      anonymousReport: incident.anonymousReport,
      notifyEmergencyContacts: incident.emergencyContactsNotified,
    });
  }

  function saveEdit(id: number) {
    if (!editForm) return;
    if (editForm.description.trim().length < 12) {
      setError("Describe the incident in at least 12 characters.");
      return;
    }
    if (!editForm.manualLocation.trim() && !(editForm.latitude && editForm.longitude)) {
      setError("Please keep a manual location when editing from history.");
      return;
    }
    updateIncident.mutate({ id, form: editForm });
  }

  function removeIncident(incident: IncidentResponse) {
    setNotice(null);
    setError(null);
    setDeleteTarget(incident);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-red-600">My reports</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 lg:text-4xl">Incident history</h1>
          <p className="mt-2 text-slate-600">Follow what you reported, where it happened, and how the response is progressing.</p>
        </div>
        {incidents.isFetching ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Total reports" value={data.length} icon={<AlertCircle className="h-5 w-5" />} />
        <Stat title="Active now" value={data.filter((i) => !["RESOLVED", "CANCELLED"].includes(i.status)).length} icon={<Clock className="h-5 w-5" />} />
        <Stat title="Resolved" value={data.filter((i) => i.status === "RESOLVED").length} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by reference, place, or detail" className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100" />
          </label>
          <div className="flex gap-2 overflow-x-auto">
            {[{ id: "all", label: "All" }, { id: "pending", label: "Waiting" }, { id: "active", label: "In progress" }, { id: "resolved", label: "Resolved" }].map((tab) => (
              <button key={tab.id} onClick={() => setFilter(tab.id as typeof filter)} className={`whitespace-nowrap rounded-lg border px-4 py-3 text-sm font-semibold transition ${filter === tab.id ? "border-red-600 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-950"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{notice}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}

      {incidents.isLoading ? <Empty title="Loading your reports" text="Please wait while we fetch your latest activity." /> : filtered.length === 0 ? <Empty title="Nothing here yet" text="Try another filter, or send an alert if you need emergency help." /> : (
        <div className="space-y-4">
          {filtered.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              expanded={expandedId === incident.id}
              editing={editingId === incident.id}
              editForm={editingId === incident.id ? editForm : null}
              saving={updateIncident.isPending}
              deleting={deleteIncident.isPending}
              onEditChange={(form) => setEditForm(form)}
              onStartEdit={() => startEdit(incident)}
              onCancelEdit={() => { setEditingId(null); setEditForm(null); setError(null); }}
              onSaveEdit={() => saveEdit(incident.id)}
              onDelete={() => removeIncident(incident)}
              onToggle={() => setExpandedId(expandedId === incident.id ? null : incident.id)}
              onRefresh={() => incidents.refetch()}
              refreshing={incidents.isFetching}
            />
          ))}
        </div>
      )}

      {deleteTarget ? (
        <DeleteConfirmDialog
          incident={deleteTarget}
          deleting={deleteIncident.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteIncident.mutate(deleteTarget.id)}
        />
      ) : null}
    </div>
  );
}

function IncidentCard({
  incident,
  expanded,
  editing,
  editForm,
  saving,
  deleting,
  onEditChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onToggle,
  onRefresh,
  refreshing,
}: {
  incident: IncidentResponse;
  expanded: boolean;
  editing: boolean;
  editForm: EditForm | null;
  saving: boolean;
  deleting: boolean;
  onEditChange: (form: EditForm) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const hasCoords = typeof incident.latitude === "number" && typeof incident.longitude === "number";
  const manageable = canManageIncident(incident.status);
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <button onClick={onToggle} className="w-full p-5 text-left transition hover:bg-slate-50">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h3 className="font-bold text-slate-950">{incident.referenceNumber}</h3>
              <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${statusClass(incident.status)}`}>{friendly(incident.status)}</span>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{friendly(incident.type)}</span>
              <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${incident.priority === "CRITICAL" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{incident.priority === "CRITICAL" ? "Urgent" : friendly(incident.priority)}</span>
            </div>
            <p className="mb-3 text-slate-700">{incident.description || "Emergency alert sent from your phone."}</p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {incident.manualLocation || (hasCoords ? `${incident.latitude?.toFixed(5)}, ${incident.longitude?.toFixed(5)}` : "Shared location")}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(incident.reportedAt).toLocaleString()}</span>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-400 transition ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      {expanded ? (
        <div className="border-t border-slate-200 bg-slate-50 px-5 pb-5">
          <div className="flex flex-wrap justify-end gap-2 pt-4">
            <button disabled={!manageable || editing} onClick={onStartEdit} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" title={manageable ? "Edit report" : "Reports cannot be edited after dispatch starts handling them"}><Pencil className="h-4 w-4" /> Edit</button>
            <button disabled={!manageable || deleting} onClick={onDelete} className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50" title={manageable ? "Delete report" : "Reports cannot be deleted after dispatch starts handling them"}>{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete</button>
          </div>
          <div className="my-4 grid gap-3 sm:grid-cols-3">
            <Detail label="Priority" value={incident.priority === "CRITICAL" ? "Urgent" : friendly(incident.priority)} />
            <Detail label="Reported by" value={incident.reporterName || "You"} />
            <Detail label="Current step" value={friendly(incident.status)} />
          </div>
          {editing && editForm ? <EditIncidentForm form={editForm} onChange={onEditChange} onCancel={onCancelEdit} onSave={onSaveEdit} saving={saving} /> : null}
          <StatusTracker status={incident.status} />
          {incident.attachments?.length ? <EvidenceList attachments={incident.attachments} /> : null}
          <div className="flex flex-wrap gap-2">
            <button onClick={onRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60">{refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />} Refresh updates</button>
            <Link to="/dashboard/citizen/map" className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"><MapIcon className="h-4 w-4" /> Open map</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function statusClass(status: IncidentStatus) {
  if (["PENDING", "PRIORITIZED"].includes(status)) return "bg-amber-50 text-amber-800";
  if (["ASSIGNED", "EN_ROUTE"].includes(status)) return "bg-blue-50 text-blue-700";
  if (status === "ON_SCENE") return "bg-orange-50 text-orange-700";
  if (status === "RESOLVED") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="text-sm font-semibold text-slate-950">{value}</p></div>;
}

function DeleteConfirmDialog({ incident, deleting, onCancel, onConfirm }: { incident: IncidentResponse; deleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-report-title">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-red-100 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-red-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="delete-report-title" className="text-lg font-bold text-slate-950">Delete incident report?</h2>
              <p className="mt-1 text-sm text-red-800">This removes the report from your history and dispatcher queue.</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">{incident.referenceNumber}</p>
            <p className="mt-1 text-sm text-slate-600">{incident.description || "Emergency alert report"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{friendly(incident.type)}</span>
              <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${statusClass(incident.status)}`}>{friendly(incident.status)}</span>
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-600">Only reports that have not yet been assigned to responders can be deleted. This action cannot be undone.</p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button onClick={onCancel} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60">
            <X className="h-4 w-4" />
            Keep report
          </button>
          <button onClick={onConfirm} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete report
          </button>
        </div>
      </div>
    </div>
  );
}

function EditIncidentForm({ form, onChange, onCancel, onSave, saving }: { form: EditForm; onChange: (form: EditForm) => void; onCancel: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="font-bold text-slate-950">Edit report details</h4>
        <button onClick={onCancel} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cancel edit"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-900">Incident type
          <select value={form.type} onChange={(event) => onChange({ ...form, type: event.target.value as IncidentType })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2">
            {(["MEDICAL", "FIRE", "ACCIDENT", "CRIME", "NATURAL_DISASTER", "OTHER"] as IncidentType[]).map((type) => <option key={type} value={type}>{friendly(type)}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-900">Severity
          <select value={form.severity} onChange={(event) => onChange({ ...form, severity: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">Select severity</option>
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((severity) => <option key={severity} value={severity}>{friendly(severity)}</option>)}
          </select>
        </label>
      </div>
      <label className="mt-4 block text-sm font-semibold text-slate-900">Location
        <input value={form.manualLocation} onChange={(event) => onChange({ ...form, manualLocation: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Street, landmark, district..." />
      </label>
      <label className="mt-4 block text-sm font-semibold text-slate-900">Description
        <textarea value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2" maxLength={2000} />
      </label>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-900">Witness name
          <input value={form.witnessName} onChange={(event) => onChange({ ...form, witnessName: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Optional" />
        </label>
        <label className="text-sm font-semibold text-slate-900">Witness phone
          <input value={form.witnessPhone} onChange={(event) => onChange({ ...form, witnessPhone: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Optional" />
        </label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Toggle label="Anonymous report" value={form.anonymousReport} onChange={(value) => onChange({ ...form, anonymousReport: value })} />
        <Toggle label="Notify emergency contacts" value={form.notifyEmergencyContacts} onChange={(value) => onChange({ ...form, notifyEmergencyContacts: value })} />
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button onClick={onCancel} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> Cancel</button>
        <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes</button>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!value)} className={`rounded-lg border p-3 text-left text-sm font-semibold ${value ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700"}`}>{label}<span className="mt-1 block text-xs">{value ? "Enabled" : "Disabled"}</span></button>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm"><Filter className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-3 font-bold text-slate-950">{title}</h3><p className="mt-1 text-sm text-slate-500">{text}</p></div>;
}

function Stat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3 flex items-center justify-between text-slate-500"><p className="text-sm font-bold uppercase tracking-wide">{title}</p>{icon}</div><p className="text-3xl font-bold text-slate-950">{value}</p></div>;
}

function StatusTracker({ status }: { status: IncidentStatus }) {
  const steps: IncidentStatus[] = ["PRIORITIZED", "ASSIGNED", "EN_ROUTE", "ON_SCENE", "RESOLVED"];
  const activeIndex = Math.max(0, steps.indexOf(status));
  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm font-bold text-slate-950">Response progress</p>
      <div className="grid gap-2 sm:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step} className={`rounded-lg border p-3 text-xs font-bold ${index <= activeIndex ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
            {friendly(step)}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceList({ attachments }: { attachments: AttachmentResponse[] }) {
  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950"><FileVideo className="h-4 w-4" /> Evidence attached</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {attachments.map((attachment) => (
          <button key={attachment.id} onClick={() => downloadEvidence(attachment)} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:border-blue-200 hover:bg-blue-50">
            <span className="min-w-0 truncate font-semibold text-slate-800">{attachment.fileName}</span>
            <Download className="h-4 w-4 flex-shrink-0 text-blue-600" />
          </button>
        ))}
      </div>
    </div>
  );
}

async function downloadEvidence(attachment: AttachmentResponse) {
  const blob = await incidentsApi.downloadAttachment(attachment.id);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.fileName || `evidence-${attachment.id}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function friendly(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function canManageIncident(status: IncidentStatus) {
  return status === "PENDING" || status === "PRIORITIZED";
}
