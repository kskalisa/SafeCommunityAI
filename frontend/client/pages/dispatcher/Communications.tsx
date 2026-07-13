import { Loader2, Mail, Megaphone, Phone, Radio, Send, Users } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/services/api/notifications";
import { usersApi } from "@/services/api/users";

export default function Communications() {
  const queryClient = useQueryClient();
  const [recipientId, setRecipientId] = useState("broadcast");
  const [title, setTitle] = useState("Dispatcher update");
  const [message, setMessage] = useState("");
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list });
  const responders = useQuery({ queryKey: ["responders", "details"], queryFn: usersApi.responderDetails });
  const send = useMutation({
    mutationFn: () => notificationsApi.send({ title, message, recipientId: recipientId === "broadcast" ? undefined : Number(recipientId) }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const responderList = responders.data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-5 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-950 lg:text-4xl">Communications</h1>
          <p className="text-slate-600">Send real alerts to responders or the whole community and follow recent messages.</p>
        </div>
        {notifications.isFetching || responders.isFetching ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-950"><Send className="h-5 w-5" /> Send Alert</h2>
          <form onSubmit={(event) => { event.preventDefault(); if (message.trim()) send.mutate(); }} className="space-y-4">
            <label className="block text-sm font-semibold text-slate-900">Recipient
              <select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="broadcast">All users</option>
                {responderList.map((responder) => <option key={responder.id} value={responder.id}>{responder.fullName}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-900">Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" required />
            </label>
            <label className="block text-sm font-semibold text-slate-900">Message
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} placeholder="Write a clear instruction or update..." className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" required />
            </label>
            <button disabled={send.isPending || !message.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Radio className="h-4 w-4" /> Send message</button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950"><Megaphone className="h-5 w-5" /> Recent Alerts</h2>
            <p className="mt-1 text-sm text-slate-500">Messages stored in the notification center.</p>
          </div>
          <div className="max-h-[520px] divide-y overflow-y-auto">
            {(notifications.data ?? []).map((notification) => (
              <div key={notification.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-950">{notification.title}</h3>
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${notification.broadcast ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{notification.broadcast ? "Broadcast" : "Direct"}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{notification.message}</p>
                <p className="mt-3 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {!notifications.isLoading && (notifications.data?.length ?? 0) === 0 ? <div className="p-8 text-center text-slate-500">No alerts have been sent yet.</div> : null}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-950"><Users className="h-5 w-5" /> Responder Contacts</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {responderList.map((responder) => (
            <div key={responder.id} className="rounded-lg border border-slate-200 p-4">
              <p className="font-bold text-slate-950">{responder.fullName}</p>
              <p className="mt-1 text-sm text-slate-500">{responder.organization || responder.resources?.map((resource) => resource.name).join(", ") || responder.email}</p>
              <div className="mt-4 flex gap-2">
                <a href={`mailto:${responder.email}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Mail className="h-4 w-4" /> Email</a>
                <a href={responder.phone ? `tel:${responder.phone}` : undefined} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Phone className="h-4 w-4" /> Call</a>
              </div>
            </div>
          ))}
          {!responders.isLoading && responderList.length === 0 ? <p className="text-sm text-slate-500">No responder contacts are available.</p> : null}
        </div>
      </section>
    </div>
  );
}

