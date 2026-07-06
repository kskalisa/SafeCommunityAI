import { AlertCircle, CheckCircle, Clock, MapPin, MessageCircle, Navigation, Phone, RadioTower, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dispatchApi } from "@/services/api/dispatch";
import type { AssignmentResponse, ResponderStatus } from "@/types/api";

export default function ResponderIncidents() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const assignments = useQuery({ queryKey: ["assignments", "mine"], queryFn: dispatchApi.mine });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ResponderStatus }) => dispatchApi.update(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const data = assignments.data ?? [];
  const pending = data.filter((item) => item.responderStatus === "ASSIGNED");
  const active = data.filter((item) => ["EN_ROUTE", "ON_SCENE", "TRANSPORTING"].includes(item.responderStatus) || ["EN_ROUTE", "ON_SCENE"].includes(item.incidentStatus));
  const completed = data.filter((item) => item.responderStatus === "COMPLETED");
  const selected = useMemo(() => data.find((item) => item.id === selectedId) ?? active[0] ?? pending[0] ?? data[0], [data, selectedId, active, pending]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-red-600">Assigned incidents</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 lg:text-4xl">Incidents assigned to me</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Review assigned incidents, open Google Maps for routing, and update dispatch as your status changes.</p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="New requests" value={pending.length} icon={<Clock className="h-5 w-5" />} tone="blue" />
        <Metric title="Active now" value={active.length} icon={<AlertCircle className="h-5 w-5" />} tone="orange" />
        <Metric title="Completed" value={completed.length} icon={<CheckCircle className="h-5 w-5" />} tone="green" />
        <Metric title="Total assigned" value={data.length} icon={<RadioTower className="h-5 w-5" />} tone="slate" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AssignmentSection title="New requests" empty="No new dispatch requests right now." items={pending} onSelect={setSelectedId} action={(item) => <ActionRow item={item} updateStatus={updateStatus.mutate} loading={updateStatus.isPending} />} />
          <AssignmentSection title="Active assignments" empty="No active assignment. Stay available for the next call." items={active} onSelect={setSelectedId} action={(item) => <StatusButtons item={item} updateStatus={updateStatus.mutate} loading={updateStatus.isPending} />} />
          <AssignmentSection title="Completed" empty="Completed assignments will appear here." items={completed} onSelect={setSelectedId} action={(item) => <MapLink item={item} />} />
        </div>
        <DetailPanel assignment={selected} updateStatus={updateStatus.mutate} loading={updateStatus.isPending} />
      </div>

      {assignments.isLoading ? <p className="text-sm text-slate-500">Loading assigned incidents...</p> : null}
    </div>
  );
}

function AssignmentSection({ title, empty, items, onSelect, action }: { title: string; empty: string; items: AssignmentResponse[]; onSelect: (id: number) => void; action: (item: AssignmentResponse) => React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-bold text-slate-950">{title}</h2></div>
      {items.length === 0 ? <div className="p-8 text-center text-sm text-slate-500"><ShieldCheck className="mx-auto mb-3 h-9 w-9 text-slate-300" />{empty}</div> : (
        <div className="divide-y divide-slate-200">
          {items.map((item) => (
            <div key={item.id} className="p-5 transition hover:bg-slate-50">
              <button onClick={() => onSelect(item.id)} className="w-full text-left">
                <div className="mb-2 flex flex-wrap items-center gap-2"><span className="font-bold text-slate-950">{item.referenceNumber}</span><Badge label={friendly(item.type)} /><Badge label={item.priority === "CRITICAL" ? "Urgent" : friendly(item.priority)} urgent={item.priority === "CRITICAL"} /></div>
                <p className="mb-3 text-sm text-slate-700">{item.description || "No extra details provided."}</p>
                <p className="flex flex-wrap gap-3 text-xs text-slate-500"><span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{item.location}</span><span>ETA {item.etaMinutes || 0}m</span><span>{friendly(item.responderStatus)}</span></p>
              </button>
              <div className="mt-4 flex flex-wrap items-center gap-2"><MapLink item={item} />{action(item)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ActionRow({ item, updateStatus, loading }: { item: AssignmentResponse; updateStatus: (input: { id: number; status: ResponderStatus }) => void; loading: boolean }) {
  return <div className="flex flex-wrap gap-2"><button disabled={loading} onClick={() => updateStatus({ id: item.id, status: "EN_ROUTE" })} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">Accept and go</button><button disabled={loading} onClick={() => updateStatus({ id: item.id, status: "OFFLINE" })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">Decline</button></div>;
}

function StatusButtons({ item, updateStatus, loading }: { item: AssignmentResponse; updateStatus: (input: { id: number; status: ResponderStatus }) => void; loading: boolean }) {
  return <div className="flex flex-wrap gap-2"><SmallAction label="En route" disabled={loading} onClick={() => updateStatus({ id: item.id, status: "EN_ROUTE" })} /><SmallAction label="On scene" disabled={loading} onClick={() => updateStatus({ id: item.id, status: "ON_SCENE" })} /><SmallAction label="Complete" disabled={loading} onClick={() => updateStatus({ id: item.id, status: "COMPLETED" })} /></div>;
}

function DetailPanel({ assignment, updateStatus, loading }: { assignment?: AssignmentResponse; updateStatus: (input: { id: number; status: ResponderStatus }) => void; loading: boolean }) {
  if (!assignment) return <aside className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Select an assignment to view route and status details.</aside>;
  return (
    <aside className="h-fit overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-red-50 p-5"><h3 className="font-bold text-slate-950">{assignment.referenceNumber}</h3><p className="text-sm text-slate-600">{friendly(assignment.type)} - {assignment.priority === "CRITICAL" ? "Urgent" : friendly(assignment.priority)}</p></div>
      <div className="space-y-4 p-5">
        <Detail label="Location" value={assignment.location} />
        <Detail label="Current status" value={`${friendly(assignment.incidentStatus)} / ${friendly(assignment.responderStatus)}`} />
        <Detail label="Details" value={assignment.description || "No extra details provided."} />
        <div className="grid grid-cols-3 gap-2 pt-2"><PanelButton icon={<MessageCircle className="h-4 w-4" />} label="Chat" /><PanelButton icon={<Phone className="h-4 w-4" />} label="Call" /><MapLink item={assignment} compact /></div>
        <StatusButtons item={assignment} updateStatus={updateStatus} loading={loading} />
      </div>
    </aside>
  );
}

function MapLink({ item, compact = false }: { item: AssignmentResponse; compact?: boolean }) {
  if (typeof item.latitude !== "number" || typeof item.longitude !== "number") return null;
  const className = compact
    ? "flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
    : "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700";
  return <a href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer" className={className}><Navigation className="h-4 w-4" />Map</a>;
}

function Metric({ title, value, icon, tone }: { title: string; value: number; icon: React.ReactNode; tone: "orange" | "blue" | "green" | "slate" }) {
  const cls = { orange: "border-orange-500 text-orange-600", blue: "border-blue-500 text-blue-600", green: "border-emerald-500 text-emerald-600", slate: "border-slate-500 text-slate-600" }[tone];
  return <div className={`rounded-lg border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${cls}`}><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">{title}</h3>{icon}</div><p className="text-3xl font-bold text-slate-950">{value}</p></div>;
}
function Badge({ label, urgent = false }: { label: string; urgent?: boolean }) { return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${urgent ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>{label}</span>; }
function SmallAction({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) { return <button disabled={disabled} onClick={onClick} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60">{label}</button>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="text-sm font-semibold text-slate-950">{value}</p></div>; }
function PanelButton({ icon, label }: { icon: React.ReactNode; label: string }) { return <button className="flex items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">{icon}{label}</button>; }
function friendly(value: string) { return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()); }
