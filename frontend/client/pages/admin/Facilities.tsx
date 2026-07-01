import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, Edit3, Hospital, Phone, Plus } from "lucide-react";
import { hospitalsApi } from "@/services/api/resources";
import { AdminButton, AdminPageShell, EmptyState, LoadingState, MetricCard, Notice, Panel, SearchInput, StatusBadge } from "@/components/admin/AdminUI";
import type { HospitalResponse } from "@/types/api";

type FacilityPayload = Omit<HospitalResponse, "id">;

export default function AdminFacilities() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<HospitalResponse | null>(null);
  const [notice, setNotice] = useState("");
  const hospitals = useQuery({ queryKey: ["hospitals", search], queryFn: () => hospitalsApi.list(search) });
  const save = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: FacilityPayload }) => id ? hospitalsApi.update(id, payload) : hospitalsApi.create(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hospitals"] }); setEditing(null); setNotice("Facility saved."); },
  });
  const notify = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) => hospitalsApi.notify(id, message),
    onSuccess: () => setNotice("Facility notification sent."),
  });
  const rows = hospitals.data ?? [];
  return (
    <AdminPageShell title="Hospital & Facility Management" description="Manage receiving facilities, capacity, diversion state, trauma support, and handoff notes.">
      {notice ? <Notice type="success">{notice}</Notice> : null}
      {hospitals.isLoading ? <LoadingState label="Loading facilities..." /> : null}
      <div className="grid gap-4 md:grid-cols-3"><MetricCard label="Facilities" value={rows.length} icon={<Building2 className="h-5 w-5" />} /><MetricCard label="Trauma centers" value={rows.filter((item) => item.traumaCenter).length} icon={<Hospital className="h-5 w-5" />} tone="red" /><MetricCard label="On diversion" value={rows.filter((item) => item.ambulanceDiversion).length} icon={<Phone className="h-5 w-5" />} tone="amber" /></div>
      <Panel title={editing ? "Edit Facility" : "Add Facility"}><FacilityForm key={editing?.id ?? "new"} facility={editing} saving={save.isPending} onCancel={() => setEditing(null)} onSave={(payload) => save.mutate({ id: editing?.id, payload })} /></Panel>
      <SearchInput value={search} onChange={setSearch} placeholder="Search facilities..." />
      <Panel title="Facilities" description={`${rows.length} matching facilities`}>
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((facility) => <div key={facility.id} className="rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-950">{facility.name}</p><p className="text-sm text-slate-500">{facility.address}</p></div><StatusBadge tone={facility.ambulanceDiversion ? "red" : "green"}>{facility.ambulanceDiversion ? "Diversion" : "Receiving"}</StatusBadge></div><div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm"><Capacity label="ER" value={facility.erBeds} /><Capacity label="ICU" value={facility.icuBeds} /><Capacity label="General" value={facility.generalBeds} /></div><p className="mt-3 text-sm text-slate-600">{facility.handoffNotes || "No handoff notes"}</p><div className="mt-4 flex flex-wrap gap-2"><AdminButton variant="secondary" onClick={() => setEditing(facility)}><Edit3 className="h-4 w-4" />Edit</AdminButton><AdminButton variant="secondary" onClick={() => notify.mutate({ id: facility.id, message: "SafeCommunity facility status check requested." })}><Bell className="h-4 w-4" />Notify</AdminButton></div></div>)}
          {rows.length === 0 ? <EmptyState title="No facilities found" text="Adjust the search term or add a facility." /> : null}
        </div>
      </Panel>
    </AdminPageShell>
  );
}

function FacilityForm({ facility, saving, onCancel, onSave }: { facility: HospitalResponse | null; saving: boolean; onCancel: () => void; onSave: (payload: FacilityPayload) => void }) {
  const [form, setForm] = useState<FacilityPayload>({ name: facility?.name ?? "", address: facility?.address ?? "", contact: facility?.contact ?? "", latitude: facility?.latitude, longitude: facility?.longitude, erBeds: facility?.erBeds ?? 0, icuBeds: facility?.icuBeds ?? 0, generalBeds: facility?.generalBeds ?? 0, traumaCenter: facility?.traumaCenter ?? false, ambulanceDiversion: facility?.ambulanceDiversion ?? false, avgHandoffMinutes: facility?.avgHandoffMinutes ?? 0, patientsReceivedToday: facility?.patientsReceivedToday ?? 0, handoffNotes: facility?.handoffNotes ?? "" });
  const update = (key: keyof FacilityPayload, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="grid gap-3 md:grid-cols-3"><Input label="Name" value={form.name} onChange={(v) => update("name", v)} required /><Input label="Address" value={form.address ?? ""} onChange={(v) => update("address", v)} /><Input label="Contact" value={form.contact ?? ""} onChange={(v) => update("contact", v)} /><Input label="ER beds" type="number" value={String(form.erBeds ?? 0)} onChange={(v) => update("erBeds", Number(v))} /><Input label="ICU beds" type="number" value={String(form.icuBeds ?? 0)} onChange={(v) => update("icuBeds", Number(v))} /><Input label="General beds" type="number" value={String(form.generalBeds ?? 0)} onChange={(v) => update("generalBeds", Number(v))} /></div><div className="grid gap-3 md:grid-cols-2"><Toggle label="Trauma center" checked={form.traumaCenter} onChange={(v) => update("traumaCenter", v)} /><Toggle label="Ambulance diversion" checked={form.ambulanceDiversion} onChange={(v) => update("ambulanceDiversion", v)} /></div><textarea value={form.handoffNotes ?? ""} onChange={(e) => update("handoffNotes", e.target.value)} placeholder="Handoff notes" className="w-full rounded-lg border border-slate-300 px-3 py-3" /><div className="flex gap-2"><AdminButton type="submit" disabled={saving}><Plus className="h-4 w-4" />Save facility</AdminButton>{facility ? <AdminButton variant="secondary" onClick={onCancel}>Cancel edit</AdminButton> : null}</div></form>;
}
function Capacity({ label, value }: { label: string; value?: number }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="font-bold text-slate-950">{value ?? 0}</p><p className="text-xs text-slate-500">{label} beds</p></div>; }
function Input({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="text-sm font-bold text-slate-900">{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3" /></label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3 text-sm font-bold text-slate-900"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" /></label>; }
