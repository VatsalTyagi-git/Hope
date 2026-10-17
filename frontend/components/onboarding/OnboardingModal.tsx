'use client';

import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { profileService } from '@/lib/services/profileService';
import { UserProfile } from '@/lib/types';

interface OnboardingModalProps {
  onComplete: (profile: UserProfile) => void;
}

const AGE_RANGES = ['18–24', '25–34', '35–44', '45–54', '55+'];

const FOCUS_AREAS = [
  'Stress',
  'Work-life balance',
  'Sleep',
  'Relationships',
  'Motivation',
  'Just exploring',
];

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const currentProfile = profileService.getProfile();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(currentProfile?.name || '');
  const [ageRange, setAgeRange] = useState(currentProfile?.ageRange || '25–34');
  const [focusAreas, setFocusAreas] = useState<string[]>(currentProfile?.focusAreas || ['Stress', 'Work-life balance']);
  const [conversationStyle, setConversationStyle] = useState<'gentle' | 'direct'>(currentProfile?.conversationStyle || 'gentle');
  const [preferredTime, setPreferredTime] = useState(currentProfile?.preferredTime || 'Evening (7:00 PM)');
  const [preferredMode, setPreferredMode] = useState<'text' | 'voice'>(currentProfile?.preferredMode || 'text');

  const toggleFocusArea = (area: string) => {
    if (focusAreas.includes(area)) {
      setFocusAreas(focusAreas.filter((a) => a !== area));
    } else {
      setFocusAreas([...focusAreas, area]);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Finalize onboarding
      const updated = profileService.saveOnboarding({
        name: name.trim() || 'Vatsal',
        ageRange,
        focusAreas: focusAreas.length > 0 ? focusAreas : ['General wellbeing'],
        conversationStyle,
        preferredTime,
        preferredMode,
      });
      onComplete(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100 flex flex-col justify-between min-h-[500px]">
        {/* Top Progress Indicator */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-serif text-slate-900">hope.</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                Step {step} of 3
              </span>
            </div>
            <div className="flex space-x-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step ? 'w-8 bg-[#5244E3]' : s < step ? 'w-4 bg-purple-200' : 'w-4 bg-slate-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* STEP 1: Name and Age Range */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-serif text-slate-900 mb-2">What should we call you?</h2>
                <p className="text-sm text-slate-500">
                  Choose the name or nickname you feel most comfortable hearing.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Your Name</label>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vatsal"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Age Range</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {AGE_RANGES.map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setAgeRange(range)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                        ageRange === range
                          ? 'bg-[#5244E3] text-white shadow-sm'
                          : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Focus Areas */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-serif text-slate-900 mb-2">What brings you here?</h2>
                <p className="text-sm text-slate-500">
                  Select what feels most relevant to your current space. You can change this anytime.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {FOCUS_AREAS.map((area) => {
                  const isSelected = focusAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleFocusArea(area)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/70 text-purple-900 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{area}</span>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-purple-600" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400">
                🔒 We do not collect medical diagnoses or clinical history. Hope is a wellbeing companion.
              </p>
            </div>
          )}

          {/* STEP 3: Conversation Preferences */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-serif text-slate-900 mb-2">Your Space, Your Pace</h2>
                <p className="text-sm text-slate-500">
                  Set how you prefer your companions to listen and connect with you.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Conversation Tone</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConversationStyle('gentle')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      conversationStyle === 'gentle'
                        ? 'border-purple-500 bg-purple-50/70 text-purple-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-0.5">Gentle & Listening</div>
                    <div className="text-[11px] text-slate-500">Softer pacing, empathetic validation.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConversationStyle('direct')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      conversationStyle === 'direct'
                        ? 'border-purple-500 bg-purple-50/70 text-purple-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-0.5">Direct & Actionable</div>
                    <div className="text-[11px] text-slate-500">Practical CBT reframing exercises.</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Preferred Check-in Time</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="Morning (8:00 AM)">Morning (8:00 AM)</option>
                  <option value="Midday (1:00 PM)">Midday (1:00 PM)</option>
                  <option value="Evening (7:00 PM)">Evening (7:00 PM)</option>
                  <option value="Night (10:00 PM)">Night (10:00 PM)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors px-3 py-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#5244E3] hover:bg-[#4335D6] text-white text-xs font-medium shadow-md transition-all transform active:scale-95"
          >
            <span>{step === 3 ? 'Enter your space' : 'Continue'}</span>
            {step === 3 ? <Sparkles className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
