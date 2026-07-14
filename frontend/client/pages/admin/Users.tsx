import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Edit3, FileText, Lock, Plus, RotateCcw, ShieldCheck, UserX } from "lucide-react";
import { adminApi } from "@/services/api/admin";
import { resourcesApi } from "@/services/api/resources";
import { usersApi } from "@/services/api/users";
import { toast } from "@/hooks/use-toast";
import { AdminButton, AdminModal, AdminPageShell, EmptyState, LoadingState, Notice, SearchInput, StatusBadge } from "@/components/admin/AdminUI";
import type { AdminUserRequest, ResourceResponse, Role, UserResponse } from "@/types/api";

const roles: Role[] = ["CITIZEN", "RESPONDER", "DISPATCHER", "ADMIN"];
const pageSize = 8;

export default function Users() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const users = useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.users });
  const resources = useQuery({ queryKey: ["resources"], queryFn: resourcesApi.list });
  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: AdminUserRequest }) => (id ? adminApi.updateUser(id, payload) : adminApi.createUser(payload)),
    onSuccess: (_user, variables) => {
      const savedAction = variables.id ? "updated" : "added";
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["responders", "details"] });
      setFormOpen(false);
      setEditing(null);
      setNotice(`User ${savedAction} successfully.`);
      toast({ title: `User ${savedAction}`, description: `${variables.payload.fullName} has been ${savedAction} successfully.` });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { enabled?: boolean; accountLocked?: boolean; role?: Role } }) => adminApi.updateUserStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setNotice("User status updated.");
    },
  });

  const filtered = useMemo(() => {
    return (users.data ?? []).filter((user) => {
      const haystack = `${user.fullName} ${user.email} ${user.role} ${user.organization ?? ""} ${(user.resources ?? []).map((resource) => resource.name).join(" ")}`.toLowerCase();
      const status = user.accountLocked ? "LOCKED" : user.enabled ? "ACTIVE" : "DISABLED";
      return haystack.includes(search.toLowerCase()) && (roleFilter === "ALL" || user.role === roleFilter) && (statusFilter === "ALL" || status === statusFilter);
    });
  }, [roleFilter, search, statusFilter, users.data]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const confirmStatus = (message: string, id: number, payload: { enabled?: boolean; accountLocked?: boolean; role?: Role }) => { if (window.confirm(message)) statusMutation.mutate({ id, payload }); };

  return (
    <AdminPageShell title="User Management" description="Create users, assign roles, control access, review account activity, and respond to security issues." actions={<AdminButton onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" />Add user</AdminButton>}>
      {notice ? <Notice type="success">{notice}</Notice> : null}
      {mutation.error ? <Notice type="error">{mutation.error instanceof Error ? mutation.error.message : "Could not save user."}</Notice> : null}
      {users.isLoading ? <LoadingState label="Loading users..." /> : null}

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem]">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search name, email, role, or resource..." />
          <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as "ALL" | Role); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold"><option value="ALL">All roles</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option><option value="LOCKED">Locked</option></select>
        </div>
      </div>

      <AdminModal open={formOpen} title={editing ? "Edit user" : "Add user"} description="Manage profile details, role, and access controls." onClose={() => setFormOpen(false)}>
        <UserForm key={editing?.id ?? "new"} user={editing} resources={resources.data ?? []} saving={mutation.isPending} onCancel={() => setFormOpen(false)} onSave={(payload) => mutation.mutate({ id: editing?.id, payload })} />
      </AdminModal>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-slate-200 bg-slate-50"><tr><Th>User</Th><Th>Role</Th><Th>Status</Th><Th>Responder Resources</Th><Th>Last Login</Th><Th>Activity</Th><Th>Actions</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((user) => (
                <tr key={user.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4"><p className="font-bold text-slate-950">{user.fullName}</p><p className="text-sm text-slate-500">{user.email}</p><p className="text-xs text-slate-400">{user.phone || "No phone"}</p></td>
                  <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                  <td className="px-5 py-4"><StatusBadge tone={user.accountLocked ? "red" : user.enabled ? "green" : "amber"}>{user.accountLocked ? "Locked" : user.enabled ? "Active" : "Disabled"}</StatusBadge></td>
                  <td className="px-5 py-4 text-sm text-slate-600">{user.role === "RESPONDER" ? (user.resources?.length ? user.resources.map((resource) => resource.name).join(", ") : "No resources assigned") : "-"}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{user.failedLoginAttempts} failed attempts<br />Joined {new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-2"><IconButton label="Edit" onClick={() => { setEditing(user); setFormOpen(true); }} icon={<Edit3 className="h-4 w-4" />} /><IconButton label={user.accountLocked ? "Unlock" : "Lock"} onClick={() => confirmStatus(user.accountLocked ? "Unlock this account?" : "Lock this account?", user.id, { accountLocked: !user.accountLocked })} icon={user.accountLocked ? <RotateCcw className="h-4 w-4" /> : <Lock className="h-4 w-4" />} /><IconButton label={user.enabled ? "Deactivate" : "Activate"} onClick={() => confirmStatus(user.enabled ? "Deactivate this account?" : "Activate this account?", user.id, { enabled: !user.enabled })} icon={user.enabled ? <UserX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? <div className="p-6"><EmptyState title="No users found" text="Adjust search or filters to find account records." /></div> : null}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm text-slate-600"><span>Page {page} of {pageCount} - {filtered.length} users</span><div className="flex gap-2"><AdminButton variant="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</AdminButton><AdminButton variant="secondary" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</AdminButton></div></div>
      </div>
    </AdminPageShell>
  );
}

function UserForm({ user, resources, saving, onCancel, onSave }: { user: UserResponse | null; resources: ResourceResponse[]; saving: boolean; onCancel: () => void; onSave: (payload: AdminUserRequest) => void }) {
  const [form, setForm] = useState<AdminUserRequest>({ fullName: user?.fullName ?? "", email: user?.email ?? "", password: "", role: user?.role ?? "CITIZEN", phone: user?.phone ?? "", enabled: user?.enabled ?? true, accountLocked: user?.accountLocked ?? false, organization: user?.organization ?? "", resourceIds: user?.resources?.map((resource) => resource.id) ?? [] });
  const update = (key: keyof AdminUserRequest, value: string | boolean | number[] | File | undefined) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); onSave({ ...form, password: form.password || undefined }); };
  return (
    <form onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full name" value={form.fullName} onChange={(value) => update("fullName", value)} required />
        <Field label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} required />
        <Field label={user ? "Password (optional)" : "Password"} type="password" value={form.password ?? ""} onChange={(value) => update("password", value)} required={!user} />
        <Field label="Phone" value={form.phone ?? ""} onChange={(value) => update("phone", value)} />
        <label className="text-sm font-bold text-slate-900">Role<select value={form.role} onChange={(event) => update("role", event.target.value as Role)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3"><option value="CITIZEN">Citizen</option><option value="RESPONDER">Responder</option><option value="DISPATCHER">Dispatcher</option><option value="ADMIN">Administrator</option></select></label>
        <div className="grid grid-cols-2 gap-3"><Toggle label="Active" checked={Boolean(form.enabled)} onChange={(value) => update("enabled", value)} /><Toggle label="Locked" checked={Boolean(form.accountLocked)} onChange={(value) => update("accountLocked", value)} /></div>
      </div>
      {form.role === "RESPONDER" ? <div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Organization" value={form.organization ?? ""} onChange={(value) => update("organization", value)} /><ResourceSelect resources={resources} value={form.resourceIds ?? []} onChange={(value) => update("resourceIds", value)} /><CertificateField user={user} file={form.certificateFile} onChange={(file) => update("certificateFile", file)} /></div> : null}
      <div className="mt-5 flex justify-end gap-2"><AdminButton variant="secondary" onClick={onCancel}>Cancel</AdminButton><AdminButton type="submit" disabled={saving}>{saving ? "Saving..." : "Save user"}</AdminButton></div>
    </form>
  );
}

function ResourceSelect({ resources, value, onChange }: { resources: ResourceResponse[]; value: number[]; onChange: (value: number[]) => void }) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => resources.filter((resource) => value.includes(resource.id)), [resources, value]);
  const filtered = useMemo(() => {
    const text = query.toLowerCase();
    return resources.filter((resource) => `${resource.name} ${resource.type} ${resource.status} ${resource.location ?? ""}`.toLowerCase().includes(text));
  }, [query, resources]);
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-slate-900" htmlFor="responder-resource-search">Responder resources</label>
        {value.length ? <button type="button" onClick={() => onChange([])} className="text-xs font-bold text-red-700 hover:text-red-800">Clear all</button> : null}
      </div>
      <input id="responder-resource-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resources by name, type, status, or district" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" />
      {selected.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((resource) => (
            <button key={resource.id} type="button" onClick={() => toggle(resource.id)} className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100">
              {resource.name} x
            </button>
          ))}
        </div>
      ) : <p className="mt-2 text-xs text-slate-500">No resources selected yet.</p>}
      <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {filtered.map((resource) => {
          const checked = value.includes(resource.id);
          return (
            <label key={resource.id} className={`flex cursor-pointer items-start gap-3 border-b border-slate-100 p-3 last:border-b-0 ${checked ? "bg-red-50" : "hover:bg-slate-50"}`}>
              <input type="checkbox" checked={checked} onChange={() => toggle(resource.id)} className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-900">{resource.name}</span>
                <span className="block text-xs text-slate-500">{resource.type.replace(/_/g, " ")} - {resource.status.replace(/_/g, " ")} - {resource.location || "No district"}</span>
              </span>
            </label>
          );
        })}
        {filtered.length === 0 ? <p className="p-4 text-sm text-slate-500">No resources match your search.</p> : null}
      </div>
    </div>
  );
}

function CertificateField({ user, file, onChange }: { user: UserResponse | null; file?: File; onChange: (file?: File) => void }) {
  const download = async () => {
    if (!user) return;
    const blob = await usersApi.downloadResponderCertificate(user.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = user.certificateFileName || `certificate-${user.id}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  return <div className="md:col-span-2"><label className="text-sm font-bold text-slate-900">Certificate Upload<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => onChange(event.target.files?.[0])} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" /></label>{file ? <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><FileText className="h-4 w-4" />{file.name}</p> : null}{user?.certificateUrl ? <button type="button" onClick={download} className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-red-700 hover:text-red-800"><Download className="h-4 w-4" />{user.certificateFileName}</button> : null}</div>;
}

function RoleBadge({ role }: { role: Role }) { return <StatusBadge tone={role === "ADMIN" ? "red" : role === "DISPATCHER" ? "purple" : role === "RESPONDER" ? "amber" : "blue"}>{role}</StatusBadge>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{children}</th>; }
function IconButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) { return <button onClick={onClick} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">{icon}{label}</button>; }
function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="text-sm font-bold text-slate-900">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} minLength={type === "password" && required ? 6 : undefined} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3 text-sm font-bold text-slate-900"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" /></label>; }
