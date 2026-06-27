import { apiRequest } from "./client";
import type { LocationMarkerResponse } from "@/types/api";

export const locationsApi = {
  updateMe: (request: { latitude: number; longitude: number; accuracyMeters?: number; consentProvided: boolean }) =>
    apiRequest<void>("/locations/me", { method: "POST", body: JSON.stringify(request) }),
  markers: () => apiRequest<LocationMarkerResponse[]>("/locations/markers"),
  myHistory: () => apiRequest<LocationMarkerResponse[]>("/locations/history/me"),
};

