import { apiRequest } from "./client";
import type { AuthResponse, LoginRequest, OtpChallengeResponse, OtpVerificationRequest, RegisterRequest } from "@/types/api";

export const authApi = {
  login: (request: LoginRequest) => apiRequest<OtpChallengeResponse>("/auth/login", { method: "POST", body: JSON.stringify(request) }),
  verifyOtp: (request: OtpVerificationRequest) => apiRequest<AuthResponse>("/auth/login/verify-otp", { method: "POST", body: JSON.stringify(request) }),
  register: (request: RegisterRequest) => apiRequest<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(request) }),
};
