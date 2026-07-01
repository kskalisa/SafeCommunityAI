import { Bell, Database, Lock, Mail, Save, Settings } from "lucide-react";
import { AdminButton, AdminPageShell, Notice, Panel, StatusBadge } from "@/components/admin/AdminUI";
import { useState } from "react";

export default function AdminSettings() {
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 3000); };
  return (
    <AdminPageShell title="System Settings" description="Configure operational policies, security posture, integrations, alert thresholds, and platform defaults.">
      {saved ? <Notice type="success">Settings saved locally. Connect these controls to backend configuration storage when ready.</Notice> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="General Operations" description="Response targets and organization identity.">
          <div className="space-y-4"><Field label="Organization name" value="SafeCommunity Emergency Services" /><Field label="Default response target" value="5 minutes" /><Field label="Dispatch escalation window" value="10 minutes" /><AdminButton onClick={save}><Save className="h-4 w-4" />Save general settings</AdminButton></div>
        </Panel>
        <Panel title="Security Controls" description="Authentication and access enforcement.">
          <div className="space-y-3">{["Email OTP login", "JWT session validation", "Audit logging", "Admin route protection", "Account lock controls"].map((item) => <Toggle key={item} label={item} checked />)}<AdminButton onClick={save}><Lock className="h-4 w-4" />Save security policy</AdminButton></div>
        </Panel>
        <Panel title="Email & OTP" description="Current SMTP-backed notification status.">
          <div className="space-y-4"><div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4"><span className="flex items-center gap-2 font-bold text-emerald-800"><Mail className="h-5 w-5" />OTP email delivery</span><StatusBadge tone="green">Enabled</StatusBadge></div><Field label="SMTP host" value="smtp.gmail.com" /><Field label="OTP expiry" value="5 minutes" /><AdminButton onClick={save}><Mail className="h-4 w-4" />Save email settings</AdminButton></div>
        </Panel>
        <Panel title="Database & Reliability" description="Production readiness checks.">
          <div className="space-y-4"><Health icon={<Database className="h-5 w-5" />} label="Database" value="Connected" /><Health icon={<Bell className="h-5 w-5" />} label="Notifications" value="Operational" /><Health icon={<Settings className="h-5 w-5" />} label="API services" value="Healthy" /><AdminButton variant="secondary" onClick={save}>Run readiness check</AdminButton></div>
        </Panel>
      </div>
    </AdminPageShell>
  );
}
function Field({ label, value }: { label: string; value: string }) { return <label className="block text-sm font-bold text-slate-900">{label}<input defaultValue={value} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>; }
function Toggle({ label, checked }: { label: string; checked: boolean }) { return <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 font-semibold text-slate-800"><span>{label}</span><input type="checkbox" defaultChecked={checked} className="h-4 w-4" /></label>; }
function Health({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4"><span className="flex items-center gap-2 font-bold text-slate-800">{icon}{label}</span><StatusBadge tone="green">{value}</StatusBadge></div>; }
