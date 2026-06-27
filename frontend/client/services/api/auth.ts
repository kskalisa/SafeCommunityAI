import { apiRequest } from "./client";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@/types/api";

export const authApi = {
  login: (request: LoginRequest) => apiRequest<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(request) }),
  register: (request: RegisterRequest) => apiRequest<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(request) }),
};
