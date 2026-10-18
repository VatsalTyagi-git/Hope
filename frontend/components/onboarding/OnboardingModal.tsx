'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  AudioLines,
  MessageSquare,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { profileService } from '@/lib/services/profileService';
import { UserProfile } from '@/lib/types';

interface OnboardingModalProps {
  onComplete?: (profile: UserProfile, chosenAction?: 'weekly' | 'dashboard') => void;
  userId?: string;
  initialName?: string;
  initialEmail?: string;
}

const AGE_RANGES = ['18–24', '25–34', '35–44', '45–54', '55+'];

const FOCUS_AREAS = [
  'Stress & Burnout',
  'Work-Life Boundaries',
  'Sleep & Rest',
  'Relationships',
  'Overthinking & Anxiety',
  'Self-Worth & Motivation',
  'Life Transitions',
  'Just Exploring',
];

export function OnboardingModal({
  onComplete,
  userId,
  initialName,
  initialEmail,
}: OnboardingModalProps) {
  const router = useRouter();
  const currentProfile = profileService.getProfile();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState(initialName || currentProfile?.name || '');
  const [ageRange, setAgeRange] = useState(currentProfile?.ageRange || '25–34');
  const [focusAreas, setFocusAreas] = useState<string[]>(
    currentProfile?.focusAreas && currentProfile.focusAreas.length > 0
      ? currentProfile.focusAreas
      : ['Stress & Burnout', 'Work-Life Boundaries']
  );
  const [bio, setBio] = useState(currentProfile?.bio || '');
  const [conversationStyle, setConversationStyle] = useState<'gentle' | 'direct'>(
    currentProfile?.conversationStyle || 'gentle'
  );
  const [preferredTime, setPreferredTime] = useState(
    currentProfile?.preferredTime || 'Evening (7:00 PM)'
  );
  const [preferredMode, setPreferredMode] = useState<'text' | 'voice'>(
    currentProfile?.preferredMode || 'voice'
  );

  const toggleFocusArea = (area: string) => {
    if (focusAreas.includes(area)) {
      setFocusAreas(focusAreas.filter((a) => a !== area));
    } else {
      setFocusAreas([...focusAreas, area]);
    }
  };

  const handleNextStep = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else if (step === 3) {
      // Save profile to both DBs (PostgreSQL and FalkorDB) and advance to completion choice
      setSaving(true);
      try {
        await profileService.saveOnboarding({
          id: userId || currentProfile?.id,
          name: name.trim() || initialName || currentProfile?.name || 'Friend',
          email: initialEmail || currentProfile?.email,
          ageRange,
          focusAreas: focusAreas.length > 0 ? focusAreas : ['General Wellbeing'],
          conversationStyle,
          preferredTime,
          preferredMode,
          bio: bio.trim(),
        });
        setStep(4); // Move to completion choice screen
      } catch (err) {
        console.warn('Error saving onboarding profile:', err);
        setStep(4);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleActionChoice = (action: 'weekly' | 'dashboard') => {
    const finalProfile = profileService.getProfile() || {
      id: userId || 'user',
      name: name || 'Friend',
      email: initialEmail || '',
      avatarInitial: (name || 'F').charAt(0).toUpperCase(),
      ageRange,
      focusAreas,
      conversationStyle,
      preferredTime,
      preferredMode,
      bio,
      onboardingComplete: true,
    };

    if (onComplete) {
      onComplete(finalProfile, action);
    }

    if (action === 'weekly') {
      router.push('/voice?mode=weekly');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl bg-[#111319] border border-white/10 rounded-3xl p-7 sm:p-9 shadow-2xl flex flex-col justify-between min-h-[520px] text-slate-100 overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* Top Header & Progress */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-serif text-white tracking-tight">hope.</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-medium border border-purple-500/25">
                {step < 4 ? `Step ${step} of 3` : 'Ready to Begin'}
              </span>
            </div>
            {step < 4 && (
              <div className="flex space-x-1.5 items-center">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      s === step
                        ? 'w-8 bg-purple-500'
                        : s < step
                        ? 'w-3.5 bg-purple-500/40'
                        : 'w-3.5 bg-white/10'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* STEP 1: Name and Age Range */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-serif text-white mb-1.5">What should we call you?</h2>
                <p className="text-sm text-slate-400">
                  Choose the name or nickname you feel most comfortable hearing in your conversations.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Your Name</label>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex, Maya, Jordan"
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Age Range</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {AGE_RANGES.map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setAgeRange(range)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all ${
                        ageRange === range
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25 border border-purple-400/30'
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Focus Areas & Life Context */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-serif text-white mb-1.5">What brings you here?</h2>
                <p className="text-sm text-slate-400">
                  Select what is most relevant to your life right now. You can adjust this anytime.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {FOCUS_AREAS.map((area) => {
                  const isSelected = focusAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleFocusArea(area)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all text-left ${
                        isSelected
                          ? 'border-purple-500/60 bg-purple-500/15 text-purple-200 shadow-sm'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{area}</span>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 ml-1.5" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0 ml-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  A few words about yourself (Optional)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Dealing with burnout and overthinking at work, or looking for practical grounding tools..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Conversation Style & Mode */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-serif text-white mb-1.5">Your Space, Your Pace</h2>
                <p className="text-sm text-slate-400">
                  Set how you prefer your companion to listen and connect with you.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Conversation Tone</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConversationStyle('gentle')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      conversationStyle === 'gentle'
                        ? 'border-purple-500/60 bg-purple-500/15 text-purple-200 shadow-sm'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1 text-white">Gentle & Empathetic</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">
                      Softer pacing, empathetic validation, and gentle reflective space.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConversationStyle('direct')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      conversationStyle === 'direct'
                        ? 'border-purple-500/60 bg-purple-500/15 text-purple-200 shadow-sm'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1 text-white">Direct & Actionable</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">
                      Practical CBT reframing exercises, active thought records, and structured momentum.
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Preferred Time
                  </label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#161a22] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  >
                    <option value="Morning (8:00 AM)">Morning (8:00 AM)</option>
                    <option value="Midday (1:00 PM)">Midday (1:00 PM)</option>
                    <option value="Evening (7:00 PM)">Evening (7:00 PM)</option>
                    <option value="Night (10:00 PM)">Night (10:00 PM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Primary Modality
                  </label>
                  <select
                    value={preferredMode}
                    onChange={(e) => setPreferredMode(e.target.value as 'text' | 'voice')}
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#161a22] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  >
                    <option value="voice">Live Voice Companion</option>
                    <option value="text">Quiet Text Reflections</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-200">
                <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>
                  Your profile and reflections are securely isolated and preserved only for your personal therapeutic care.
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: Completion Choice Screen (Redirect to Weekly Agent vs Dashboard) */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-300 mb-2">
                <Sparkles className="w-7 h-7" />
              </div>

              <div>
                <h2 className="text-2xl font-serif text-white mb-2">
                  Welcome to Hope, {name || 'Friend'}.
                </h2>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  Your profile has been saved. Hope is now tuned to your focus areas and preferred style. Where would you like to start?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left">
                {/* CHOICE 1: Weekly Voice Agent */}
                <button
                  type="button"
                  onClick={() => handleActionChoice('weekly')}
                  className="group relative p-5 rounded-2xl border border-purple-500/40 bg-gradient-to-b from-purple-950/40 to-purple-900/10 hover:border-purple-400 hover:from-purple-900/40 transition-all duration-200 shadow-lg shadow-purple-950/30 flex flex-col justify-between"
                >
                  <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Recommended
                  </div>
                  <div className="mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <AudioLines className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">Weekly Therapy</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      A structured, gentle vocal check-in with your Weekly AI Therapist to unpack what is on your mind.
                    </p>
                  </div>
                  <div className="inline-flex items-center text-xs font-medium text-purple-300 group-hover:text-purple-200 gap-1.5">
                    <span>Begin voice session</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* CHOICE 2: Simply to Dashboard */}
                <button
                  type="button"
                  onClick={() => handleActionChoice('dashboard')}
                  className="group relative p-5 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-slate-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">Open Dashboard</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Go straight to your quiet dashboard to explore past reflections or start a peaceful text chat.
                    </p>
                  </div>
                  <div className="inline-flex items-center text-xs font-medium text-slate-300 group-hover:text-white gap-1.5">
                    <span>Enter quiet space</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions for Steps 1-3 */}
        {step < 4 && (
          <div className="relative z-10 flex items-center justify-between pt-5 border-t border-white/5 mt-5">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              disabled={saving}
              onClick={handleNextStep}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-lg shadow-purple-600/30 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving your space…</span>
                </>
              ) : (
                <>
                  <span>{step === 3 ? 'Save & Continue' : 'Continue'}</span>
                  {step === 3 ? <Sparkles className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default OnboardingModal;
