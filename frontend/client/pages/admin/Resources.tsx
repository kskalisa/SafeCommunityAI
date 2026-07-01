import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Package, Plus, Trash2 } from "lucide-react";
import { resourcesApi } from "@/services/api/resources";
import { AdminButton, AdminModal, AdminPageShell, EmptyState, LoadingState, MetricCard, Notice, Panel, SearchInput, StatusBadge } from "@/components/admin/AdminUI";
import type { ResourceResponse, ResourceStatus } from "@/types/api";

const statuses: Array<"ALL" | ResourceStatus> = ["ALL", "AVAILABLE", "ASSIGNED", "MAINTENANCE", "OUT_OF_SERVICE"];

export default function AdminResources() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | ResourceStatus>("ALL");
  const [editing, setEditing] = useState<ResourceResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const resources = useQuery({ queryKey: ["resources"], queryFn: resourcesApi.list });
  const save = useMutation({
    mutationFn: (request: { id?: number; name: string; type: string; status: ResourceStatus; location?: string }) => request.id ? resourcesApi.update(request.id, request) : resourcesApi.create(request),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["resources"] }); setEditing(null); setFormOpen(false); setNotice("Resource saved."); },
  });
  const remove = useMutation({
    mutationFn: resourcesApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["resources"] }); setNotice("Resource removed."); },
  });
  const rows = useMemo(() => (resources.data ?? []).filter((item) => `${item.name} ${item.type} ${item.location ?? ""}`.toLowerCase().includes(search.toLowerCase()) && (status === "ALL" || item.status === status)), [resources.data, search, status]);
  const all = resources.data ?? [];
  return (
    <AdminPageShell title="Resource Management" description="Create, edit, filter, and retire response assets across the emergency network." actions={<AdminButton onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" />Add resource</AdminButton>}>
      {notice ? <Notice type="success">{notice}</Notice> : null}
      {resources.isLoading ? <LoadingState label="Loading resources..." /> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total assets" value={all.length} icon={<Package className="h-5 w-5" />} />
        <MetricCard label="Available" value={all.filter((item) => item.status === "AVAILABLE").length} icon={<Package className="h-5 w-5" />} tone="emerald" />
        <MetricCard label="Assigned" value={all.filter((item) => item.status === "ASSIGNED").length} icon={<Package className="h-5 w-5" />} tone="amber" />
        <MetricCard label="Unavailable" value={all.filter((item) => ["MAINTENANCE", "OUT_OF_SERVICE"].includes(item.status)).length} icon={<Package className="h-5 w-5" />} tone="red" />
      </div>
      <AdminModal open={formOpen} title={editing ? "Edit resource" : "Add resource"} description="Maintain the operational inventory." onClose={() => setFormOpen(false)}>
        <ResourceForm key={editing?.id ?? "new"} resource={editing} saving={save.isPending} onCancel={() => setEditing(null)} onSave={(request) => save.mutate(request)} />
      </AdminModal>
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_14rem]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search asset name, type, location..." />
        <select value={status} onChange={(event) => setStatus(event.target.value as "ALL" | ResourceStatus)} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold">{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </div>
      <Panel title="Resource Inventory" description={`${rows.length} matching assets`}>
        <div className="grid gap-4 lg:grid-cols-3">
          {rows.map((resource) => <div key={resource.id} className="rounded-lg border border-slate-200 p-4 transition hover:border-red-200"><div className="flex items-start justify-between gap-3"><Package className="h-5 w-5 text-red-600" /><StatusBadge tone={resource.status === "AVAILABLE" ? "green" : resource.status === "MAINTENANCE" ? "amber" : resource.status === "ASSIGNED" ? "blue" : "red"}>{resource.status}</StatusBadge></div><p className="mt-4 font-bold text-slate-950">{resource.name}</p><p className="text-sm text-slate-500">{resource.type}</p><p className="mt-2 text-sm text-slate-600">{resource.location || "No location"}</p><div className="mt-4 flex gap-2"><AdminButton variant="secondary" onClick={() => { setEditing(resource); setFormOpen(true); }}><Edit3 className="h-4 w-4" />Edit</AdminButton><AdminButton variant="secondary" onClick={() => window.confirm("Remove this resource?") && remove.mutate(resource.id)}><Trash2 className="h-4 w-4" />Remove</AdminButton></div></div>)}
          {rows.length === 0 ? <EmptyState title="No resources found" text="Adjust filters or add a new response asset." /> : null}
        </div>
      </Panel>
    </AdminPageShell>
  );
}

function ResourceForm({ resource, saving, onCancel, onSave }: { resource: ResourceResponse | null; saving: boolean; onCancel: () => void; onSave: (request: { id?: number; name: string; type: string; status: ResourceStatus; location?: string }) => void }) {
  const [form, setForm] = useState({ id: resource?.id, name: resource?.name ?? "", type: resource?.type ?? "AMBULANCE", status: resource?.status ?? "AVAILABLE" as ResourceStatus, location: resource?.location ?? "" });
  return <form className="grid gap-3 md:grid-cols-5" onSubmit={(event) => { event.preventDefault(); onSave(form); if (!resource) setForm({ id: undefined, name: "", type: "AMBULANCE", status: "AVAILABLE", location: "" }); }}><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Resource name" className="rounded-lg border border-slate-300 px-3 py-3 md:col-span-2" /><input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Type" className="rounded-lg border border-slate-300 px-3 py-3" /><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ResourceStatus })} className="rounded-lg border border-slate-300 px-3 py-3"><option>AVAILABLE</option><option>ASSIGNED</option><option>MAINTENANCE</option><option>OUT_OF_SERVICE</option></select><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="rounded-lg border border-slate-300 px-3 py-3" /><div className="flex gap-2 md:col-span-5"><AdminButton type="submit" disabled={saving}><Plus className="h-4 w-4" />{resource ? "Save resource" : "Add resource"}</AdminButton>{resource ? <AdminButton variant="secondary" onClick={onCancel}>Cancel edit</AdminButton> : null}</div></form>;
}
