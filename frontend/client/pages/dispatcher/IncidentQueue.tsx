import { CheckCircle2, Clock, Download, FileVideo, Loader2, Mail, MapPin, Phone, Search, Sparkles, ThumbsDown, ThumbsUp, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dispatchApi } from "@/services/api/dispatch";
import { incidentsApi } from "@/services/api/incidents";
import type { AttachmentResponse, DispatchRecommendationResponse, IncidentResponse } from "@/types/api";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function IncidentQueue() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("ALL");
  const [selectedRecommendation, setSelectedRecommendation] = useState<DispatchRecommendationResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const incidents = useQuery({ queryKey: ["incidents", "queue"], queryFn: incidentsApi.queue });
  const assign = useMutation({
    mutationFn: ({ incidentId, responderId, etaMinutes }: { incidentId: number; responderId: number; etaMinutes?: number }) => dispatchApi.assign({ incidentId, responderId, etaMinutes }),
    onSuccess: () => {
      setNotice("AI recommendation confirmed. The citizen and responder status will update from the backend.");
      queryClient.invalidateQueries({ queryKey: ["incidents", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["responders", "details"] });
    },
  });
  const closeIncident = useMutation({ mutationFn: (incidentId: number) => incidentsApi.updateStatus(incidentId, { incidentStatus: "RESOLVED", reason: "Closed by dispatcher after follow-up" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents", "queue"] }) });

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
      <div className="flex items-start justify-between gap-4"><div><h1 className="mb-2 text-3xl font-bold text-slate-950 lg:text-4xl">Incident Queue</h1><p className="text-slate-600">Review AI-ranked responder recommendations and confirm the best match for each incident.</p></div>{incidents.isFetching ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}</div>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_220px]"><label className="relative block"><Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference, place, type, or detail" className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="ALL">All priorities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></div></section>
      {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{notice}</div> : null}
      {assign.error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{assign.error instanceof Error ? assign.error.message : "Could not confirm recommendation."}</div> : null}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-4">{incidents.isLoading ? <Empty text="Loading incident queue..." /> : filtered.length === 0 ? <Empty text="No incidents match your filters." /> : filtered.map((incident) => <IncidentRow key={incident.id} incident={incident} assigning={assign.isPending} resolving={closeIncident.isPending} onInspect={setSelectedRecommendation} onConfirm={(recommendation) => assign.mutate({ incidentId: incident.id, responderId: recommendation.responderId, etaMinutes: recommendation.etaMinutes })} onResolve={() => closeIncident.mutate(incident.id)} />)}</div>
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start"><h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-950"><Users className="h-5 w-5" /> Recommendation Details</h2>{selectedRecommendation ? <RecommendationDetails recommendation={selectedRecommendation} /> : <p className="text-sm text-slate-500">Select an AI recommendation to review responder resources and fit.</p>}</aside>
      </div>
    </div>
  );
}

function IncidentRow({ incident, assigning, resolving, onConfirm, onInspect, onResolve }: { incident: IncidentResponse; assigning: boolean; resolving: boolean; onConfirm: (recommendation: DispatchRecommendationResponse) => void; onInspect: (recommendation: DispatchRecommendationResponse) => void; onResolve: () => void }) {
  const [rejected, setRejected] = useState<number[]>([]);
  const isAssigned = Boolean(incident.assignmentId || incident.assignedResponderId || incident.assignedResponderName);
  const recommendations = useQuery({ queryKey: ["dispatch-recommendations", incident.id], queryFn: () => dispatchApi.recommendations(incident.id), enabled: !isAssigned });
  const localMl = incident.aiSource === "LOCAL_ML";
  const aiLabel = localMl ? `Local ML triage${incident.aiModel ? ` - ${incident.aiModel}` : ""}` : "Rule-based triage";
  const visibleRecommendations = isAssigned ? [] : (recommendations.data ?? []).filter((item) => !rejected.includes(item.responderId)).slice(0, 3);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3"><h3 className="font-bold text-slate-950">{incident.referenceNumber}</h3><Badge label={label(incident.priority)} urgent={incident.priority === "CRITICAL"} /><Badge label={label(incident.type)} /></div>
          <p className="mb-3 text-sm text-slate-700">{incident.description || "No description provided"}</p>
          <div className={`mb-3 rounded-lg border p-3 text-sm ${localMl ? "border-emerald-100 bg-emerald-50 text-emerald-950" : "border-amber-100 bg-amber-50 text-amber-950"}`}><div className="mb-1 flex flex-wrap items-center gap-2 font-semibold"><Sparkles className="h-4 w-4" /><span>{aiLabel}</span><span className="rounded-md bg-white/70 px-2 py-0.5 text-xs">Priority {incident.priorityScore ?? 0}/100</span><span className="rounded-md bg-white/70 px-2 py-0.5 text-xs">Confidence {Math.round((incident.aiConfidenceScore ?? 0) * 100)}%</span></div><p>{incident.aiExplanation || "Priority is based on incident type, severity words, and shared location."}</p><p className="mt-1 font-medium">Recommended support: {incident.resourceSuggestion || "Dispatcher review"}</p></div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-500"><span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {incident.manualLocation || "Location shared by GPS"}</span><span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(incident.reportedAt).toLocaleString()}</span></div>
          <div className="mt-4 grid gap-3 md:grid-cols-3"><Detail label="Reporter" value={incident.anonymousReport ? "Anonymous report" : incident.reporterName || "Citizen"} /><Detail label="Witness" value={incident.witnessName ? `${incident.witnessName}${incident.witnessPhone ? ` - ${incident.witnessPhone}` : ""}` : "Not provided"} /><Detail label="Evidence" value={`${incident.attachments?.length ?? 0} file${(incident.attachments?.length ?? 0) === 1 ? "" : "s"}`} /></div>
          {incident.attachments?.length ? <EvidenceList attachments={incident.attachments} /> : null}
          {isAssigned ? <AssignedNotice incident={incident} /> : null}
        </div>
        <div className="w-full space-y-3 xl:w-[360px]">{isAssigned ? <AssignedPanel incident={incident} /> : <><h4 className="text-sm font-bold text-slate-950">AI Recommendations</h4><RecommendationCards recommendations={visibleRecommendations} loading={recommendations.isFetching} assigning={assigning} onInspect={onInspect} onConfirm={onConfirm} onReject={(id) => setRejected((current) => [...current, id])} /></>}<button disabled={resolving} onClick={onResolve} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Mark resolved</button></div>
      </div>
    </div>
  );
}

function AssignedNotice({ incident }: { incident: IncidentResponse }) {
  return <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">Assigned to {incident.assignedResponderName || "responder"}{incident.responderStatus ? ` - ${label(incident.responderStatus)}` : ""}. This incident cannot be assigned again.</div>;
}

function AssignedPanel({ incident }: { incident: IncidentResponse }) {
  return <div className="rounded-lg border border-blue-200 bg-blue-50 p-4"><h4 className="text-sm font-bold text-blue-950">Assigned Responder</h4><p className="mt-2 text-lg font-bold text-slate-950">{incident.assignedResponderName || "Responder assigned"}</p><p className="text-sm text-slate-600">{incident.assignedResponderEmail || "No email available"}</p><div className="mt-3 grid gap-2 text-sm"><Detail label="Assignment" value={incident.assignmentId ? `#${incident.assignmentId}` : "Active"} /><Detail label="Status" value={incident.responderStatus ? label(incident.responderStatus) : "Assigned"} />{incident.etaMinutes ? <Detail label="ETA" value={`${incident.etaMinutes} min`} /> : null}</div></div>;
}

function RecommendationCards({ recommendations, loading, assigning, onInspect, onConfirm, onReject }: { recommendations: DispatchRecommendationResponse[]; loading: boolean; assigning: boolean; onInspect: (recommendation: DispatchRecommendationResponse) => void; onConfirm: (recommendation: DispatchRecommendationResponse) => void; onReject: (responderId: number) => void }) {
  if (loading) return <p className="text-sm text-slate-500">Analyzing responders, resources, and location...</p>;
  if (recommendations.length === 0) return <p className="text-sm text-slate-500">No AI recommendation is currently available.</p>;
  return <div className="space-y-2">{recommendations.map((item, index) => <div key={item.responderId} className="rounded-lg border p-3"><button type="button" onClick={() => onInspect(item)} className="w-full text-left"><div className="flex items-center justify-between gap-2"><p className="font-semibold text-slate-950">{index === 0 ? "Best match: " : ""}{item.fullName}</p><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{item.score}/100</span></div><p className="mt-1 text-xs text-slate-500">{item.distanceKm >= 999 ? "No GPS" : `${item.distanceKm} km`} - ETA {item.etaMinutes}m</p><p className="mt-1 text-xs text-slate-600">{item.reason}</p><p className="mt-2 text-xs font-semibold text-slate-700">{item.resources?.length ? item.resources.map((resource) => resource.name).join(", ") : "No resources assigned"}</p></button><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={assigning} onClick={() => onConfirm(item)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}Confirm</button><button disabled={assigning} onClick={() => onReject(item.responderId)} className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><ThumbsDown className="h-3.5 w-3.5" />Reject</button></div></div>)}</div>;
}

function RecommendationDetails({ recommendation }: { recommendation: DispatchRecommendationResponse }) {
  return <div className="space-y-4"><div><p className="text-xl font-bold text-slate-950">{recommendation.fullName}</p><p className="text-sm text-slate-500">{recommendation.organization || "No organization listed"}</p></div><Detail label="Status" value={label(recommendation.availabilityStatus || "OFFLINE")} /><Detail label="AI Score" value={`${recommendation.score}/100`} /><Detail label="Resources" value={recommendation.resources?.length ? recommendation.resources.map((resource) => `${resource.name} (${label(resource.status)})`).join(", ") : "No resources assigned"} /><Detail label="Reason" value={recommendation.reason} /><div className="flex gap-2"><a href={`mailto:`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Mail className="h-4 w-4" /> Email</a><a className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Phone className="h-4 w-4" /> Call</a></div></div>;
}

function Badge({ label, urgent = false }: { label: string; urgent?: boolean }) { return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${urgent ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>{label}</span>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-950">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">{text}</div>; }
function EvidenceList({ attachments }: { attachments: AttachmentResponse[] }) { return <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950"><FileVideo className="h-4 w-4" /> Evidence files</p><div className="grid gap-2 sm:grid-cols-2">{attachments.map((attachment) => <button key={attachment.id} onClick={() => downloadEvidence(attachment)} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-blue-200 hover:bg-blue-50"><span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{attachment.fileName}</span><span className="text-xs text-slate-500">{attachment.contentType || "Evidence"}{attachment.sizeBytes ? ` - ${formatBytes(attachment.sizeBytes)}` : ""}</span></span><Download className="h-4 w-4 flex-shrink-0 text-blue-600" /></button>)}</div></div>; }
async function downloadEvidence(attachment: AttachmentResponse) { const blob = await incidentsApi.downloadAttachment(attachment.id); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = attachment.fileName || `evidence-${attachment.id}`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
function formatBytes(bytes: number) { if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }

