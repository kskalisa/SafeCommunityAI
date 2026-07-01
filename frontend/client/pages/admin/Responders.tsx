import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Download, LifeBuoy, Radio, ShieldCheck } from "lucide-react";
import { usersApi } from "@/services/api/users";
import { AdminButton, AdminPageShell, EmptyState, LoadingState, MetricCard, Panel, SearchInput, StatusBadge } from "@/components/admin/AdminUI";
import { downloadCsv } from "@/lib/export";
import type { ResponderStatus } from "@/types/api";

const availability: Array<"ALL" | ResponderStatus> = ["ALL", "AVAILABLE", "ASSIGNED", "EN_ROUTE", "ON_SCENE", "TRANSPORTING", "COMPLETED", "OFFLINE"];

export default function AdminResponders() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | ResponderStatus>("ALL");
  const [verification, setVerification] = useState("ALL");
  const responders = useQuery({ queryKey: ["admin", "responders"], queryFn: usersApi.responderDetails });
  const rows = useMemo(() => (responders.data ?? []).filter((responder) => `${responder.fullName} ${responder.email} ${responder.organization ?? ""} ${responder.vehicleNumber ?? ""}`.toLowerCase().includes(search.toLowerCase()) && (status === "ALL" || responder.availabilityStatus === status) && (verification === "ALL" || responder.verificationStatus === verification)), [responders.data, search, status, verification]);
  const online = rows.filter((item) => item.availabilityStatus && item.availabilityStatus !== "OFFLINE").length;
  const exportRows = () => downloadCsv("admin-responders.csv", rows.map((responder) => ({ name: responder.fullName, email: responder.email, phone: responder.phone ?? "", organization: responder.organization ?? "", certification: responder.certificationLicense ?? "", vehicle: responder.vehicleNumber ?? "", verification: responder.verificationStatus ?? "PENDING", availability: responder.availabilityStatus ?? "OFFLINE", account: responder.enabled ? "Active" : "Disabled" })));
  return (
    <AdminPageShell title="Responder Management" description="Track responder readiness, verification, assignments, and field availability." actions={<AdminButton variant="secondary" onClick={exportRows}><Download className="h-4 w-4" />Export responders</AdminButton>}>
      {responders.isLoading ? <LoadingState label="Loading responders..." /> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Responders" value={rows.length} helper="Filtered response staff" icon={<LifeBuoy className="h-5 w-5" />} />
        <MetricCard label="Online" value={online} helper="Available or assigned" icon={<Radio className="h-5 w-5" />} tone="emerald" />
        <MetricCard label="Pending verification" value={rows.filter((item) => item.verificationStatus === "PENDING").length} helper="Credentials to review" icon={<BadgeCheck className="h-5 w-5" />} tone="amber" />
        <MetricCard label="Disabled" value={rows.filter((item) => !item.enabled).length} helper="Accounts not active" icon={<ShieldCheck className="h-5 w-5" />} tone="red" />
      </div>
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_13rem_13rem]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search responders..." />
        <select value={status} onChange={(event) => setStatus(event.target.value as "ALL" | ResponderStatus)} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold">{availability.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={verification} onChange={(event) => setVerification(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold"><option value="ALL">All verification</option><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option></select>
      </div>
      <Panel title="Responder Directory" description={`${rows.length} matching responders`}>
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((responder) => (
            <div key={responder.id} className="rounded-lg border border-slate-200 p-4 transition hover:border-red-200">
              <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-950">{responder.fullName}</p><p className="text-sm text-slate-500">{responder.email}</p></div><StatusBadge tone={responder.availabilityStatus === "AVAILABLE" ? "green" : responder.availabilityStatus === "OFFLINE" ? "slate" : "amber"}>{responder.availabilityStatus ?? "OFFLINE"}</StatusBadge></div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><p>Organization: <b>{responder.organization || "Not set"}</b></p><p>Vehicle: <b>{responder.vehicleNumber || "Not set"}</b></p><p>Certification: <b>{responder.certificationLicense || "Not set"}</b></p><p>Account: <b>{responder.enabled ? "Active" : "Disabled"}</b></p></div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600"><ShieldCheck className="h-4 w-4" />Verification <StatusBadge tone={responder.verificationStatus === "VERIFIED" ? "green" : responder.verificationStatus === "REJECTED" ? "red" : "amber"}>{responder.verificationStatus ?? "PENDING"}</StatusBadge></div>
            </div>
          ))}
          {rows.length === 0 ? <EmptyState title="No responders found" text="Responder records will appear here once accounts are created." /> : null}
        </div>
      </Panel>
    </AdminPageShell>
  );
}
