import { apiRequest } from "./client";

export const dashboardApi = {
  me: () => apiRequest<{ role: string; metrics: Record<string, unknown> }>("/dashboard/me"),
};
