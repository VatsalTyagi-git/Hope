import React from 'react';
import { Calendar, Leaf, Sparkles, ShieldCheck, HeartHandshake, RefreshCw } from 'lucide-react';

export function ApproachSection() {
  return (
    <section id="approach" className="relative z-10 w-full max-w-6xl mx-auto px-6 py-28 scroll-mt-10">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-3xl sm:text-4xl font-serif text-slate-900 tracking-tight mb-4">
          A gentler way to care for your mind.
        </h2>
        <p className="text-base text-slate-600 leading-relaxed">
          Traditional support often asks you to adapt to its schedule. Hope adapts to yours. 
          Grounding techniques, cognitive reframing, and reflective journaling — ready whenever you are.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-purple-100/80 text-purple-700 flex items-center justify-center mb-6">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-serif text-slate-800 mb-2">Connected Memory</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your conversations don't vanish. Insights from your weekly sessions inform your daily micro-drills, so you never have to repeat your story.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center mb-6">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-serif text-slate-800 mb-2">CBT-Grounded Practice</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Grounded in proven Cognitive Behavioural Therapy frameworks to help you recognize cognitive distortions and build realistic rational reframes.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-6">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-serif text-slate-800 mb-2">Quiet, Private Space</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            No diagnostic labels, no insurance paperwork, and no pressure. A private sanctuary built solely to help you feel like yourself again.
          </p>
        </div>
      </div>
    </section>
  );
}

export function TherapistsSection() {
  return (
    <section id="therapists" className="relative z-10 w-full max-w-6xl mx-auto px-6 py-20 pb-32 scroll-mt-10">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-3xl sm:text-4xl font-serif text-slate-900 tracking-tight mb-4">
          Three companions. One connected story.
        </h2>
        <p className="text-base text-slate-600 leading-relaxed">
          Different moments call for different forms of care. Hope provides three specialised companions tuned for acute relief, structured progress, and daily consistency.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* On-Demand Companion */}
        <div className="bg-white rounded-3xl p-8 border border-purple-200/80 shadow-sm hover:border-purple-300 transition-all flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>On-Demand Relief</span>
            </div>
            <h3 className="text-2xl font-serif text-slate-800 mb-3">On-Demand Companion</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              For sudden overwhelm, acute panic spikes, or when you just need to vent right now. Provides immediate diaphragmatic breathing, 5-4-3-2-1 grounding, and calm presence.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 text-xs text-purple-600 font-medium">
            Available 24/7 • Instant response
          </div>
        </div>

        {/* Weekly Main Companion */}
        <div className="bg-white rounded-3xl p-8 border border-blue-200/80 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mb-6">
              <Calendar className="w-3.5 h-3.5" />
              <span>Structured Therapy</span>
            </div>
            <h3 className="text-2xl font-serif text-slate-800 mb-3">Weekly Main Therapist</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              In-depth 45-minute psychotherapy sessions to unpack relationship friction, analyze core beliefs, and co-create an actionable 7-day personalized cognitive behavioral plan.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 text-xs text-blue-600 font-medium">
            Weekly deep-dives • Formulates plans
          </div>
        </div>

        {/* Daily Exercise Companion */}
        <div className="bg-white rounded-3xl p-8 border border-emerald-200/80 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-6">
              <Leaf className="w-3.5 h-3.5" />
              <span>Daily Practice</span>
            </div>
            <h3 className="text-2xl font-serif text-slate-800 mb-3">Daily Exercise Therapist</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Bite-sized 5-minute micro-drills to check in on assigned homework, practice thought records, track daily mood shifts, and celebrate streak milestones.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 text-xs text-emerald-600 font-medium">
            5-minute check-ins • Keeps you consistent
          </div>
        </div>
      </div>
    </section>
  );
}
