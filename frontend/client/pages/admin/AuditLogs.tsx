import { Shield, Search, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/services/api/admin";

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const logs = useQuery({ queryKey: ["admin", "audit-logs"], queryFn: adminApi.auditLogs });
  const filtered = useMemo(() => (logs.data ?? []).filter((log) => `${log.action} ${log.actorEmail} ${log.detail}`.toLowerCase().includes(searchTerm.toLowerCase())), [logs.data, searchTerm]);

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4"><div><h1 className="text-3xl lg:text-4xl font-bold text-slate-950 mb-2">Audit Logs</h1><p className="text-slate-600">Security-relevant events written by backend services.</p></div>{logs.isFetching ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : null}</div>
      <div className="mb-6 relative"><Search className="absolute left-4 top-3 w-5 h-5 text-slate-400" /><input type="text" placeholder="Search logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 border-b"><tr><Th>Action</Th><Th>Actor</Th><Th>Entity</Th><Th>Timestamp</Th><Th>Details</Th></tr></thead><tbody className="divide-y divide-slate-200">{filtered.map((log) => <tr key={log.id} className="hover:bg-slate-50 transition"><td className="px-6 py-4 text-sm font-semibold text-slate-950 flex items-center gap-2"><Shield className="w-4 h-4 text-slate-500" />{log.action}</td><td className="px-6 py-4 text-sm text-slate-600">{log.actorEmail}</td><td className="px-6 py-4 text-sm text-slate-600">{log.entityType || "System"}{log.entityId ? ` #${log.entityId}` : ""}</td><td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td><td className="px-6 py-4 text-sm text-slate-600">{log.detail}</td></tr>)}</tbody></table></div>{!logs.isLoading && filtered.length === 0 ? <div className="p-8 text-center text-slate-500">No audit logs found.</div> : null}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) { return <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">{children}</th>; }