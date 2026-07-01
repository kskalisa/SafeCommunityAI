import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Send } from "lucide-react";
import { notificationsApi } from "@/services/api/notifications";
import { adminApi } from "@/services/api/admin";
import { AdminButton, AdminPageShell, EmptyState, LoadingState, Notice, Panel, SearchInput, StatusBadge } from "@/components/admin/AdminUI";

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", message: "", recipientId: "" });
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState("ALL");
  const [notice, setNotice] = useState("");
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.users });
  const send = useMutation({
    mutationFn: notificationsApi.send,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setForm({ title: "", message: "", recipientId: "" });
      setNotice("Notification sent.");
    },
  });
  const rows = (notifications.data ?? []).filter((item) => `${item.title} ${item.message}`.toLowerCase().includes(search.toLowerCase()) && (readFilter === "ALL" || (readFilter === "UNREAD" ? !item.read : item.read)));
  return (
    <AdminPageShell title="Notifications & Alerts" description="Broadcast operational alerts, target individual users, and review recent system notifications.">
      {notice ? <Notice type="success">{notice}</Notice> : null}
      <Panel title="Send Alert" description="Broadcast to all users or target a specific account.">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); send.mutate({ title: form.title, message: form.message, recipientId: form.recipientId ? Number(form.recipientId) : undefined }); }}>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Alert title" className="w-full rounded-lg border border-slate-300 px-4 py-3" />
          <select value={form.recipientId} onChange={(e) => setForm({ ...form, recipientId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-4 py-3">
            <option value="">Broadcast to all users</option>
            {(users.data ?? []).map((user) => <option key={user.id} value={user.id}>{user.fullName} - {user.role}</option>)}
          </select>
          <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Message" rows={4} className="w-full rounded-lg border border-slate-300 px-4 py-3" />
          <AdminButton type="submit" disabled={send.isPending}><Send className="h-4 w-4" />Send alert</AdminButton>
        </form>
      </Panel>
      {notifications.isLoading ? <LoadingState label="Loading notifications..." /> : null}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_12rem]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search notification title or message..." />
        <select value={readFilter} onChange={(e) => setReadFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold"><option value="ALL">All</option><option value="UNREAD">Unread</option><option value="READ">Read</option></select>
      </div>
      <Panel title="Recent Notifications" description={`${rows.length} matching notifications`}>
        <div className="space-y-3">
          {rows.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-4"><Bell className="mt-1 h-5 w-5 text-red-600" /><div className="flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-slate-950">{item.title}</p><StatusBadge tone={item.read ? "slate" : "blue"}>{item.broadcast ? "Broadcast" : "Direct"} / {item.read ? "Read" : "Unread"}</StatusBadge></div><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p></div></div>)}
          {rows.length === 0 ? <EmptyState title="No notifications found" text="Broadcast alerts and system updates will appear here." /> : null}
        </div>
      </Panel>
    </AdminPageShell>
  );
}
