import { AlertTriangle, CheckCircle2, FileUp, Loader2, MapPin, Send, Trash2, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentsApi } from "@/services/api/incidents";
import { locationsApi } from "@/services/api/locations";
import { ApiError } from "@/services/api/client";
import type { AttachmentRequest, AttachmentResponse, IncidentResponse, IncidentType } from "@/types/api";

const offlineKey = "safecommunityai.offlineReports";
const incidentTypes: IncidentType[] = ["MEDICAL", "FIRE", "ACCIDENT", "CRIME", "NATURAL_DISASTER", "OTHER"];
const maxFiles = 5;
const maxFileSize = 25 * 1024 * 1024;

type ReportForm = {
  type: IncidentType;
  severity: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  manualLocation: string;
  description: string;
  witnessName: string;
  witnessPhone: string;
  anonymousReport: boolean;
  notifyEmergencyContacts: boolean;
  attachments: AttachmentRequest[];
};

const initialForm: ReportForm = {
  type: "MEDICAL",
  severity: "",
  manualLocation: "",
  description: "",
  witnessName: "",
  witnessPhone: "",
  anonymousReport: false,
  notifyEmergencyContacts: true,
  attachments: [],
};

export default function ReportIncident() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ReportForm>(initialForm);
  const [locating, setLocating] = useState(false);
  const [confirmation, setConfirmation] = useState<IncidentResponse | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [offlineCount, setOfflineCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryingOffline, setRetryingOffline] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setOfflineCount(readOfflineReports().length);
    captureGps(false);
  }, []);

  const validationErrors = useMemo(() => validateReport(form, selectedFiles), [form, selectedFiles]);
  const canSubmit = Object.keys(validationErrors).length === 0;
  const create = useMutation({
    mutationFn: async () => {
      const nextErrors = validateReport(form, selectedFiles);
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        throw new Error("Please fix the highlighted fields before submitting.");
      }
      const incident = await incidentsApi.create({ ...form, attachments: [] });
      let uploaded: AttachmentResponse[] = [];
      if (selectedFiles.length > 0) {
        uploaded = await incidentsApi.uploadAttachments(incident.id, selectedFiles);
      }
      return { ...incident, attachments: uploaded.length > 0 ? uploaded : incident.attachments };
    },
    onSuccess: (incident) => {
      setConfirmation(incident);
      setForm(initialForm);
      setSelectedFiles([]);
      setFieldErrors({});
      setError(null);
      setNotice(null);
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      if (err instanceof Error && err.message.includes("highlighted fields")) {
        setError(err.message);
        return;
      }
      saveOfflineReport(form);
      setOfflineCount(readOfflineReports().length);
      setError("Could not reach the server. This report was saved offline without evidence files and can be retried.");
    },
  });

  async function captureGps(showErrors = true) {
    if (!navigator.geolocation) {
      if (showErrors) setError("This browser does not support GPS.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy };
        setForm((current) => ({ ...current, ...next }));
        await locationsApi.updateMe({ ...next, consentProvided: true }).catch(() => undefined);
        setLocating(false);
      },
      () => {
        if (showErrors) setError("Location access was not granted. You can still enter the location manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function retryOffline() {
    const reports = readOfflineReports();
    const remaining: ReportForm[] = [];
    setRetryingOffline(true);
    setError(null);
    setNotice(null);
    for (const report of reports) {
      try {
        await incidentsApi.create(report);
      } catch {
        remaining.push(report);
      }
    }
    localStorage.setItem(offlineKey, JSON.stringify(remaining));
    setOfflineCount(remaining.length);
    setRetryingOffline(false);
    setNotice(remaining.length === 0 ? "Offline reports were submitted successfully." : `${reports.length - remaining.length} report(s) submitted. ${remaining.length} still need retry.`);
    queryClient.invalidateQueries({ queryKey: ["incidents"] });
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    const picked = Array.from(files).slice(0, maxFiles);
    const invalid = picked.find((file) => !isAllowedFile(file) || file.size > maxFileSize);
    if (invalid) {
      setFieldErrors((current) => ({ ...current, attachments: "Only image/video files up to 25 MB each are supported." }));
      return;
    }
    setSelectedFiles(picked);
    const attachments = picked.map((file) => ({ fileName: file.name, contentType: file.type, url: "" }));
    setForm((current) => ({ ...current, attachments }));
    setFieldErrors((current) => {
      const { attachments: _attachments, ...rest } = current;
      return rest;
    });
  }

  function removeFile(fileName: string) {
    const next = selectedFiles.filter((file) => file.name !== fileName);
    setSelectedFiles(next);
    setForm((current) => ({ ...current, attachments: next.map((file) => ({ fileName: file.name, contentType: file.type, url: "" })) }));
  }

  function submitReport(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validateReport(form, selectedFiles);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) create.mutate();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 lg:p-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-red-600">Emergency reporting</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 lg:text-4xl">Report an Incident</h1>
        <p className="mt-2 text-slate-600">Use this for reports that need attention but are not a one-touch SOS alert.</p>
      </div>

      {confirmation ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="mb-2 h-5 w-5" /><p className="font-bold">Report sent: {confirmation.referenceNumber}</p><p className="text-sm">{confirmation.attachments.length} evidence file{confirmation.attachments.length === 1 ? "" : "s"} stored. You can track the response from Incident History.</p><Link to="/dashboard/citizen/incidents" className="mt-3 inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800">Track this report</Link></div> : null}
      {error ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{error}</div> : null}
      {notice ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">{notice}</div> : null}
      {offlineCount > 0 ? <button onClick={retryOffline} disabled={retryingOffline} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-60">{retryingOffline ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />} Retry {offlineCount} offline report{offlineCount === 1 ? "" : "s"}</button> : null}

      <form onSubmit={submitReport} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Incident type" value={form.type} onChange={(value) => setForm({ ...form, type: value as IncidentType })} options={incidentTypes} />
          <Select label="Severity" value={form.severity} onChange={(value) => setForm({ ...form, severity: value })} options={["", "LOW", "MEDIUM", "HIGH", "CRITICAL"]} />
        </div>
        <Field label="Manual location" value={form.manualLocation} onChange={(value) => setForm({ ...form, manualLocation: value })} placeholder="Street, landmark, district..." required={false} error={fieldErrors.location} />
        <label className="block text-sm font-semibold text-slate-900">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`mt-2 min-h-32 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${fieldErrors.description ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-red-500 focus:ring-red-100"}`} placeholder="What happened? Who needs help? What should responders know?" maxLength={2000} /></label>
        {fieldErrors.description ? <p className="-mt-3 text-sm font-semibold text-red-600">{fieldErrors.description}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Witness name" value={form.witnessName} onChange={(value) => setForm({ ...form, witnessName: value })} placeholder="Optional" required={false} error={fieldErrors.witnessName} />
          <Field label="Witness phone" value={form.witnessPhone} onChange={(value) => setForm({ ...form, witnessPhone: value })} placeholder="Optional" required={false} error={fieldErrors.witnessPhone} />
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-semibold text-slate-950">GPS location</p><p className="text-sm text-slate-500">{form.latitude && form.longitude ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)} (${Math.round(form.accuracyMeters ?? 0)}m accuracy)` : "No GPS captured yet"}</p></div>
            <button type="button" onClick={() => captureGps(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">{locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} Capture GPS</button>
          </div>
        </div>
        <label className={`block rounded-lg border border-dashed p-4 text-sm font-semibold text-slate-900 ${fieldErrors.attachments ? "border-red-300 bg-red-50" : "border-slate-300"}`}><span className="mb-2 flex items-center gap-2"><FileUp className="h-4 w-4" /> Photo/video evidence</span><input type="file" multiple accept="image/*,video/*" onChange={(event) => onFiles(event.target.files)} /><span className="mt-2 block text-xs text-slate-500">Up to 5 image or video files, 25 MB each.</span>{fieldErrors.attachments ? <span className="mt-2 block text-xs text-red-700">{fieldErrors.attachments}</span> : null}</label>
        {selectedFiles.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {selectedFiles.map((file) => (
              <div key={file.name} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">{file.type || "Evidence file"} - {formatBytes(file.size)}</p>
                </div>
                <button type="button" onClick={() => removeFile(file.name)} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600" aria-label={`Remove ${file.name}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle label="Report anonymously" value={form.anonymousReport} onChange={(value) => setForm({ ...form, anonymousReport: value })} />
          <Toggle label="Notify emergency contacts" value={form.notifyEmergencyContacts} onChange={(value) => setForm({ ...form, notifyEmergencyContacts: value })} />
        </div>
        <button disabled={create.isPending} title={canSubmit ? "Submit report" : "Please complete the required report details"} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60">{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit report</button>
      </form>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><AlertTriangle className="mb-2 h-5 w-5" />For life-threatening emergencies, use the SOS button on your dashboard.</div>
    </div>
  );
}

function readOfflineReports(): ReportForm[] {
  try { return JSON.parse(localStorage.getItem(offlineKey) || "[]"); } catch { return []; }
}
function saveOfflineReport(report: ReportForm) {
  localStorage.setItem(offlineKey, JSON.stringify([...readOfflineReports(), report]));
}
function Field({ label, value, onChange, placeholder, required = true, error }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; error?: string }) {
  return <label className="block text-sm font-semibold text-slate-900">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`mt-2 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-red-500 focus:ring-red-100"}`} required={required} />{error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}</label>;
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block text-sm font-semibold text-slate-900">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2">{options.map((option) => <option key={option || "blank"} value={option}>{option ? option.replace(/_/g, " ") : "Select severity"}</option>)}</select></label>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!value)} className={`rounded-lg border p-4 text-left font-semibold ${value ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700"}`}>{label}<span className="mt-1 block text-xs">{value ? "Enabled" : "Disabled"}</span></button>;
}

function validateReport(form: ReportForm, files: File[]) {
  const errors: Record<string, string> = {};
  if (form.description.trim().length < 12) errors.description = "Describe the incident in at least 12 characters.";
  if (!form.manualLocation.trim() && !(form.latitude && form.longitude)) errors.location = "Capture GPS or enter the location manually.";
  if (form.witnessPhone.trim() && !/^[+0-9()\-\s]{7,24}$/.test(form.witnessPhone.trim())) errors.witnessPhone = "Enter a valid phone number.";
  if (form.witnessPhone.trim() && !form.witnessName.trim()) errors.witnessName = "Add the witness name or remove the phone number.";
  if (files.length > maxFiles || files.some((file) => !isAllowedFile(file) || file.size > maxFileSize)) errors.attachments = "Only image/video files up to 25 MB each are supported.";
  return errors;
}

function isAllowedFile(file: File) {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
