'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthMode, AuthUser } from '@/types/auth';

interface AuthResult {
  success: boolean;
  message?: string;
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  isAuthOpen: boolean;
  authMode: AuthMode;
  isHydrated: boolean;
  openAuthDialog: (mode?: AuthMode) => void;
  closeAuthDialog: () => void;
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (
    username: string,
    password: string,
    confirmPassword: string,
    turnstileToken?: string,
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          setCurrentUser(null);
          return;
        }

        const data = (await response.json()) as { user: AuthUser | null };
        setCurrentUser(data.user);
      } catch {
        setCurrentUser(null);
      } finally {
        setIsHydrated(true);
      }
    };

    void bootstrapAuth();
  }, []);

  const openAuthDialog = useCallback((mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }, []);

  const closeAuthDialog = useCallback(() => {
    setIsAuthOpen(false);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as { user?: AuthUser; error?: string };

      if (!response.ok || !data.user) {
        return { success: false, message: data.error || '登录失败' };
      }

      setCurrentUser(data.user);
      setIsAuthOpen(false);

      return { success: true };
    } catch {
      return { success: false, message: '登录失败，请稍后再试' };
    }
  }, []);

  const register = useCallback(
    async (
      username: string,
      password: string,
      confirmPassword: string,
      turnstileToken?: string,
    ): Promise<AuthResult> => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, confirmPassword, turnstileToken }),
        });

        const data = (await response.json()) as { user?: AuthUser; error?: string };

        if (!response.ok || !data.user) {
          return { success: false, message: data.error || '注册失败' };
        }

        setCurrentUser(data.user);
        setIsAuthOpen(false);

        return { success: true };
      } catch {
        return { success: false, message: '注册失败，请稍后再试' };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      setCurrentUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthOpen,
        authMode,
        isHydrated,
        openAuthDialog,
        closeAuthDialog,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
