import { Phone, AlertCircle, Plus, Trash2, Mail, UserRound, HeartPulse, ShieldCheck, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emergencyContactsApi } from "@/services/api/emergencyContacts";
import type { EmergencyContactRequest, EmergencyContactResponse } from "@/types/api";

const hotlines = [
  { name: "Police", phone: "112", detail: "Immediate safety concerns", tone: "red" },
  { name: "Ambulance", phone: "911", detail: "Medical emergencies", tone: "emerald" },
  { name: "Fire", phone: "111", detail: "Fire or smoke danger", tone: "amber" },
];

const emptyForm: EmergencyContactRequest = { name: "", type: "family", phone: "", email: "", notifyOnEmergency: true };

export default function EmergencyContacts() {
  const queryClient = useQueryClient();
  const contacts = useQuery({ queryKey: ["emergency-contacts"], queryFn: emergencyContactsApi.list });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmergencyContactResponse | null>(null);
  const [formData, setFormData] = useState<EmergencyContactRequest>(emptyForm);
  const data = contacts.data ?? [];
  const primaryContacts = useMemo(() => data.filter((contact) => contact.notifyOnEmergency).slice(0, 2), [data]);
  const save = useMutation({
    mutationFn: () => editing ? emergencyContactsApi.update(editing.id, formData) : emergencyContactsApi.create(formData),
    onSuccess: () => {
      setShowForm(false);
      setEditing(null);
      setFormData(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] });
    },
  });
  const remove = useMutation({
    mutationFn: emergencyContactsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] }),
  });

  const openEdit = (contact: EmergencyContactResponse) => {
    setEditing(contact);
    setFormData({ name: contact.name, type: contact.type, phone: contact.phone, email: contact.email || "", notifyOnEmergency: contact.notifyOnEmergency });
    setShowForm(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-red-600">Trusted people</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 lg:text-4xl">Emergency contacts</h1>
          <p className="mt-2 text-slate-600">Saved contacts can be included when you send a panic alert or incident report.</p>
        </div>
        <button onClick={() => { setEditing(null); setFormData(emptyForm); setShowForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700">
          <Plus className="h-4 w-4" />
          Add contact
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {hotlines.map((hotline) => <Hotline key={hotline.name} hotline={hotline} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div><h2 className="text-xl font-bold text-slate-950">Saved contacts</h2><p className="mt-1 text-sm text-slate-500">Family, medical, and trusted contacts.</p></div>
            {contacts.isFetching ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
          </div>
          <div className="divide-y divide-slate-200">
            {data.length === 0 ? <div className="p-10 text-center text-slate-500">No contacts saved. Add one to get started.</div> : data.map((contact) => (
              <div key={contact.id} className="p-5 transition hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <button onClick={() => openEdit(contact)} className="flex min-w-0 gap-4 text-left">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><UserRound className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-950">{contact.name}</h3>
                        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${getTypeColor(contact.type)}`}>{getTypeLabel(contact.type)}</span>
                        {contact.notifyOnEmergency ? <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Auto-notify</span> : null}
                      </div>
                      <p className="flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4" />{contact.phone}</p>
                      {contact.email ? <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Mail className="h-4 w-4" />{contact.email}</p> : null}
                    </div>
                  </button>
                  <button onClick={() => remove.mutate(contact.id)} className="rounded-lg p-2 text-red-600 transition hover:bg-red-50" aria-label={`Delete ${contact.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-bold text-slate-950"><HeartPulse className="h-5 w-5 text-red-600" /> Auto-notify list</h3>
            <div className="mt-4 space-y-3">
              {primaryContacts.length === 0 ? <p className="text-sm text-slate-500">Enable auto-notify on trusted contacts.</p> : primaryContacts.map((contact) => (
                <a key={contact.id} href={`tel:${contact.phone}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition hover:border-red-200 hover:bg-red-50">
                  <span><span className="block font-semibold text-slate-950">{contact.name}</span><span className="text-sm text-slate-500">{contact.phone}</span></span>
                  <Phone className="h-4 w-4 text-red-600" />
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="flex items-center gap-2 font-bold text-emerald-950"><ShieldCheck className="h-5 w-5" /> Helpful reminder</h3>
            <p className="mt-2 text-sm leading-6 text-emerald-900">Choose contacts who can answer quickly and know your medical needs or home location.</p>
          </section>
        </aside>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 p-5">
              <h3 className="font-bold text-slate-950">{editing ? "Edit emergency contact" : "Add emergency contact"}</h3>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="space-y-4 p-5">
              <Field label="Name" value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} placeholder="Full name" />
              <label className="block text-sm font-semibold text-slate-900">Type<select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"><option value="family">Family</option><option value="medical">Medical</option><option value="emergency">Emergency</option><option value="other">Other</option></select></label>
              <Field label="Phone" value={formData.phone} onChange={(value) => setFormData({ ...formData, phone: value })} placeholder="555-1234" type="tel" />
              <Field label="Email" value={formData.email || ""} onChange={(value) => setFormData({ ...formData, email: value })} placeholder="Optional" type="email" required={false} />
              <button type="button" onClick={() => setFormData({ ...formData, notifyOnEmergency: !formData.notifyOnEmergency })} className={`w-full rounded-lg border p-3 text-left text-sm font-semibold ${formData.notifyOnEmergency ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-700"}`}>Notify this contact during emergency reports</button>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-50">Cancel</button>
                <button disabled={save.isPending} type="submit" className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">{editing ? "Save" : "Add"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Hotline({ hotline }: { hotline: { name: string; phone: string; detail: string; tone: string } }) {
  const classes: Record<string, string> = { red: "border-red-200 bg-red-50 text-red-700", emerald: "border-emerald-200 bg-emerald-50 text-emerald-700", amber: "border-amber-200 bg-amber-50 text-amber-700" };
  return <a href={`tel:${hotline.phone}`} className={`rounded-lg border p-5 shadow-sm transition hover:-translate-y-0.5 ${classes[hotline.tone]}`}><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-950">{hotline.name}</h3><AlertCircle className="h-5 w-5" /></div><p className="text-3xl font-bold text-slate-950">{hotline.phone}</p><p className="mt-1 text-sm text-slate-600">{hotline.detail}</p></a>;
}
function Field({ label, value, onChange, placeholder, type = "text", required = true }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return <label className="block text-sm font-semibold text-slate-900">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3" required={required} /></label>;
}
function getTypeColor(type: string) { return type === "emergency" ? "bg-red-50 text-red-700" : type === "family" ? "bg-blue-50 text-blue-700" : type === "medical" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"; }
function getTypeLabel(type: string) { return type.charAt(0).toUpperCase() + type.slice(1); }
