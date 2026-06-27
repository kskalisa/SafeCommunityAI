import { Ambulance, Edit2, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resourcesApi } from "@/services/api/resources";
import type { ResourceResponse, ResourceStatus } from "@/types/api";

const resourceTypes = ["AMBULANCE", "FIRE_TRUCK", "POLICE_VEHICLE", "RESCUE_VAN", "MEDICAL_KIT", "COMMUNICATION_RADIO", "WATER_TRUCK"];
const districts = ["Gasabo", "Kicukiro", "Nyarugenge", "Bugesera", "Rwamagana", "Musanze", "Huye", "Rubavu", "Rusizi", "Nyagatare"];
const statuses: ResourceStatus[] = ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "OUT_OF_SERVICE"];
const pageSize = 6;

type ResourceForm = { name: string; type: string; status: ResourceStatus; location: string };
const emptyForm: ResourceForm = { name: "", type: "AMBULANCE", status: "AVAILABLE", location: "Gasabo" };

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function Resources() {
  const queryClient = useQueryClient();
  const resources = useQuery({ queryKey: ["resources"], queryFn: resourcesApi.list });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ResourceStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceResponse | null>(null);
  const [form, setForm] = useState<ResourceForm>(emptyForm);

  const create = useMutation({
    mutationFn: resourcesApi.create,
    onSuccess: () => {
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, request }: { id: number; request: ResourceForm }) => resourcesApi.update(id, request),
    onSuccess: () => {
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
  const remove = useMutation({
    mutationFn: resourcesApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
  });

  const data = resources.data ?? [];
  const filtered = useMemo(() => {
    const text = query.toLowerCase();
    return data.filter((resource) => {
      const matchesText = `${resource.name} ${resource.type} ${resource.location ?? ""}`.toLowerCase().includes(text);
      const matchesStatus = statusFilter === "ALL" || resource.status === statusFilter;
      const matchesType = typeFilter === "ALL" || resource.type === typeFilter;
      return matchesText && matchesStatus && matchesType;
    });
  }, [data, query, statusFilter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (resource: ResourceResponse) => {
    setEditing(resource);
    setForm({ name: resource.name, type: resource.type, status: resource.status, location: resource.location || "Gasabo" });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (editing) update.mutate({ id: editing.id, request: form });
    else create.mutate(form);
  };

  const deleteResource = (resource: ResourceResponse) => {
    if (window.confirm(`Delete ${resource.name}?`)) remove.mutate(resource.id);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-5 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-950 lg:text-4xl">Resources</h1>
          <p className="text-slate-600">Manage vehicles, equipment, and where each resource is ready to respond.</p>
        </div>
        <div className="flex items-center gap-3">
          {resources.isFetching ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Add resource</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat title="Total" value={data.length} />
        <Stat title="Available" value={data.filter((r) => r.status === "AVAILABLE").length} />
        <Stat title="Assigned" value={data.filter((r) => r.status === "ASSIGNED").length} />
        <Stat title="Needs attention" value={data.filter((r) => ["MAINTENANCE", "OUT_OF_SERVICE"].includes(r.status)).length} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <label className="relative block">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search by name, type, or district" className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value as "ALL" | ResourceStatus); }} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700">
            <option value="ALL">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
          </select>
          <select value={typeFilter} onChange={(event) => { setPage(1); setTypeFilter(event.target.value); }} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700">
            <option value="ALL">All types</option>
            {resourceTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
          </select>
        </div>
      </section>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50"><tr><Th>Name</Th><Th>Type</Th><Th>Status</Th><Th>District</Th><Th>Actions</Th></tr></thead>
            <tbody className="divide-y divide-slate-200">{pageRows.map((resource) => <ResourceRow key={resource.id} resource={resource} onEdit={openEdit} onDelete={deleteResource} />)}</tbody>
          </table>
        </div>
        {!resources.isLoading && pageRows.length === 0 ? <div className="p-8 text-center text-slate-500">No resources match your filters.</div> : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-sm text-slate-500">Showing {pageRows.length} of {filtered.length} resources</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold">{page} / {pageCount}</span>
            <button disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={submit} className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">{editing ? "Edit Resource" : "Add Resource"}</h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4">
              <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <Select label="Type" value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={resourceTypes} />
              <Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value as ResourceStatus })} options={statuses} />
              <Select label="District" value={form.location} onChange={(value) => setForm({ ...form, location: value })} options={districts} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="rounded-lg border px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button disabled={create.isPending || update.isPending} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{editing ? "Save changes" : "Create resource"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ResourceRow({ resource, onEdit, onDelete }: { resource: ResourceResponse; onEdit: (resource: ResourceResponse) => void; onDelete: (resource: ResourceResponse) => void }) {
  return <tr className="transition hover:bg-slate-50"><td className="flex items-center gap-2 px-6 py-4 text-sm font-semibold text-slate-950"><Ambulance className="h-4 w-4 text-slate-500" />{resource.name}</td><td className="px-6 py-4 text-sm text-slate-600">{label(resource.type)}</td><td className="px-6 py-4"><span className={`rounded-md px-2.5 py-1 text-xs font-bold ${statusClass(resource.status)}`}>{label(resource.status)}</span></td><td className="px-6 py-4 text-sm text-slate-600">{resource.location || "Not set"}</td><td className="px-6 py-4"><div className="flex gap-2"><button onClick={() => onEdit(resource)} className="rounded-lg border p-2 text-slate-600 hover:bg-slate-100" aria-label={`Edit ${resource.name}`}><Edit2 className="h-4 w-4" /></button><button onClick={() => onDelete(resource)} className="rounded-lg border p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${resource.name}`}><Trash2 className="h-4 w-4" /></button></div></td></tr>;
}
function statusClass(status: ResourceStatus) { if (status === "AVAILABLE") return "bg-green-50 text-green-700"; if (status === "ASSIGNED") return "bg-blue-50 text-blue-700"; if (status === "MAINTENANCE") return "bg-yellow-50 text-yellow-800"; return "bg-red-50 text-red-700"; }
function Stat({ title, value }: { title: string; value: number }) { return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="mb-1 text-sm font-bold uppercase text-slate-500">{title}</p><p className="text-3xl font-bold text-slate-950">{value}</p></div>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-sm font-semibold text-slate-900">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" required /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) { return <label className="block text-sm font-semibold text-slate-900">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2">{options.map((option) => <option key={option} value={option}>{labelValue(option)}</option>)}</select></label>; }
function labelValue(value: string) { return value.includes("_") ? label(value) : value; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">{children}</th>; }
