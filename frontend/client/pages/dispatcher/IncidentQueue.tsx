import { CheckCircle2, ChevronRight, Clock, Download, FileVideo, Loader2, Mail, MapPin, Phone, Search, Sparkles, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dispatchApi } from "@/services/api/dispatch";
import { incidentsApi } from "@/services/api/incidents";
import { usersApi } from "@/services/api/users";
import type { AttachmentResponse, DispatchRecommendationResponse, IncidentResponse, ResponderDetailResponse } from "@/types/api";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function IncidentQueue() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("ALL");
  const [selectedResponder, setSelectedResponder] = useState<ResponderDetailResponse | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const incidents = useQuery({ queryKey: ["incidents", "queue"], queryFn: incidentsApi.queue });
  const recommendations = useQuery({ queryKey: ["dispatch-recommendations", selectedIncidentId], queryFn: () => dispatchApi.recommendations(selectedIncidentId as number), enabled: selectedIncidentId != null });
  const responders = useQuery({ queryKey: ["responders", "details"], queryFn: usersApi.responderDetails });

  const assign = useMutation({
    mutationFn: ({ incidentId, responderId }: { incidentId: number; responderId: number }) => dispatchApi.assign({ incidentId, responderId, etaMinutes: 6 }),
    onSuccess: () => {
      setNotice("Responder assigned. The citizen and responder status will update from the backend.");
      queryClient.invalidateQueries({ queryKey: ["incidents", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["responders", "details"] });
    },
  });

  const closeIncident = useMutation({
    mutationFn: (incidentId: number) => incidentsApi.updateStatus(incidentId, { incidentStatus: "RESOLVED", reason: "Closed by dispatcher after follow-up" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents", "queue"] }),
  });

  const responderList = responders.data ?? [];
  const filtered = useMemo(() => {
    const text = search.toLowerCase();
    return (incidents.data ?? []).filter((incident) => {
      const matchesPriority = priority === "ALL" || incident.priority === priority;
      const matchesSearch = `${incident.referenceNumber} ${incident.type} ${incident.manualLocation ?? ""} ${incident.description ?? ""}`.toLowerCase().includes(text);
      return matchesPriority && matchesSearch;
    });
  }, [incidents.data, priority, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-950 lg:text-4xl">Incident Queue</h1>
          <p className="text-slate-600">Review citizen reports, confirm evidence, and assign the best available responder.</p>
        </div>
        {incidents.isFetching ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference, place, type, or detail" className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="ALL">All priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </section>

      {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{notice}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-4">
          {incidents.isLoading ? <Empty text="Loading incident queue..." /> : filtered.length === 0 ? <Empty text="No incidents match your filters." /> : filtered.map((incident) => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              responders={responderList}
              assigning={assign.isPending}
              resolving={closeIncident.isPending}
              onViewResponder={setSelectedResponder}
              onRecommend={() => setSelectedIncidentId(incident.id)}
              onAssign={(responderId) => assign.mutate({ incidentId: incident.id, responderId })}
              onResolve={() => closeIncident.mutate(incident.id)}
            />
          ))}
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-950">Recommended Responders</h2>
          <RecommendationList
            recommendations={recommendations.data ?? []}
            loading={recommendations.isFetching}
            assigning={assign.isPending}
            onAssign={selectedIncidentId ? (responderId) => assign.mutate({ incidentId: selectedIncidentId, responderId }) : undefined}
            onPick={(responderId) => {
              const responder = responderList.find((item) => item.id === responderId);
              if (responder) setSelectedResponder(responder);
            }}
          />
          <div className="my-5 border-t" />
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-950"><Users className="h-5 w-5" /> Responder Details</h2>
          {selectedResponder ? (
            <div className="space-y-4">
              <div>
                <p className="text-xl font-bold text-slate-950">{selectedResponder.fullName}</p>
                <p className="text-sm text-slate-500">{selectedResponder.organization || "No organization listed"}</p>
              </div>
              <Detail label="Status" value={label(selectedResponder.availabilityStatus || "OFFLINE")} />
              <Detail label="License" value={selectedResponder.certificationLicense || "Not provided"} />
              <Detail label="Vehicle" value={selectedResponder.vehicleNumber || "Not assigned"} />
              <div className="flex gap-2">
                <a href={`mailto:${selectedResponder.email}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Mail className="h-4 w-4" /> Email</a>
                <a href={selectedResponder.phone ? `tel:${selectedResponder.phone}` : undefined} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Phone className="h-4 w-4" /> Call</a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Choose a responder to view details before assigning them.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function IncidentRow({ incident, responders, assigning, resolving, onAssign, onResolve, onViewResponder, onRecommend }: { incident: IncidentResponse; responders: ResponderDetailResponse[]; assigning: boolean; resolving: boolean; onAssign: (responderId: number) => void; onResolve: () => void; onViewResponder: (responder: ResponderDetailResponse) => void; onRecommend: () => void }) {
  const availableResponders = responders.filter((responder) => responder.availabilityStatus === "AVAILABLE" || !responder.availabilityStatus);
  const localMl = incident.aiSource === "LOCAL_ML";
  const aiLabel = localMl ? `Local ML triage${incident.aiModel ? ` - ${incident.aiModel}` : ""}` : "Rule-based triage";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="font-bold text-slate-950">{incident.referenceNumber}</h3>
            <Badge label={label(incident.priority)} urgent={incident.priority === "CRITICAL"} />
            <Badge label={label(incident.type)} />
          </div>
          <p className="mb-3 text-sm text-slate-700">{incident.description || "No description provided"}</p>
          <div className={`mb-3 rounded-lg border p-3 text-sm ${localMl ? "border-emerald-100 bg-emerald-50 text-emerald-950" : "border-amber-100 bg-amber-50 text-amber-950"}`}>
            <div className="mb-1 flex flex-wrap items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4" />
              <span>{aiLabel}</span>
              <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs">Priority {incident.priorityScore ?? 0}/100</span>
              <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs">Confidence {Math.round((incident.aiConfidenceScore ?? 0) * 100)}%</span>
            </div>
            <p>{incident.aiExplanation || "Priority is based on incident type, severity words, and shared location."}</p>
            <p className="mt-1 font-medium">Recommended support: {incident.resourceSuggestion || "Dispatcher review"}</p>
            {!localMl && incident.aiFallbackReason ? <p className="mt-1 text-xs font-semibold opacity-80">Fallback reason: {incident.aiFallbackReason}</p> : null}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {incident.manualLocation || "Location shared by GPS"}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(incident.reportedAt).toLocaleString()}</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Detail label="Reporter" value={incident.anonymousReport ? "Anonymous report" : incident.reporterName || "Citizen"} />
            <Detail label="Witness" value={incident.witnessName ? `${incident.witnessName}${incident.witnessPhone ? ` - ${incident.witnessPhone}` : ""}` : "Not provided"} />
            <Detail label="Evidence" value={`${incident.attachments?.length ?? 0} file${(incident.attachments?.length ?? 0) === 1 ? "" : "s"}`} />
          </div>
          {incident.attachments?.length ? <EvidenceList attachments={incident.attachments} /> : null}
        </div>
        <div className="w-full space-y-3 lg:w-[330px]">
          <select disabled={availableResponders.length === 0 || assigning} onChange={(event) => event.target.value && onAssign(Number(event.target.value))} defaultValue="" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">Assign available responder</option>
            {availableResponders.map((responder) => <option key={responder.id} value={responder.id}>{responder.fullName} {responder.vehicleNumber ? `- ${responder.vehicleNumber}` : ""}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            {responders.slice(0, 4).map((responder) => <button key={responder.id} onClick={() => onViewResponder(responder)} className="rounded-lg border px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">{responder.fullName}</button>)}
          </div>
          <button onClick={onRecommend} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">Show best responders</button>
          <button disabled={resolving} onClick={onResolve} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Mark resolved</button>
          <div className="flex justify-end text-blue-700"><UserPlus className="h-5 w-5" /><ChevronRight className="h-5 w-5" /></div>
        </div>
      </div>
    </div>
  );
}

function RecommendationList({ recommendations, loading, assigning, onPick, onAssign }: { recommendations: DispatchRecommendationResponse[]; loading: boolean; assigning: boolean; onPick: (responderId: number) => void; onAssign?: (responderId: number) => void }) {
  if (loading) return <p className="text-sm text-slate-500">Finding closest responders...</p>;
  if (recommendations.length === 0) return <p className="text-sm text-slate-500">Select "Show best responders" on an incident.</p>;
  return (
    <div className="space-y-2">
      {recommendations.map((item) => (
        <div key={item.responderId} className="rounded-lg border p-3 hover:bg-slate-50">
          <button onClick={() => onPick(item.responderId)} className="w-full text-left">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-950">{item.fullName}</p>
              <span className="text-xs font-bold text-blue-700">{item.etaMinutes}m</span>
            </div>
            <p className="text-xs text-slate-500">{item.distanceKm >= 999 ? "No GPS" : `${item.distanceKm} km`} - {item.reason}</p>
          </button>
          {onAssign ? (
            <button disabled={assigning} onClick={() => onAssign(item.responderId)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">
              {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Assign this responder
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Badge({ label, urgent = false }: { label: string; urgent?: boolean }) {
  return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${urgent ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>{label}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-950">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">{text}</div>;
}

function EvidenceList({ attachments }: { attachments: AttachmentResponse[] }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950"><FileVideo className="h-4 w-4" /> Evidence files</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {attachments.map((attachment) => (
          <button key={attachment.id} onClick={() => downloadEvidence(attachment)} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-blue-200 hover:bg-blue-50">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-800">{attachment.fileName}</span>
              <span className="text-xs text-slate-500">{attachment.contentType || "Evidence"}{attachment.sizeBytes ? ` - ${formatBytes(attachment.sizeBytes)}` : ""}</span>
            </span>
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

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


