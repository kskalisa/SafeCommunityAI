import { apiRequest } from "./client";
import type { ResponderDetailResponse, UserResponse } from "@/types/api";

export const usersApi = {
  responders: () => apiRequest<UserResponse[]>("/users/responders"),
  responderDetails: () => apiRequest<ResponderDetailResponse[]>("/users/responders/details"),
};
