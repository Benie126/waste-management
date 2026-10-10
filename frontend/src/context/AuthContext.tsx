import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { authApi, TOKEN_KEY } from '../api/client';
import { AuthResponse, Role, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (body: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: Role;
  }) => Promise<User>;
  loginWithGoogle: (idToken: string, role?: Role) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const persist = useCallback((data: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.me();
      setUser(res.data.data as User);
    } catch {
      // Token invalid/expired: clear the session.
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password });
      const data = res.data.data as AuthResponse;
      persist(data);
      return data.user;
    },
    [persist]
  );

  const register = useCallback(
    async (body: { name: string; email: string; password: string; phone?: string; role: Role }) => {
      const res = await authApi.register(body);
      const data = res.data.data as AuthResponse;
      persist(data);
      return data.user;
    },
    [persist]
  );

  const loginWithGoogle = useCallback(
    async (idToken: string, role?: Role) => {
      const res = await authApi.google({ idToken, role });
      const data = res.data.data as AuthResponse;
      persist(data);
      return data.user;
    },
    [persist]
  );

  const logout = useCallback(() => {
    void authApi.logout().catch(() => undefined);
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
      updateUser: setUser,
    }),
    [user, token, loading, login, register, loginWithGoogle, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
