import { Download, Edit2, FileText, Hospital, Loader2, Plus, Search, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hospitalsApi } from "@/services/api/resources";
import { downloadCsv, printPdf } from "@/lib/export";
import type { HospitalResponse } from "@/types/api";

type HospitalForm = Omit<HospitalResponse, "id">;
const emptyForm: HospitalForm = { name: "", address: "", contact: "", erBeds: 0, icuBeds: 0, generalBeds: 0, traumaCenter: false, ambulanceDiversion: false, avgHandoffMinutes: 0, patientsReceivedToday: 0, handoffNotes: "" };

export default function Hospitals() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HospitalResponse | null>(null);
  const [form, setForm] = useState<HospitalForm>(emptyForm);
  const [notice, setNotice] = useState("");
  const hospitals = useQuery({ queryKey: ["hospitals", search], queryFn: () => hospitalsApi.list(search) });
  const data = hospitals.data ?? [];
  const totalBeds = data.reduce((sum, hospital) => sum + (hospital.erBeds ?? 0) + (hospital.icuBeds ?? 0) + (hospital.generalBeds ?? 0), 0);
  const availableHospitals = data.filter((hospital) => !hospital.ambulanceDiversion);
  const traumaCenters = data.filter((hospital) => hospital.traumaCenter);

  const save = useMutation({
    mutationFn: () => editing ? hospitalsApi.update(editing.id, form) : hospitalsApi.create(form),
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
    },
  });
  const notify = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) => hospitalsApi.notify(id, message),
    onSuccess: () => {
      setNotice("");
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
    },
  });

  const exportRows = useMemo(() => data.map((hospital) => ({
    name: hospital.name,
    address: hospital.address ?? "",
    contact: hospital.contact ?? "",
    erBeds: hospital.erBeds ?? 0,
    icuBeds: hospital.icuBeds ?? 0,
    generalBeds: hospital.generalBeds ?? 0,
    traumaCenter: hospital.traumaCenter ? "Yes" : "No",
    diversion: hospital.ambulanceDiversion ? "Yes" : "No",
    avgHandoffMinutes: hospital.avgHandoffMinutes ?? 0,
    patientsToday: hospital.patientsReceivedToday ?? 0,
  })), [data]);

  const openEdit = (hospital: HospitalResponse) => {
    setEditing(hospital);
    setForm({ name: hospital.name, address: hospital.address ?? "", contact: hospital.contact ?? "", latitude: hospital.latitude, longitude: hospital.longitude, erBeds: hospital.erBeds ?? 0, icuBeds: hospital.icuBeds ?? 0, generalBeds: hospital.generalBeds ?? 0, traumaCenter: hospital.traumaCenter, ambulanceDiversion: hospital.ambulanceDiversion, avgHandoffMinutes: hospital.avgHandoffMinutes ?? 0, patientsReceivedToday: hospital.patientsReceivedToday ?? 0, handoffNotes: hospital.handoffNotes ?? "" });
    setModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-5 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950 lg:text-4xl">Hospitals & Facilities</h1>
          <p className="mt-2 text-slate-600">Route medical incidents by bed capacity, diversion status, trauma support, and handoff readiness.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hospitals.isFetching ? <Loader2 className="mt-2 h-5 w-5 animate-spin text-slate-400" /> : null}
          <button onClick={() => downloadCsv("hospital-facility-report.csv", exportRows)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" /> CSV</button>
          <button onClick={() => printPdf("Hospital Facility Report", [{ heading: "Facilities", rows: exportRows }])} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"><FileText className="h-4 w-4" /> PDF</button>
          <button onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Add facility</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat title="Facilities" value={data.length} />
        <Stat title="Available" value={availableHospitals.length} />
        <Stat title="Trauma centers" value={traumaCenters.length} />
        <Stat title="Open beds" value={totalBeds} />
      </div>

      <label className="relative block rounded-lg border bg-white p-4 shadow-sm">
        <Search className="absolute left-7 top-7 h-5 w-5 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or address" className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
      </label>

      <div className="grid gap-5 lg:grid-cols-2">
        {data.map((hospital) => (
          <section key={hospital.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950"><Hospital className="h-5 w-5 text-blue-600" /> {hospital.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{hospital.address || "Address not set"} - {hospital.contact || "No contact"}</p>
              </div>
              <button onClick={() => openEdit(hospital)} className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50"><Edit2 className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="ER beds" value={hospital.erBeds ?? 0} />
              <Info label="ICU beds" value={hospital.icuBeds ?? 0} />
              <Info label="General beds" value={hospital.generalBeds ?? 0} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge text={hospital.traumaCenter ? "Trauma center" : "General facility"} tone={hospital.traumaCenter ? "blue" : "slate"} />
              <Badge text={hospital.ambulanceDiversion ? "Diversion active" : "Accepting ambulances"} tone={hospital.ambulanceDiversion ? "red" : "green"} />
              <Badge text={`${hospital.avgHandoffMinutes ?? 0}m avg handoff`} tone="slate" />
            </div>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{hospital.handoffNotes || "No handoff notes yet."}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input value={notice} onChange={(event) => setNotice(event.target.value)} placeholder="Incoming patient notice..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button onClick={() => notify.mutate({ id: hospital.id, message: notice || "Incoming patient" })} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><Send className="h-4 w-4" /> Notify</button>
            </div>
          </section>
        ))}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-950">{editing ? "Edit Facility" : "Add Facility"}</h2><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <Field label="Contact" value={form.contact ?? ""} onChange={(value) => setForm({ ...form, contact: value })} />
              <Field label="Address" value={form.address ?? ""} onChange={(value) => setForm({ ...form, address: value })} />
              <Field label="Average handoff minutes" type="number" value={String(form.avgHandoffMinutes ?? 0)} onChange={(value) => setForm({ ...form, avgHandoffMinutes: Number(value) })} />
              <Field label="ER beds" type="number" value={String(form.erBeds ?? 0)} onChange={(value) => setForm({ ...form, erBeds: Number(value) })} />
              <Field label="ICU beds" type="number" value={String(form.icuBeds ?? 0)} onChange={(value) => setForm({ ...form, icuBeds: Number(value) })} />
              <Field label="General beds" type="number" value={String(form.generalBeds ?? 0)} onChange={(value) => setForm({ ...form, generalBeds: Number(value) })} />
              <Field label="Patients received today" type="number" value={String(form.patientsReceivedToday ?? 0)} onChange={(value) => setForm({ ...form, patientsReceivedToday: Number(value) })} />
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-900">Handoff notes<textarea value={form.handoffNotes ?? ""} onChange={(event) => setForm({ ...form, handoffNotes: event.target.value })} className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Toggle label="Trauma center" value={form.traumaCenter} onChange={(value) => setForm({ ...form, traumaCenter: value })} />
              <Toggle label="Ambulance diversion" value={form.ambulanceDiversion} onChange={(value) => setForm({ ...form, ambulanceDiversion: value })} />
            </div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2 font-semibold">Cancel</button><button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">{editing ? "Save" : "Create"}</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) { return <div className="rounded-lg border bg-white p-5 shadow-sm"><p className="text-sm font-bold uppercase text-slate-500">{title}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p></div>; }
function Info({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p></div>; }
function Badge({ text, tone }: { text: string; tone: "blue" | "green" | "red" | "slate" }) { const tones = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", red: "bg-red-50 text-red-700", slate: "bg-slate-100 text-slate-700" }; return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{text}</span>; }
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block text-sm font-semibold text-slate-900">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" required={label === "Name"} /></label>; }
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <button type="button" onClick={() => onChange(!value)} className={`rounded-lg border p-3 text-left text-sm font-semibold ${value ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 text-slate-700"}`}>{label}<span className="mt-1 block text-xs">{value ? "Yes" : "No"}</span></button>; }
