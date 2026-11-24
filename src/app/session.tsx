import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { auth } from "../data/firebase";

// Architecture §7.1: URL tujuan disimpan di sessionStorage, bukan query string.
export const REDIRECT_KEY = "pm.redirectAfterLogin";

// undefined = menunggu onAuthStateChanged pertama (§7.5), null = tanpa sesi.
const SessionContext = createContext<User | null | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return <SessionContext value={user}>{children}</SessionContext>;
}

export const useSession = () => use(SessionContext);

export function RequireAuth() {
  const user = useSession();
  const { pathname, search, hash } = useLocation();
  if (user === undefined) return null;
  if (!user) {
    sessionStorage.setItem(REDIRECT_KEY, pathname + search + hash);
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
