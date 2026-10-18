import { signIn, signOut } from 'next-auth/react';
import { User } from '../types';

const AUTH_STORAGE_KEY = 'hope_current_user';

export const authService = {
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
  },

  isAuthenticated(): boolean {
    return Boolean(this.getCurrentUser());
  },

  async login(email: string, password?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanEmail = email.toLowerCase().trim();

      // Sign in through NextAuth Credentials Provider
      const result = await signIn('credentials', {
        email: cleanEmail,
        password: password || '',
        redirect: false,
      });

      if (result?.error) {
        return { success: false, error: 'Invalid email or password.' };
      }

      // Sync local storage user model for seamless UI state
      const name = cleanEmail.split('@')[0].replace(/[._]/g, ' ');
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      const user: User = {
        id: `user_${Date.now()}`,
        name: formattedName,
        email: cleanEmail,
        avatarInitial: formattedName.charAt(0).toUpperCase(),
      };
      this.setCurrentUser(user);

      return { success: true };
    } catch (err: unknown) {
      console.error('Login error:', err);
      return { success: false, error: 'An unexpected error occurred during login.' };
    }
  },

  async signup(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanName = name.trim();

      // 1. Register user in PostgreSQL database via Prisma 7 API route
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to create account.' };
      }

      // 2. Automatically authenticate via NextAuth
      const loginResult = await signIn('credentials', {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        return { success: false, error: 'Account created, but sign in failed. Please log in.' };
      }

      const user: User = {
        id: data.user?.id || `user_${Date.now()}`,
        name: cleanName || cleanEmail.split('@')[0],
        email: cleanEmail,
        avatarInitial: (cleanName || cleanEmail).charAt(0).toUpperCase(),
      };
      this.setCurrentUser(user);

      return { success: true };
    } catch (err: unknown) {
      console.error('Signup error:', err);
      return { success: false, error: 'Network error creating account. Please try again.' };
    }
  },

  async loginWithGoogle(): Promise<void> {
    await signIn('google', { callbackUrl: '/dashboard' });
  },

  async logout(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem('hope_user_profile');
        localStorage.removeItem('hope_new_user_first_session');
        localStorage.removeItem('hope_voice_session_turns');
        sessionStorage.clear();
        document.cookie = 'cbt_patient_id=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
      } catch {}
      try {
        await signOut({ redirect: false });
      } catch {}
    } finally {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },
};
