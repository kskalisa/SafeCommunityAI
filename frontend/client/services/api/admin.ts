import { apiRequest } from "./client";
import type { AnalyticsResponse, AuditLogResponse, UserResponse } from "@/types/api";

export const adminApi = {
  users: () => apiRequest<UserResponse[]>("/admin/users"),
  auditLogs: () => apiRequest<AuditLogResponse[]>("/admin/audit-logs"),
  analytics: () => apiRequest<AnalyticsResponse>("/admin/analytics"),
};
