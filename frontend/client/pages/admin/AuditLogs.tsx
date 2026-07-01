import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Shield } from "lucide-react";
import { adminApi } from "@/services/api/admin";
import { AdminButton, AdminPageShell, EmptyState, LoadingState, Panel, SearchInput, StatusBadge } from "@/components/admin/AdminUI";
import { downloadCsv } from "@/lib/export";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("ALL");
  const logs = useQuery({ queryKey: ["admin", "audit-logs"], queryFn: adminApi.auditLogs });
  const rows = useMemo(() => (logs.data ?? []).filter((log) => {
    const text = `${log.action} ${log.actorEmail} ${log.entityType ?? ""} ${log.detail ?? ""}`.toLowerCase();
    const level = levelFor(log.action, log.detail);
    return text.includes(search.toLowerCase()) && (severity === "ALL" || level === severity);
  }), [logs.data, search, severity]);
  return (
    <AdminPageShell title="Security & Audit Logs" description="Inspect authentication, user administration, incident changes, and high-risk system events." actions={<AdminButton variant="secondary" onClick={() => downloadCsv("audit-logs.csv", rows)}><Download className="h-4 w-4" />Export</AdminButton>}>
      {logs.isLoading ? <LoadingState label="Loading audit logs..." /> : null}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_14rem]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search actor, action, entity, details..." />
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold"><option value="ALL">All severities</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select>
      </div>
      <Panel title="Audit Trail" description={`${rows.length} matching events`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-slate-200 bg-slate-50"><tr><Th>Event</Th><Th>Severity</Th><Th>Actor</Th><Th>Entity</Th><Th>Timestamp</Th><Th>Details</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">{rows.map((log) => { const level = levelFor(log.action, log.detail); return <tr key={log.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-950"><span className="flex items-center gap-2"><Shield className="h-4 w-4 text-slate-500" />{label(log.action)}</span></td><td className="px-4 py-3"><StatusBadge tone={level === "HIGH" ? "red" : level === "MEDIUM" ? "amber" : "green"}>{level}</StatusBadge></td><td className="px-4 py-3 text-sm text-slate-600">{log.actorEmail}</td><td className="px-4 py-3 text-sm text-slate-600">{log.entityType || "System"}{log.entityId ? ` #${log.entityId}` : ""}</td><td className="px-4 py-3 text-sm text-slate-600">{new Date(log.createdAt).toLocaleString()}</td><td className="px-4 py-3 text-sm text-slate-600">{log.detail || "No details"}</td></tr>; })}</tbody>
          </table>
        </div>
        {rows.length === 0 ? <EmptyState title="No audit events found" text="Adjust filters to inspect more system activity." /> : null}
      </Panel>
    </AdminPageShell>
  );
}
function levelFor(action: string, detail?: string) { return /FAIL|LOCK|DENIED|INVALID|ERROR/i.test(`${action} ${detail ?? ""}`) ? "HIGH" : /UPDATE|DELETE|STATUS/i.test(action) ? "MEDIUM" : "LOW"; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{children}</th>; }
