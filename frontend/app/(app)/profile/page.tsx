'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AudioLines,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Heart,
  Loader2,
  LogOut,
  MessageSquare,
  Save,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { Brand } from '@/components/brand/hope-brand';
import { ThemeToggle } from '@/components/brand/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/lib/services/profileService';
import { UserProfile } from '@/lib/types';

const AGE_RANGES = ['18–24', '25–34', '35–44', '45–54', '55+'];

const ALL_FOCUS_AREAS = [
  'Stress & Burnout',
  'Work-Life Boundaries',
  'Sleep & Rest',
  'Relationships',
  'Overthinking & Anxiety',
  'Self-Worth & Motivation',
  'Life Transitions',
  'Just Exploring',
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ageRange, setAgeRange] = useState('25–34');
  const [focusAreas, setFocusAreas] = useState<string[]>(['Stress & Burnout', 'Work-Life Boundaries']);
  const [bio, setBio] = useState('');
  const [conversationStyle, setConversationStyle] = useState<'gentle' | 'direct'>('gentle');
  const [preferredTime, setPreferredTime] = useState('Evening (7:00 PM)');
  const [preferredMode, setPreferredMode] = useState<'text' | 'voice'>('voice');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const local = profileService.getProfile();
        if (local) {
          setName(local.name || user?.name || '');
          setEmail(local.email || user?.email || '');
          setAgeRange(local.ageRange || '25–34');
          setFocusAreas(local.focusAreas || ['Stress & Burnout', 'Work-Life Boundaries']);
          setBio(local.bio || '');
          setConversationStyle(local.conversationStyle || 'gentle');
          setPreferredTime(local.preferredTime || 'Evening (7:00 PM)');
          setPreferredMode(local.preferredMode || 'voice');
        }

        const remote = await profileService.fetchRemoteProfile(user?.id);
        if (remote) {
          setName(remote.name || user?.name || '');
          setEmail(remote.email || user?.email || '');
          setAgeRange(remote.ageRange || '25–34');
          setFocusAreas(remote.focusAreas || ['Stress & Burnout', 'Work-Life Boundaries']);
          setBio(remote.bio || '');
          setConversationStyle(remote.conversationStyle || 'gentle');
          setPreferredTime(remote.preferredTime || 'Evening (7:00 PM)');
          setPreferredMode(remote.preferredMode || 'voice');
        }
      } catch (e) {
        console.warn('Failed to load profile:', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const toggleFocusArea = (area: string) => {
    if (focusAreas.includes(area)) {
      setFocusAreas(focusAreas.filter((a) => a !== area));
    } else {
      setFocusAreas([...focusAreas, area]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await profileService.updateProfile({
        name: name.trim() || 'Friend',
        ageRange,
        focusAreas: focusAreas.length > 0 ? focusAreas : ['General Wellbeing'],
        conversationStyle,
        preferredTime,
        preferredMode,
        bio: bio.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const avatarInitial = (name || user?.name || 'F').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0b0d13] text-slate-100 flex flex-col selection:bg-purple-500/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#0b0d13]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <span className="text-white/20">|</span>
          <Brand compact />
        </div>

        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <Link
            href="/voice?mode=weekly"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-medium hover:bg-purple-600/30 transition-all"
          >
            <AudioLines className="w-3.5 h-3.5" />
            <span>Weekly Session</span>
          </Link>
          <button
            type="button"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              await signOut();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400/90 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-full transition-colors"
            title="Log out"
          >
            {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Profile Hero Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#161a24] via-[#12151e] to-[#0e1118] p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center space-x-4 sm:space-x-5">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-serif font-bold shadow-lg shadow-purple-900/30 border-2 border-white/20">
                  {avatarInitial}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#12151e]" title="Active Space" />
              </div>

              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">
                    {name || 'Your Space'}
                  </h1>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
                    Personalized
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {email || user?.email || 'Confidential Therapeutic Space'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                    <UserIcon className="w-3 h-3 text-purple-400" />
                    Age: {ageRange}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                    <Clock className="w-3 h-3 text-purple-400" />
                    Prefers {preferredTime}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                    <Heart className="w-3 h-3 text-purple-400" />
                    {conversationStyle === 'direct' ? 'Direct CBT' : 'Gentle Listening'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
              <Button
                asChild
                className="flex-1 sm:flex-none justify-center bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-600/30 text-xs"
              >
                <Link href="/voice?mode=weekly">
                  <AudioLines className="w-3.5 h-3.5 mr-2" />
                  Start Weekly Voice
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1 sm:flex-none justify-center border-white/10 hover:bg-white/10 text-slate-300 rounded-xl text-xs"
              >
                <Link href="/dashboard">
                  <MessageSquare className="w-3.5 h-3.5 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Success Alert */}
        {savedSuccess && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Your profile and preferences have been updated and synced to your space.</span>
            </div>
          </div>
        )}

        {/* Form to Edit Profile */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Personal Details */}
          <section className="rounded-3xl border border-white/10 bg-[#12151e] p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-serif text-white mb-1">Personal Details</h2>
              <p className="text-xs text-slate-400">
                How Hope identifies and refers to you during voice and text interactions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Age Range</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {AGE_RANGES.map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setAgeRange(range)}
                      className={`py-2 rounded-xl text-xs font-medium transition-all ${
                        ageRange === range
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Life Situation & Context Note
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a short summary of what is happening in your life right now (e.g. work challenges, family dynamics, specific stress triggers). Hope incorporates this context into your care."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 resize-none leading-relaxed"
              />
            </div>
          </section>

          {/* Card 2: Focus Areas */}
          <section className="rounded-3xl border border-white/10 bg-[#12151e] p-6 sm:p-8 space-y-4">
            <div>
              <h2 className="text-lg font-serif text-white mb-1">Focus Areas</h2>
              <p className="text-xs text-slate-400">
                Select the themes you want your sessions to anchor on.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ALL_FOCUS_AREAS.map((area) => {
                const isSelected = focusAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleFocusArea(area)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all text-left ${
                      isSelected
                        ? 'border-purple-500/60 bg-purple-500/15 text-purple-200'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{area}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Card 3: Therapeutic Tone & Schedule */}
          <section className="rounded-3xl border border-white/10 bg-[#12151e] p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-serif text-white mb-1">Therapeutic Preferences</h2>
              <p className="text-xs text-slate-400">
                Customize how your companion speaks and when you like to reflect.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Conversation Tone</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConversationStyle('gentle')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    conversationStyle === 'gentle'
                      ? 'border-purple-500/60 bg-purple-500/15 text-purple-200'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs font-semibold mb-1 text-white">Gentle & Empathetic</div>
                  <div className="text-[11px] text-slate-400">
                    Patient listening, emotional validation, and soft self-compassion.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConversationStyle('direct')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    conversationStyle === 'direct'
                      ? 'border-purple-500/60 bg-purple-500/15 text-purple-200'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs font-semibold mb-1 text-white">Direct & Actionable</div>
                  <div className="text-[11px] text-slate-400">
                    Structured CBT cognitive restructuring, thought records, and momentum.
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Preferred Check-in Time
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#161a24] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#161a24] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value="voice">Live Voice Companion</option>
                  <option value="text">Quiet Text Reflections</option>
                </select>
              </div>
            </div>
          </section>

          {/* Privacy Note */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200">
            <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <strong className="block text-white">Private & Safe Architecture</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">
                All profile parameters and conversational takeaways are isolated specifically to your therapeutic profile.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/dashboard"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>

            <Button
              type="submit"
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8 py-2.5 text-xs font-medium shadow-lg shadow-purple-600/30"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Saving changes…
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Save Profile Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
