import { apiRequest } from "./client";
import type { AdminUserRequest, AnalyticsResponse, AuditLogResponse, IncidentResponse, Role, UserResponse } from "@/types/api";

export const adminApi = {
  users: () => apiRequest<UserResponse[]>("/admin/users"),
  createUser: (request: AdminUserRequest) => apiRequest<UserResponse>("/admin/users", { method: "POST", body: JSON.stringify(request) }),
  updateUser: (id: number, request: AdminUserRequest) => apiRequest<UserResponse>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(request) }),
  updateUserStatus: (id: number, request: { enabled?: boolean; accountLocked?: boolean; role?: Role }) =>
    apiRequest<UserResponse>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify(request) }),
  auditLogs: () => apiRequest<AuditLogResponse[]>("/admin/audit-logs"),
  incidents: () => apiRequest<IncidentResponse[]>("/admin/incidents"),
  analytics: () => apiRequest<AnalyticsResponse>("/admin/analytics"),
};
