import type { AuthResponse } from "@/types/api";

export function storeAuth(auth: AuthResponse) {
  sessionStorage.setItem("authToken", auth.token);
  sessionStorage.setItem("userRole", auth.role.toLowerCase());
  sessionStorage.setItem("userEmail", auth.email);
  sessionStorage.setItem("userName", auth.fullName);
  sessionStorage.setItem("userId", String(auth.userId));
}

export function clearAuth() {
  sessionStorage.clear();
}
