import { UserProfile } from '../types';
import { authService } from './authService';

const PROFILE_STORAGE_KEY = 'hope_user_profile';

export const profileService = {
  getProfile(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      // Check if user is logged in, return base defaults
      const user = authService.getCurrentUser();
      if (!user) return null;
      return {
        ...user,
        focusAreas: ['Stress', 'Work-life balance'],
        conversationStyle: 'gentle',
        preferredTime: 'Evening (7:00 PM)',
        preferredMode: 'text',
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

  saveOnboarding(data: Partial<UserProfile>): UserProfile {
    const user = authService.getCurrentUser();
    const existing = this.getProfile();

    const updatedProfile: UserProfile = {
      id: user?.id || 'patient_vatsal',
      name: data.name || user?.name || existing?.name || 'Vatsal',
      email: user?.email || existing?.email || 'you@example.com',
      avatarInitial: (data.name || user?.name || 'Vatsal').charAt(0).toUpperCase(),
      ageRange: data.ageRange || existing?.ageRange || '25-34',
      focusAreas: data.focusAreas || existing?.focusAreas || ['Stress', 'Work-life balance'],
      conversationStyle: data.conversationStyle || existing?.conversationStyle || 'gentle',
      preferredTime: data.preferredTime || existing?.preferredTime || 'Evening (7:00 PM)',
      preferredMode: data.preferredMode || existing?.preferredMode || 'text',
      onboardingComplete: true,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
      // Keep auth user name in sync
      authService.login(updatedProfile.email, '');
    }

    return updatedProfile;
  },

  updateProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getProfile() || {
      id: 'patient_vatsal',
      name: 'Vatsal',
      email: 'you@example.com',
      avatarInitial: 'V',
      focusAreas: [],
      conversationStyle: 'gentle',
      preferredTime: 'Evening (7:00 PM)',
      preferredMode: 'text',
      onboardingComplete: true,
    };
    const updated = { ...current, ...updates };
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  },
};
