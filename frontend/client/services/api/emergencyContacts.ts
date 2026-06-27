import { apiRequest } from "./client";
import type { EmergencyContactRequest, EmergencyContactResponse } from "@/types/api";

export const emergencyContactsApi = {
  list: () => apiRequest<EmergencyContactResponse[]>("/emergency-contacts"),
  create: (request: EmergencyContactRequest) => apiRequest<EmergencyContactResponse>("/emergency-contacts", { method: "POST", body: JSON.stringify(request) }),
  update: (id: number, request: EmergencyContactRequest) => apiRequest<EmergencyContactResponse>(`/emergency-contacts/${id}`, { method: "PUT", body: JSON.stringify(request) }),
  delete: (id: number) => apiRequest<void>(`/emergency-contacts/${id}`, { method: "DELETE" }),
};
