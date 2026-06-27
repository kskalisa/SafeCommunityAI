import { Search, Loader2, UserCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/services/api/admin";

export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.users });
  const filtered = useMemo(() => (users.data ?? []).filter((user) => `${user.fullName} ${user.email} ${user.role}`.toLowerCase().includes(searchTerm.toLowerCase())), [users.data, searchTerm]);

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-start gap-4"><div><h1 className="text-3xl lg:text-4xl font-bold text-slate-950 mb-2">User Management</h1><p className="text-slate-600">Live user records from the backend.</p></div>{users.isFetching ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : null}</div>
      <div className="mb-6 relative"><Search className="absolute left-4 top-3 w-5 h-5 text-slate-400" /><input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 border-b"><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th>Joined</Th></tr></thead><tbody className="divide-y divide-slate-200">{filtered.map((user) => <tr key={user.id} className="hover:bg-slate-50 transition"><td className="px-6 py-4 text-sm font-semibold text-slate-950 flex items-center gap-2"><UserCircle className="w-4 h-4 text-slate-500" />{user.fullName}</td><td className="px-6 py-4 text-sm text-slate-600">{user.email}</td><td className="px-6 py-4"><Badge label={user.role} /></td><td className="px-6 py-4"><span className={`px-2.5 py-1 text-xs rounded-md font-bold ${user.enabled ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-800"}`}>{user.enabled ? "ACTIVE" : "DISABLED"}</span></td><td className="px-6 py-4 text-sm text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>{!users.isLoading && filtered.length === 0 ? <div className="p-8 text-center text-slate-500">No users found.</div> : null}</div>
    </div>
  );
}
function Badge({ label }: { label: string }) { const cls = label === "ADMIN" ? "bg-red-50 text-red-700" : label === "DISPATCHER" ? "bg-purple-50 text-purple-700" : label === "RESPONDER" ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"; return <span className={`px-2.5 py-1 text-xs rounded-md font-bold ${cls}`}>{label}</span>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">{children}</th>; }