import { UserProfile } from '../types';
import { authService } from './authService';

const PROFILE_STORAGE_KEY = 'hope_user_profile';

function getScopedKey(userId?: string | null): string {
  return userId ? `${PROFILE_STORAGE_KEY}_${userId}` : PROFILE_STORAGE_KEY;
}

export const profileService = {
  getActiveUserId(explicitId?: string | null): string | null {
    if (explicitId && explicitId.trim() !== '') return explicitId;
    if (typeof window === 'undefined') return null;
    const authUser = authService.getCurrentUser();
    if (authUser?.id) return authUser.id;
    try {
      const rawStored = localStorage.getItem('hope_current_user');
      if (rawStored) {
        const parsed = JSON.parse(rawStored);
        if (parsed?.id) return parsed.id;
      }
    } catch {}
    const cookieMatch = document.cookie.match(/(^| )cbt_patient_id=([^;]+)/);
    if (cookieMatch) {
      return decodeURIComponent(cookieMatch[2]);
    }
    return null;
  },

  getProfile(userId?: string | null): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const activeId = this.getActiveUserId(userId);

    // 1. Check user-scoped key first if activeId is known
    if (activeId) {
      const scopedRaw = localStorage.getItem(getScopedKey(activeId));
      if (scopedRaw) {
        try {
          const parsed = JSON.parse(scopedRaw);
          if (parsed && (!parsed.id || parsed.id === activeId)) {
            return parsed;
          }
        } catch {}
      }
    }

    // 2. Check general key, but verify it matches activeId if known
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (!activeId || !parsed.id || parsed.id === activeId) {
            return parsed;
          }
        }
      } catch {}
    }

    // 3. Fallback to current authenticated user defaults
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
  },

  isOnboardingComplete(userId?: string | null): boolean {
    const profile = this.getProfile(userId);
    return Boolean(profile?.onboardingComplete);
  },

  async fetchRemoteProfile(userId?: string | null): Promise<UserProfile | null> {
    if (typeof window === 'undefined') return null;
    const targetId = this.getActiveUserId(userId);
    if (!targetId) return this.getProfile(userId);

    try {
      const res = await fetch(`/api/profile?userId=${encodeURIComponent(targetId)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data.profile));
          localStorage.setItem(getScopedKey(targetId), JSON.stringify(data.profile));
          return data.profile;
        }
      }
    } catch (e) {
      console.warn('Could not fetch remote profile:', e);
    }
    return this.getProfile(targetId);
  },

  async saveOnboarding(data: Partial<UserProfile>): Promise<UserProfile> {
    const user = authService.getCurrentUser();
    const targetUserId = data.id || user?.id || this.getActiveUserId() || '0ccbaecf-43fd-4b7f-91e0-d32233482b07';
    const existing = this.getProfile(targetUserId);

    const updatedProfile: UserProfile = {
      id: targetUserId,
      name: data.name || user?.name || existing?.name || 'Friend',
      email: data.email || user?.email || existing?.email || 'you@example.com',
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
      localStorage.setItem(getScopedKey(targetUserId), JSON.stringify(updatedProfile));
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
    const targetUserId = updates.id || this.getActiveUserId() || '0ccbaecf-43fd-4b7f-91e0-d32233482b07';
    const current = this.getProfile(targetUserId) || {
      id: targetUserId,
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
    const updated = { ...current, ...updates, id: targetUserId, onboardingComplete: true };
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(getScopedKey(targetUserId), JSON.stringify(updated));
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
