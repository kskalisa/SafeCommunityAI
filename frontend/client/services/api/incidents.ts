import { apiBlobRequest, apiMultipartRequest, apiRequest } from "./client";
import type { AttachmentRequest, AttachmentResponse, IncidentResponse, IncidentStatus, IncidentType } from "@/types/api";

export const incidentsApi = {
  mine: () => apiRequest<IncidentResponse[]>("/incidents/mine"),
  queue: () => apiRequest<IncidentResponse[]>("/incidents/queue"),
  create: (request: { type: IncidentType; severity?: string; latitude?: number; longitude?: number; manualLocation?: string; description?: string; anonymousReport?: boolean; witnessName?: string; witnessPhone?: string; notifyEmergencyContacts?: boolean; attachments?: AttachmentRequest[] }) =>
    apiRequest<IncidentResponse>("/incidents", { method: "POST", body: JSON.stringify(request) }),
  update: (id: number, request: { type: IncidentType; severity?: string; latitude?: number; longitude?: number; manualLocation?: string; description?: string; anonymousReport?: boolean; witnessName?: string; witnessPhone?: string; notifyEmergencyContacts?: boolean; attachments?: AttachmentRequest[] }) =>
    apiRequest<IncidentResponse>(`/incidents/${id}`, { method: "PUT", body: JSON.stringify(request) }),
  delete: (id: number) => apiRequest<void>(`/incidents/${id}`, { method: "DELETE" }),
  panic: (request: { latitude: number; longitude: number; accuracyMeters?: number; consentProvided: boolean }) =>
    apiRequest<IncidentResponse>("/incidents/panic", { method: "POST", body: JSON.stringify(request) }),
  updateStatus: (id: number, request: { incidentStatus?: IncidentStatus; reason?: string }) =>
    apiRequest<IncidentResponse>(`/incidents/${id}/status`, { method: "PATCH", body: JSON.stringify(request) }),
  uploadAttachments: (incidentId: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return apiMultipartRequest<AttachmentResponse[]>(`/incidents/${incidentId}/attachments`, formData);
  },
  downloadAttachment: (attachmentId: number) => apiBlobRequest(`/incidents/attachments/${attachmentId}/download`),
};
