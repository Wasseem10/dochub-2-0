import { createContext, useContext } from "react";

export const DEFAULT_AUTH_VALUE = Object.freeze({
  authReady: true,
  currentUser: null,
  isFirebaseConfigured: false,
  authenticate: async () => ({ ok: false, error: "Authentication is not loaded on this public page." }),
  resetPassword: async () => ({ ok: false, error: "Authentication is not loaded on this public page." }),
  deleteAccount: async () => ({ ok: false, error: "Authentication is not loaded on this public page." }),
  logout: async () => {},
});

export const AuthContext = createContext(DEFAULT_AUTH_VALUE);

export function AuthProvider({ children, value = DEFAULT_AUTH_VALUE }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
