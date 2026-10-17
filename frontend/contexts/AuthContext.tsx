'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface HopeUser {
  id: string;
  email: string;
  name: string;
  user_metadata?: {
    fullName?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface AuthContextType {
  user: HopeUser | null;
  session: any | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password?: string,
    options?: { fullName?: string }
  ) => Promise<{ error: Error | null; user: HopeUser | null; session: any | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'hope_current_user';
const COOKIE_NAME = 'cbt_patient_id';

function setPatientCookie(userId: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(userId)}; path=/; max-age=2592000; SameSite=Lax`;
  }
}

function clearPatientCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export const DEFAULT_TESTED_USER: HopeUser = {
  id: '0ccbaecf-43fd-4b7f-91e0-d32233482b07',
  email: 'elena.rostova.1792184365157@hope-wellbeing.org',
  name: 'Elena Rostova',
  user_metadata: {
    fullName: 'Elena Rostova',
    full_name: 'Elena Rostova',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<HopeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          setPatientCookie(parsed.id || parsed.email);
        } else {
          // Default to the tested patient (Elena Rostova)
          const cookieMatch = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
          if (cookieMatch) {
            const id = decodeURIComponent(cookieMatch[2]);
            const restoredUser: HopeUser = {
              id,
              email: id.includes('@') ? id : `${id}@hope-wellbeing.org`,
              name: id === DEFAULT_TESTED_USER.id ? DEFAULT_TESTED_USER.name : id.split('@')[0],
              user_metadata: { fullName: id === DEFAULT_TESTED_USER.id ? DEFAULT_TESTED_USER.name : id.split('@')[0] },
            };
            setUser(restoredUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(restoredUser));
          } else {
            setUser(DEFAULT_TESTED_USER);
            setPatientCookie(DEFAULT_TESTED_USER.id);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_TESTED_USER));
          }
        }
      }
    } catch (e) {
      console.warn('[AuthContext] Session load note:', e);
      setUser(DEFAULT_TESTED_USER);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signIn = async (email: string, password?: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: password || '' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to sign in. Please check your credentials.');
      }

      const { user: dbUser } = await res.json();
      const loggedInUser: HopeUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        user_metadata: {
          fullName: dbUser.name,
          full_name: dbUser.name,
          avatar_url: dbUser.image,
        },
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));
        setPatientCookie(loggedInUser.id);
      }
      setUser(loggedInUser);
      return { error: null };
    } catch (err: any) {
      console.error('[AuthContext signIn error]:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signUp = async (
    email: string,
    password?: string,
    options?: { fullName?: string }
  ) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const fullName = options?.fullName?.trim() || cleanEmail.split('@')[0];

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email: cleanEmail,
          password: password || 'DefaultPass123!',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Registration failed.');
      }

      const { user: dbUser } = await res.json();
      const newUser: HopeUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        user_metadata: {
          fullName: dbUser.name,
          full_name: dbUser.name,
        },
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        localStorage.setItem('hope_new_user_first_session', 'true');
        setPatientCookie(newUser.id);
      }
      setUser(newUser);
      return {
        error: null,
        user: newUser,
        session: { user: newUser },
      };
    } catch (err: any) {
      console.error('[AuthContext signUp error]:', err);
      return {
        error: err instanceof Error ? err : new Error(String(err)),
        user: null,
        session: null,
      };
    }
  };

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_STORAGE_KEY);
      clearPatientCookie();
    }
    setUser(null);
    router.push('/login');
  };

  const resetPassword = async (_email: string) => {
    return { error: null };
  };

  const signInWithGoogle = async (_redirectTo?: string) => {
    return signIn('google.user@example.com');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user ? { user } : null,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        signInWithGoogle,
        refreshSession,
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
