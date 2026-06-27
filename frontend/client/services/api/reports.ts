import { apiRequest } from "./client";
import type { AnalyticsResponse } from "@/types/api";

export const reportsApi = {
  analytics: () => apiRequest<AnalyticsResponse>("/reports/analytics"),
};
