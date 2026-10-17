'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Lock } from 'lucide-react';
import { ChatPreviewCard } from './ChatPreviewCard';

export function Hero() {
  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-12 pb-24 text-center">
      {/* Pill Badge */}
      <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-purple-200/80 bg-purple-50/80 backdrop-blur-sm text-xs font-medium text-purple-800 shadow-sm mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
        <span>A little space for yourself</span>
      </div>

      {/* Main Display Headline */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto mb-6">
        <span>Hope. A space to be heard.</span>
        <br />
        <span className="italic font-normal text-slate-800">A place to feel like you.</span>
      </h1>

      {/* Subcopy */}
      <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
        Some days, you need a conversation. Some days, a little calm.
        <br className="hidden sm:inline" />
        Meet your AI companions for whatever today feels like.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-8">
        <Link
          href="/signup"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#5244E3] hover:bg-[#4335D6] text-white font-medium text-sm shadow-[0_4px_14px_rgba(82,68,227,0.35)] hover:shadow-[0_6px_20px_rgba(82,68,227,0.45)] transition-all transform hover:-translate-y-0.5"
        >
          Let's talk
          <ArrowUpRight className="w-4 h-4" />
        </Link>
        <a
          href="#approach"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors py-2"
        >
          A gentler way forward
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </a>
      </div>

      {/* Trust Line */}
      <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 font-medium mb-16">
        <Lock className="w-3.5 h-3.5 text-slate-400" />
        <span>Your story, held with care.</span>
        <span>•</span>
        <span>No judgment. No pressure.</span>
      </div>

      {/* Chat Preview Card */}
      <ChatPreviewCard />
    </section>
  );
}
