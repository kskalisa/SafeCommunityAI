import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Package, Plus, Trash2 } from "lucide-react";
import { resourcesApi } from "@/services/api/resources";
import { AdminButton, AdminModal, AdminPageShell, EmptyState, LoadingState, MetricCard, Notice, Panel, SearchInput, StatusBadge } from "@/components/admin/AdminUI";
import type { ResourceResponse, ResourceStatus } from "@/types/api";

const resourceTypes = ["AMBULANCE", "FIRE_TRUCK", "POLICE_VEHICLE", "RESCUE_VAN", "MEDICAL_KIT", "COMMUNICATION_RADIO", "WATER_TRUCK"];
const districts = ["Gasabo", "Kicukiro", "Nyarugenge", "Bugesera", "Rwamagana", "Musanze", "Huye", "Rubavu", "Rusizi", "Nyagatare"];
const statuses: ResourceStatus[] = ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "OUT_OF_SERVICE"];
const statusFilters: Array<"ALL" | ResourceStatus> = ["ALL", ...statuses];
const pageSize = 9;

type ResourceFormValue = { id?: number; name: string; type: string; status: ResourceStatus; location: string };
const emptyForm: ResourceFormValue = { name: "", type: "AMBULANCE", status: "AVAILABLE", location: "Gasabo" };
const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function AdminResources() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | ResourceStatus>("ALL");
  const [type, setType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ResourceResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const resources = useQuery({ queryKey: ["resources"], queryFn: resourcesApi.list });
  const save = useMutation({
    mutationFn: (request: ResourceFormValue) => request.id ? resourcesApi.update(request.id, request) : resourcesApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setEditing(null);
      setFormOpen(false);
      setNotice("Resource saved.");
    },
  });
  const remove = useMutation({
    mutationFn: resourcesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setNotice("Resource removed.");
    },
  });

  const all = resources.data ?? [];
  const rows = useMemo(() => {
    const query = search.toLowerCase();
    return all.filter((item) => {
      const matchesText = `${item.name} ${item.type} ${item.location ?? ""}`.toLowerCase().includes(query);
      return matchesText && (status === "ALL" || item.status === status) && (type === "ALL" || item.type === type);
    });
  }, [all, search, status, type]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (resource: ResourceResponse) => {
    setEditing(resource);
    setFormOpen(true);
  };

  return (
    <AdminPageShell title="Resource Management" description="Create, edit, filter, and retire response assets across the emergency network." actions={<AdminButton onClick={openCreate}><Plus className="h-4 w-4" />Add resource</AdminButton>}>
      {notice ? <Notice type="success">{notice}</Notice> : null}
      {save.error ? <Notice type="error">{save.error instanceof Error ? save.error.message : "Could not save resource."}</Notice> : null}
      {resources.isLoading ? <LoadingState label="Loading resources..." /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total assets" value={all.length} icon={<Package className="h-5 w-5" />} />
        <MetricCard label="Available" value={all.filter((item) => item.status === "AVAILABLE").length} icon={<Package className="h-5 w-5" />} tone="emerald" />
        <MetricCard label="Assigned" value={all.filter((item) => item.status === "ASSIGNED").length} icon={<Package className="h-5 w-5" />} tone="amber" />
        <MetricCard label="Needs attention" value={all.filter((item) => ["MAINTENANCE", "OUT_OF_SERVICE"].includes(item.status)).length} icon={<Package className="h-5 w-5" />} tone="red" />
      </div>

      <AdminModal open={formOpen} title={editing ? "Edit resource" : "Add resource"} description="Use the same resource fields dispatchers use for operational inventory." onClose={() => setFormOpen(false)}>
        <ResourceForm key={editing?.id ?? "new"} resource={editing} saving={save.isPending} onCancel={() => setFormOpen(false)} onSave={(request) => save.mutate(request)} />
      </AdminModal>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_14rem_14rem]">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search asset name, type, or district..." />
        <select value={status} onChange={(event) => { setStatus(event.target.value as "ALL" | ResourceStatus); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold">{statusFilters.map((item) => <option key={item} value={item}>{item === "ALL" ? "All statuses" : label(item)}</option>)}</select>
        <select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold"><option value="ALL">All types</option>{resourceTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
      </div>

      <Panel title="Resource Inventory" description={`${rows.length} matching assets`}>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b bg-slate-50"><tr><Th>Name</Th><Th>Type</Th><Th>Status</Th><Th>District</Th><Th>Actions</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((resource) => <ResourceRow key={resource.id} resource={resource} onEdit={openEdit} onDelete={(item) => window.confirm(`Remove ${item.name}?`) && remove.mutate(item.id)} />)}
              </tbody>
            </table>
          </div>
          {rows.length === 0 ? <div className="p-6"><EmptyState title="No resources found" text="Adjust filters or add a new response asset." /></div> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm text-slate-600"><span>Showing {pageRows.length} of {rows.length} resources</span><div className="flex gap-2"><AdminButton variant="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</AdminButton><span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold">{page} / {pageCount}</span><AdminButton variant="secondary" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</AdminButton></div></div>
        </div>
      </Panel>
    </AdminPageShell>
  );
}

function ResourceForm({ resource, saving, onCancel, onSave }: { resource: ResourceResponse | null; saving: boolean; onCancel: () => void; onSave: (request: ResourceFormValue) => void }) {
  const [form, setForm] = useState<ResourceFormValue>({ id: resource?.id, name: resource?.name ?? "", type: resource?.type ?? "AMBULANCE", status: resource?.status ?? "AVAILABLE", location: resource?.location ?? "Gasabo" });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(form);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
      <div className="grid gap-4 md:grid-cols-3">
        <Select label="Type" value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={resourceTypes} />
        <Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value as ResourceStatus })} options={statuses} />
        <Select label="District" value={form.location} onChange={(value) => setForm({ ...form, location: value })} options={districts} />
      </div>
      <div className="flex justify-end gap-2"><AdminButton variant="secondary" onClick={onCancel}>Cancel</AdminButton><AdminButton type="submit" disabled={saving}>{saving ? "Saving..." : resource ? "Save changes" : "Create resource"}</AdminButton></div>
    </form>
  );
}

function ResourceRow({ resource, onEdit, onDelete }: { resource: ResourceResponse; onEdit: (resource: ResourceResponse) => void; onDelete: (resource: ResourceResponse) => void }) {
  return <tr className="transition hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-slate-500" /><span className="font-bold text-slate-950">{resource.name}</span></div></td><td className="px-5 py-4 text-sm text-slate-600">{label(resource.type)}</td><td className="px-5 py-4"><StatusBadge tone={resource.status === "AVAILABLE" ? "green" : resource.status === "MAINTENANCE" ? "amber" : resource.status === "ASSIGNED" ? "blue" : "red"}>{label(resource.status)}</StatusBadge></td><td className="px-5 py-4 text-sm text-slate-600">{resource.location || "Not set"}</td><td className="px-5 py-4"><div className="flex gap-2"><AdminButton variant="secondary" onClick={() => onEdit(resource)}><Edit3 className="h-4 w-4" />Edit</AdminButton><AdminButton variant="secondary" onClick={() => onDelete(resource)}><Trash2 className="h-4 w-4" />Remove</AdminButton></div></td></tr>;
}

function Field({ label: text, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold text-slate-900">{text}<input required value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>;
}
function Select({ label: text, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) {
  return <label className="block text-sm font-semibold text-slate-900">{text}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100">{options.map((option) => <option key={option} value={option}>{option.includes("_") ? label(option) : option}</option>)}</select></label>;
}
function Th({ children }: { children: React.ReactNode }) { return <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{children}</th>; }
