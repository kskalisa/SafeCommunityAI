import { apiRequest } from "./client";
import type { AssignmentResponse, DispatchRecommendationResponse, ResponderStatus, RouteResponse } from "@/types/api";

export const dispatchApi = {
  mine: () => apiRequest<AssignmentResponse[]>("/dispatch/assignments/mine"),
  assign: (request: { incidentId: number; responderId: number; etaMinutes?: number }) =>
    apiRequest<AssignmentResponse>("/dispatch/assignments", { method: "POST", body: JSON.stringify(request) }),
  recommendations: (incidentId: number) => apiRequest<DispatchRecommendationResponse[]>(`/dispatch/recommendations/${incidentId}`),
  route: (assignmentId: number) => apiRequest<RouteResponse>(`/dispatch/assignments/${assignmentId}/route`),
  update: (id: number, responderStatus: ResponderStatus, reason?: string) =>
    apiRequest<AssignmentResponse>(`/dispatch/assignments/${id}`, { method: "PATCH", body: JSON.stringify({ responderStatus, reason }) }),
};
