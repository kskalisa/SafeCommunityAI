import { apiRequest } from "./client";
import type { NotificationRequest, NotificationResponse } from "@/types/api";

export const notificationsApi = {
  list: () => apiRequest<NotificationResponse[]>("/notifications"),
  send: (request: NotificationRequest) => apiRequest<void>("/notifications", { method: "POST", body: JSON.stringify(request) }),
};
