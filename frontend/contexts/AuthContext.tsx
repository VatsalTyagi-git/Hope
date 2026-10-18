'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

export interface HopeUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  fullName?: string;
  onboardingComplete?: boolean;
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
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  }
}

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
          if (parsed && (parsed.id || parsed.email)) {
            setUser(parsed);
            setPatientCookie(parsed.id || parsed.email);
            setLoading(false);
            return;
          }
        }

        // Check if NextAuth has an active session (e.g. from Google or Credentials)
        try {
          const sessionRes = await fetch('/api/auth/session');
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            if (sessionData?.user) {
              const authedUser: HopeUser = {
                id: sessionData.user.id || crypto.randomUUID(),
                email: sessionData.user.email,
                name: sessionData.user.name || sessionData.user.email?.split('@')[0],
                image: sessionData.user.image,
              };
              setUser(authedUser);
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authedUser));
              setPatientCookie(authedUser.id);
              setLoading(false);
              return;
            }
          }
        } catch {}

        const cookieMatch = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
        if (cookieMatch) {
          const id = decodeURIComponent(cookieMatch[2]);
          if (id && id.trim() !== '') {
            const restoredUser: HopeUser = {
              id,
              email: id.includes('@') ? id : `${id}@hope-wellbeing.org`,
              name: id.split('@')[0],
            };
            setUser(restoredUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(restoredUser));
            setLoading(false);
            return;
          }
        }

        // No logged-in user
        setUser(null);
      }
    } catch (e) {
      console.warn('[AuthContext] Session load note:', e);
      setUser(null);
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
        image: dbUser.image,
        onboardingComplete: Boolean(dbUser.onboardingComplete),
        user_metadata: {
          fullName: dbUser.name,
          full_name: dbUser.name,
          avatar_url: dbUser.image,
        },
      };

      if (typeof window !== 'undefined') {
        const oldProfileRaw = localStorage.getItem('hope_user_profile');
        if (oldProfileRaw) {
          try {
            const oldP = JSON.parse(oldProfileRaw);
            if (oldP && oldP.id && oldP.id !== loggedInUser.id) {
              localStorage.removeItem('hope_user_profile');
            }
          } catch {
            localStorage.removeItem('hope_user_profile');
          }
        }
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
        onboardingComplete: false,
        user_metadata: {
          fullName: dbUser.name,
          full_name: dbUser.name,
        },
      };

      if (typeof window !== 'undefined') {
        localStorage.removeItem('hope_user_profile');
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
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem('hope_user_profile');
        localStorage.removeItem('hope_new_user_first_session');
        localStorage.removeItem('hope_voice_session_turns');
        // Clear any user-scoped profile keys
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('hope_user_profile_') || key.startsWith('hope_profile_'))) {
            localStorage.removeItem(key);
          }
        }
        sessionStorage.clear();
        clearPatientCookie();
      }
      setUser(null);

      // Call server-side logout route to clear all HttpOnly session cookies
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
      } catch (err) {
        console.warn('[AuthContext] server-side logout fetch note:', err);
      }

      // Also invoke NextAuth client signOut
      try {
        await nextAuthSignOut({ redirect: false });
      } catch (err) {
        console.warn('[AuthContext] nextAuthSignOut note:', err);
      }
    } finally {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const resetPassword = async (_email: string) => {
    return { error: null };
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    try {
      await nextAuthSignIn('google', { callbackUrl: redirectTo || '/dashboard' });
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
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
