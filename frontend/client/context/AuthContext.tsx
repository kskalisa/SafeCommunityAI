import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import type { AuthResponse } from "@/types/api";
import { clearAuth, storeAuth } from "@/utils/authStorage";

type AuthContextValue = {
  token: string | null;
  role: string | null;
  email: string | null;
  setAuth: (auth: AuthResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(sessionStorage.getItem("authToken"));
  const [role, setRole] = useState(sessionStorage.getItem("userRole"));
  const [email, setEmail] = useState(sessionStorage.getItem("userEmail"));

  const value = useMemo<AuthContextValue>(() => ({
    token,
    role,
    email,
    setAuth(auth) {
      storeAuth(auth);
      setToken(auth.token);
      setRole(auth.role.toLowerCase());
      setEmail(auth.email);
    },
    logout() {
      clearAuth();
      setToken(null);
      setRole(null);
      setEmail(null);
    },
  }), [token, role, email]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
