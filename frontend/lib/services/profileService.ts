import { UserProfile } from '../types';
import { authService } from './authService';

const PROFILE_STORAGE_KEY = 'hope_user_profile';

export const profileService = {
  getProfile(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      const user = authService.getCurrentUser();
      if (!user) return null;
      return {
        ...user,
        focusAreas: ['Stress', 'Work-life balance'],
        conversationStyle: 'gentle',
        preferredTime: 'Evening (7:00 PM)',
        preferredMode: 'text',
        bio: '',
        onboardingComplete: false,
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  isOnboardingComplete(): boolean {
    const profile = this.getProfile();
    return Boolean(profile?.onboardingComplete);
  },

  async fetchRemoteProfile(userId?: string): Promise<UserProfile | null> {
    if (typeof window === 'undefined') return null;
    const targetId = userId || authService.getCurrentUser()?.id;
    if (!targetId) return this.getProfile();

    try {
      const res = await fetch(`/api/profile?userId=${encodeURIComponent(targetId)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data.profile));
          return data.profile;
        }
      }
    } catch (e) {
      console.warn('Could not fetch remote profile:', e);
    }
    return this.getProfile();
  },

  async saveOnboarding(data: Partial<UserProfile>): Promise<UserProfile> {
    const user = authService.getCurrentUser();
    const existing = this.getProfile();

    const updatedProfile: UserProfile = {
      id: user?.id || existing?.id || '0ccbaecf-43fd-4b7f-91e0-d32233482b07',
      name: data.name || user?.name || existing?.name || 'Friend',
      email: user?.email || existing?.email || 'you@example.com',
      avatarInitial: (data.name || user?.name || existing?.name || 'F').charAt(0).toUpperCase(),
      ageRange: data.ageRange || existing?.ageRange || '25–34',
      focusAreas: data.focusAreas || existing?.focusAreas || ['Stress', 'Work-life balance'],
      conversationStyle: data.conversationStyle || existing?.conversationStyle || 'gentle',
      preferredTime: data.preferredTime || existing?.preferredTime || 'Evening (7:00 PM)',
      preferredMode: data.preferredMode || existing?.preferredMode || 'text',
      bio: data.bio || existing?.bio || '',
      onboardingComplete: true,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
      authService.login(updatedProfile.email, '');
    }

    // Sync to PostgreSQL and FalkorDB asynchronously
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: updatedProfile.id,
          name: updatedProfile.name,
          email: updatedProfile.email,
          ageRange: updatedProfile.ageRange,
          focusAreas: updatedProfile.focusAreas,
          conversationStyle: updatedProfile.conversationStyle,
          preferredTime: updatedProfile.preferredTime,
          preferredMode: updatedProfile.preferredMode,
          bio: updatedProfile.bio,
        }),
      });
    } catch (err) {
      console.warn('Failed to sync profile to databases:', err);
    }

    return updatedProfile;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const current = this.getProfile() || {
      id: '0ccbaecf-43fd-4b7f-91e0-d32233482b07',
      name: 'Friend',
      email: 'you@example.com',
      avatarInitial: 'F',
      focusAreas: ['Stress', 'Work-life balance'],
      conversationStyle: 'gentle' as const,
      preferredTime: 'Evening (7:00 PM)',
      preferredMode: 'text' as const,
      bio: '',
      onboardingComplete: true,
    };
    const updated = { ...current, ...updates, onboardingComplete: true };
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    }

    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: updated.id,
          name: updated.name,
          email: updated.email,
          ageRange: updated.ageRange,
          focusAreas: updated.focusAreas,
          conversationStyle: updated.conversationStyle,
          preferredTime: updated.preferredTime,
          preferredMode: updated.preferredMode,
          bio: updated.bio,
        }),
      });
    } catch (err) {
      console.warn('Failed to sync profile update to databases:', err);
    }

    return updated;
  },
};
