import { apiMultipartRequest, apiRequest } from "./client";
import type { AdminUserRequest, AnalyticsResponse, AuditLogResponse, IncidentResponse, Role, UserResponse } from "@/types/api";

function userPayload(request: AdminUserRequest) {
  const { certificateFile, ...payload } = request;
  return payload;
}

function userFormData(request: AdminUserRequest) {
  const body = new FormData();
  body.append("fullName", request.fullName);
  body.append("email", request.email);
  if (request.password) body.append("password", request.password);
  body.append("role", request.role);
  if (request.phone) body.append("phone", request.phone);
  body.append("enabled", String(request.enabled ?? true));
  body.append("accountLocked", String(request.accountLocked ?? false));
  if (request.organization) body.append("organization", request.organization);
  request.resourceIds?.forEach((id) => body.append("resourceIds", String(id)));
  if (request.certificateFile) body.append("certificate", request.certificateFile);
  return body;
}

export const adminApi = {
  users: () => apiRequest<UserResponse[]>("/admin/users"),
  createUser: (request: AdminUserRequest) => request.certificateFile
    ? apiMultipartRequest<UserResponse>("/admin/users", userFormData(request), { method: "POST" })
    : apiRequest<UserResponse>("/admin/users", { method: "POST", body: JSON.stringify(userPayload(request)) }),
  updateUser: (id: number, request: AdminUserRequest) => request.certificateFile
    ? apiMultipartRequest<UserResponse>(`/admin/users/${id}`, userFormData(request), { method: "PUT" })
    : apiRequest<UserResponse>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(userPayload(request)) }),
  updateUserStatus: (id: number, request: { enabled?: boolean; accountLocked?: boolean; role?: Role }) =>
    apiRequest<UserResponse>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify(request) }),
  auditLogs: () => apiRequest<AuditLogResponse[]>("/admin/audit-logs"),
  incidents: () => apiRequest<IncidentResponse[]>("/admin/incidents"),
  analytics: () => apiRequest<AnalyticsResponse>("/admin/analytics"),
};
