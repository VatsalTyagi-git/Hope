'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Circle,
  Clock,
  AudioLines,
  Sparkles,
  Flame,
  Activity,
  ArrowRight,
  Brain,
  Wind,
  Moon,
  CalendarCheck2,
  MessageSquareQuote,
} from 'lucide-react';
import { profileService } from '@/lib/services/profileService';
import { UserProfile } from '@/lib/types';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface DailyPlanExercise {
  day_number: number;
  assigned_date?: string;
  day_title: string;
  exercise_name: string;
  focus_area: string;
  instruction: string;
  target_question: string;
  recommended_duration_mins: number;
  status?: string;
}

export interface NextWeeklySessionInfo {
  date: string;
  timestamp: number;
  formattedDate: string;
  dayOfWeek: number;
}

interface ExerciseItem {
  id: string;
  title: string;
  category: 'Cognitive' | 'Somatic' | 'Behavioral';
  description: string;
  duration: string;
  icon: 'brain' | 'wind' | 'moon';
  timeOfDay: string;
  linkMode?: 'weekly' | 'daily';
}

const DEFAULT_EXERCISES: ExerciseItem[] = [
  {
    id: 'thought_record',
    title: '3-Column Thought Record',
    category: 'Cognitive',
    description: 'Catch an automatic stressful thought, identify cognitive distortions, and write a rational reframe.',
    duration: '5–8 mins',
    icon: 'brain',
    timeOfDay: 'Midday / As needed',
    linkMode: 'daily',
  },
  {
    id: 'physiological_sigh',
    title: 'Physiological Sigh Breathing',
    category: 'Somatic',
    description: 'Two deep nasal inhalations followed by an extended, slow oral exhalation. 5 cycles to lower cortisol.',
    duration: '3 mins',
    icon: 'wind',
    timeOfDay: 'Morning Routine',
  },
  {
    id: 'evening_disconnect',
    title: 'Evening Boundary Disconnect',
    category: 'Behavioral',
    description: 'Close work laptop and turn off Slack/email notifications to safeguard cognitive restoration.',
    duration: 'Ongoing',
    icon: 'moon',
    timeOfDay: '8:00 PM',
  },
];

export function CalendarModal({ isOpen, onClose }: CalendarModalProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<'all' | 'appointments' | 'exercises'>('all');
  const [completedMap, setCompletedMap] = useState<Record<string, Record<string, boolean>>>({});
  const [weeklyPlan, setWeeklyPlan] = useState<DailyPlanExercise[]>([]);
  const [nextWeeklySession, setNextWeeklySession] = useState<NextWeeklySessionInfo | null>(null);
  const [hasCompletedFirstSession, setHasCompletedFirstSession] = useState(false);
  const [latestSession, setLatestSession] = useState<{ id: string; date: string; summary?: string } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Load profile and tailored 7-day daily exercises plan + next weekly session on mount
  useEffect(() => {
    if (isOpen) {
      const p = profileService.getProfile();
      setProfile(p);
      profileService.fetchRemoteProfile().then((remote) => {
        if (remote) setProfile(remote);
      });

      setLoadingPlan(true);
      const uid = p?.id || '0ccbaecf-43fd-4b7f-91e0-d32233482b07';
      fetch(`/api/exercises/plan?userId=${encodeURIComponent(uid)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success) {
            if (Array.isArray(data.plan)) {
              setWeeklyPlan(data.plan);
            }
            if (data.nextWeeklySession) {
              setNextWeeklySession(data.nextWeeklySession);
            }
            setHasCompletedFirstSession(Boolean(data.hasCompletedFirstSession));
            setLatestSession(data.latestSession || null);
          }
        })
        .catch((err) => console.warn('Could not fetch weekly plan:', err))
        .finally(() => setLoadingPlan(false));
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load completed exercises from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('hope_calendar_completed_exercises');
      if (saved) {
        setCompletedMap(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not read completed exercises:', e);
    }
  }, []);

  // Format date helper: YYYY-MM-DD
  const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedKey = getDateKey(selectedDate);
  const todayKey = getDateKey(new Date());

  // Toggle exercise completion
  const toggleExercise = (exerciseId: string) => {
    setCompletedMap((prev) => {
      const dayMap = { ...(prev[selectedKey] || {}) };
      dayMap[exerciseId] = !dayMap[exerciseId];
      const updated = { ...prev, [selectedKey]: dayMap };
      try {
        localStorage.setItem('hope_calendar_completed_exercises', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save completed exercises:', e);
      }
      return updated;
    });
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const firstDayOfWeek = useMemo(() => {
    // 0 = Sunday, 1 = Monday, etc. Normalize to Monday = 0
    const day = new Date(year, month, 1).getDay();
    return (day + 6) % 7;
  }, [year, month]);

  // Weekly therapy appointment day is dynamically synced with nextWeeklySession.date,
  // falling back to Sundays if not yet scheduled
  const isWeeklyAppointmentDay = (date: Date) => {
    const key = getDateKey(date);
    if (nextWeeklySession?.date) {
      return nextWeeklySession.date === key;
    }
    return date.getDay() === 0; // Sundays fallback
  };

  const jumpToNextWeeklySession = () => {
    if (nextWeeklySession?.date) {
      const parts = nextWeeklySession.date.split('-').map(Number);
      if (parts.length === 3) {
        const target = new Date(parts[0], parts[1] - 1, parts[2]);
        setCurrentDate(target);
        setSelectedDate(target);
      }
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Streak calculation (days with at least 1 exercise completed)
  const streakCount = useMemo(() => {
    let streak = 0;
    const checkDate = new Date();
    for (let i = 0; i < 30; i++) {
      const key = getDateKey(checkDate);
      const dayData = completedMap[key];
      const hasCompleted = dayData && Object.values(dayData).some(Boolean);
      if (hasCompleted || i === 0) {
        if (hasCompleted) streak++;
      } else {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return Math.max(streak, 4); // baseline encouragement streak
  }, [completedMap]);

  // Selected day completed count
  const dayCompletedCount = useMemo(() => {
    const dayData = completedMap[selectedKey] || {};
    return DEFAULT_EXERCISES.filter((ex) => dayData[ex.id]).length;
  }, [completedMap, selectedKey]);

  // Day of week index: 1 (Mon) to 7 (Sun)
  const selectedDayIndex = useMemo(() => {
    return ((selectedDate.getDay() + 6) % 7) + 1;
  }, [selectedDate]);

  const assignedDayExercise = useMemo(() => {
    // 1. Try exact calendar date match (YYYY-MM-DD)
    const byDate = weeklyPlan.find((p) => p.assigned_date === selectedKey);
    if (byDate) return byDate;

    // 2. Fallback to day of week cycle (1 to 7)
    return (
      weeklyPlan.find((p) => Number(p.day_number) === selectedDayIndex) ||
      weeklyPlan[0] ||
      null
    );
  }, [weeklyPlan, selectedKey, selectedDayIndex]);

  if (!isOpen) return null;

  const isSelectedWeekly = isWeeklyAppointmentDay(selectedDate);
  const preferredTime = profile?.preferredTime || 'Evening (7:00 PM)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#0f1117] border border-white/10 rounded-3xl shadow-2xl flex flex-col text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Light Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-28 -mt-28" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -ml-28 -mb-28" />

        {/* Modal Top Bar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-inner">
              <CalendarCheck2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white tracking-tight">Calendar & Schedule</h2>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
                  <Flame className="w-3 h-3 text-amber-400" />
                  {streakCount}-Day Streak
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Track your weekly clinical appointments and daily CBT practice drills
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10"
            >
              Today
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close calendar"
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="relative z-10 flex items-center justify-between px-6 py-2.5 border-b border-white/5 bg-black/20 text-xs">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Schedule
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'appointments'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Weekly Appointments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('exercises')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'exercises'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Daily Exercises
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
              Weekly Clinical Voice
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              Daily CBT Practice
            </span>
          </div>
        </div>

        {/* Modal Body: Split view of Calendar Grid and Detailed Day Schedule */}
        <div className="relative z-10 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* LEFT: Calendar Grid (7 columns) */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between">
            <div>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {monthNames[month]} {year}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    aria-label="Previous month"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    aria-label="Next month"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day of Week Header */}
              <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <span key={day} className="text-[11px] font-medium text-slate-500 uppercase tracking-wider py-1">
                    {day}
                  </span>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty cells before month start */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-14 sm:h-16 rounded-xl bg-transparent" />
                ))}

                {/* Days in Month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateObj = new Date(year, month, dayNum);
                  const key = getDateKey(dateObj);
                  const isToday = key === todayKey;
                  const isSelected = key === selectedKey;
                  const hasWeekly = isWeeklyAppointmentDay(dateObj);
                  const dayOfWeek = ((dateObj.getDay() + 6) % 7) + 1;
                  const dayPlanItem = weeklyPlan.find((p) => p.assigned_date === key);
                  const hasAssigned = Boolean(dayPlanItem);
                  const dayExercises = completedMap[key] || {};
                  const isCompleted =
                    Boolean(completedMap[key]?.[`day_${dayPlanItem?.day_number}`]) ||
                    Boolean(completedMap[key]?.[`day_${dayOfWeek}`]) ||
                    DEFAULT_EXERCISES.every((ex) => dayExercises[ex.id]);
                  const hasSome = Object.values(dayExercises).some(Boolean);

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setSelectedDate(dateObj)}
                      className={`relative h-14 sm:h-16 p-1.5 rounded-xl border flex flex-col justify-between text-left transition-all group ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/15 shadow-[0_0_15px_rgba(147,51,234,0.3)] ring-1 ring-purple-500/50'
                          : isToday
                          ? 'border-white/30 bg-white/5 text-white'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-semibold rounded-md w-5 h-5 flex items-center justify-center ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : isToday
                              ? 'bg-white/20 text-white'
                              : 'text-slate-300'
                          }`}
                        >
                          {dayNum}
                        </span>

                        {isCompleted && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Completed all exercises" />
                        )}
                      </div>

                      {/* Day Activity Indicators */}
                      <div className="flex items-center gap-1 mt-auto">
                        {hasWeekly && (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.9)] animate-pulse ring-1 ring-purple-300"
                            title={
                              nextWeeklySession?.formattedDate
                                ? `Weekly CBT Session with Hope (${nextWeeklySession.formattedDate})`
                                : 'Weekly CBT Session'
                            }
                          />
                        )}
                        {(hasAssigned || hasSome) && (
                          <span
                            className={`w-2 h-2 rounded-full transition-colors ${
                              isCompleted
                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                                : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                            }`}
                            title={
                              dayPlanItem
                                ? `Day ${dayPlanItem.day_number}: ${dayPlanItem.exercise_name}`
                                : 'Daily CBT Drill'
                            }
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Helper Banner */}
            <div className="mt-6 p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-transparent border border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <p className="text-xs text-slate-300">
                  <span className="text-white font-medium">Synced Therapy Rhythm:</span>{' '}
                  {nextWeeklySession?.formattedDate ? (
                    <>
                      Next weekly clinical review on <strong className="text-purple-300 font-semibold">{nextWeeklySession.formattedDate}</strong>. Follow your daily drills leading up to it.
                    </>
                  ) : (
                    'Weekly sessions explore core schemas, followed by daily 5-min somatic drills.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Selected Day Details & Activities (5 columns) */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between bg-black/15">
            <div>
              {/* Selected Day Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div>
                  <span className="text-[11px] font-medium text-purple-400 uppercase tracking-wider">
                    {selectedKey === todayKey ? 'Today’s Agenda' : 'Day Overview'}
                  </span>
                  <h3 className="text-base font-semibold text-white">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-medium text-slate-400 block">
                    {dayCompletedCount} of {DEFAULT_EXERCISES.length} completed
                  </span>
                  <div className="w-24 h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300"
                      style={{
                        width: `${(dayCompletedCount / DEFAULT_EXERCISES.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 1. WEEKLY APPOINTMENT CARD (If tab is 'all' or 'appointments') */}
              {(activeTab === 'all' || activeTab === 'appointments') && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <AudioLines className="w-3.5 h-3.5 text-purple-400" />
                      Weekly Clinical Therapy
                    </span>
                    {isSelectedWeekly && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Scheduled
                      </span>
                    )}
                  </div>

                  {isSelectedWeekly ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/30 via-purple-950/20 to-black/40 border border-purple-500/30 shadow-lg relative overflow-hidden group">
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">
                              Weekly CBT Voice Session with Hope
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Synced
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            In-depth weekly review, schema discovery & thought restructuring
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 mb-3.5">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-purple-400" />
                          {nextWeeklySession?.formattedDate ? `${nextWeeklySession.formattedDate} at ` : ''}{preferredTime}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Brain className="w-3 h-3 text-indigo-400" />
                          Live Voice AI Clinical Practitioner
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            router.push('/voice?mode=weekly');
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-purple-500/25"
                        >
                          <AudioLines className="w-3.5 h-3.5" />
                          <span>Join Weekly Voice Session</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 flex items-center justify-between">
                      <div>
                        <span>No weekly appointment scheduled for this date.</span>
                        {nextWeeklySession?.formattedDate && (
                          <p className="text-[11px] text-purple-400 mt-1">
                            Next weekly session synced on <strong className="text-purple-300">{nextWeeklySession.formattedDate}</strong>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {nextWeeklySession && (
                          <button
                            type="button"
                            onClick={jumpToNextWeeklySession}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-medium transition-colors"
                          >
                            Jump to Date
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            router.push('/voice?mode=weekly');
                          }}
                          className="text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1 text-xs"
                        >
                          Start anytime <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. DAILY CBT EXERCISES (If tab is 'all' or 'exercises') */}
              {(activeTab === 'all' || activeTab === 'exercises') && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Daily CBT Exercises & Drills
                    </span>
                    <span className="text-[11px] text-slate-400">Click to complete</span>
                  </div>

                  <div className="space-y-3">
                    {/* Primary Tailored Daily Exercise for Selected Day from 7-Day Plan */}
                    {assignedDayExercise && (
                      <div
                        className={`p-4 rounded-2xl border transition-all ${
                          Boolean(completedMap[selectedKey]?.[`day_${assignedDayExercise.day_number}`])
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-gradient-to-br from-purple-950/30 via-indigo-950/20 to-black/40 border-purple-500/30 shadow-lg'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleExercise(`day_${assignedDayExercise.day_number}`)}
                            className="mt-1 text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                            title="Mark completed"
                          >
                            {Boolean(completedMap[selectedKey]?.[`day_${assignedDayExercise.day_number}`]) ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-purple-400 hover:text-purple-300" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                                  Day {assignedDayExercise.day_number} Assigned Drill
                                </span>
                                {assignedDayExercise.assigned_date && (
                                  <span className="text-[10px] font-medium text-purple-300/80">
                                    • {assignedDayExercise.assigned_date === todayKey ? 'Active Today' : new Date(assignedDayExercise.assigned_date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                                {assignedDayExercise.recommended_duration_mins || 5} mins
                              </span>
                            </div>

                            <h4
                              className={`text-sm font-semibold transition-all ${
                                Boolean(completedMap[selectedKey]?.[`day_${assignedDayExercise.day_number}`])
                                  ? 'text-slate-400 line-through'
                                  : 'text-white'
                              }`}
                            >
                              {assignedDayExercise.exercise_name}
                            </h4>

                            <p className="text-[11px] text-purple-300/90 font-medium mt-0.5">
                              Focus: {assignedDayExercise.focus_area}
                            </p>

                            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                              {assignedDayExercise.instruction}
                            </p>

                            {/* Tailored Voice Coaching Question Box */}
                            {assignedDayExercise.target_question && (
                              <div className="mt-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200">
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-purple-300 uppercase tracking-wider mb-1">
                                  <MessageSquareQuote className="w-3.5 h-3.5 text-purple-400" />
                                  Hope&apos;s Daily Coaching Question
                                </div>
                                <p className="text-xs italic text-purple-100 leading-snug">
                                  &ldquo;{assignedDayExercise.target_question}&rdquo;
                                </p>
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/10">
                              <span className="text-[10px] text-slate-400">
                                Daily Voice Coach Practice
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  router.push('/voice?mode=daily');
                                }}
                                className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-md hover:shadow-purple-500/25"
                              >
                                <AudioLines className="w-3.5 h-3.5" />
                                <span>Practice with Hope</span>
                                <ArrowRight className="w-3 h-3 ml-0.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Secondary Somatic & Behavioral Maintenance Drills */}
                    {DEFAULT_EXERCISES.filter((ex) => ex.id !== 'thought_record').map((ex) => {
                      const isDone = Boolean(completedMap[selectedKey]?.[ex.id]);

                      return (
                        <div
                          key={ex.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isDone
                              ? 'bg-emerald-950/20 border-emerald-500/30'
                              : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => toggleExercise(ex.id)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4
                                  className={`text-xs font-semibold transition-all ${
                                    isDone ? 'text-slate-400 line-through' : 'text-white'
                                  }`}
                                >
                                  {ex.title}
                                </h4>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                                  {ex.duration}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {ex.description}
                              </p>

                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400">
                                <span>{ex.timeOfDay}</span>
                                {ex.linkMode && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      router.push(`/voice?mode=${ex.linkMode}`);
                                    }}
                                    className="text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1"
                                  >
                                    Launch Practice Check-in <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px]">
                Preferred weekly slot: <strong className="text-slate-200">{preferredTime}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/profile');
                }}
                className="text-purple-400 hover:text-purple-300 underline font-medium"
              >
                Change in Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
