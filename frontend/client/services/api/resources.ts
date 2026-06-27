import { apiRequest } from "./client";
import type { HospitalResponse, ResourceResponse, ResourceStatus } from "@/types/api";

export const resourcesApi = {
  list: () => apiRequest<ResourceResponse[]>("/resources"),
  create: (request: { name: string; type: string; status: ResourceStatus; location?: string }) =>
    apiRequest<ResourceResponse>("/resources", { method: "POST", body: JSON.stringify(request) }),
  update: (id: number, request: { name: string; type: string; status: ResourceStatus; location?: string }) =>
    apiRequest<ResourceResponse>(`/resources/${id}`, { method: "PUT", body: JSON.stringify(request) }),
  delete: (id: number) => apiRequest<void>(`/resources/${id}`, { method: "DELETE" }),
};

export const hospitalsApi = {
  list: (query = "") => apiRequest<HospitalResponse[]>(`/hospitals${query ? `?q=${encodeURIComponent(query)}` : ""}`),
  create: (request: Omit<HospitalResponse, "id">) => apiRequest<HospitalResponse>("/hospitals", { method: "POST", body: JSON.stringify(request) }),
  update: (id: number, request: Omit<HospitalResponse, "id">) => apiRequest<HospitalResponse>(`/hospitals/${id}`, { method: "PUT", body: JSON.stringify(request) }),
  notify: (id: number, message: string) => apiRequest<HospitalResponse>(`/hospitals/${id}/notify`, { method: "POST", body: JSON.stringify({ message }) }),
};
