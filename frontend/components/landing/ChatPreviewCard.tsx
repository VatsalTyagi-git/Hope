'use client';

import React from 'react';
import { ArrowUp, Lock } from 'lucide-react';

export function ChatPreviewCard() {
  return (
    <div className="relative w-full max-w-lg mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-6 border border-slate-200/80 shadow-[0_20px_50px_rgba(99,102,241,0.12)]">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-purple-100/90 text-purple-700 font-serif italic text-base flex items-center justify-center font-medium">
            h.
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Hope, here for you</h4>
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>A moment to check in</span>
            </div>
          </div>
        </div>

        {/* Audio Waveform icon mockup */}
        <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-slate-400">
          <span className="w-0.5 h-3 bg-purple-400 rounded-full animate-pulse" />
          <span className="w-0.5 h-4 bg-purple-600 rounded-full animate-pulse delay-75" />
          <span className="w-0.5 h-2 bg-purple-300 rounded-full" />
          <span className="w-0.5 h-5 bg-purple-500 rounded-full animate-pulse delay-150" />
          <span className="w-0.5 h-3 bg-purple-400 rounded-full" />
        </div>
      </div>

      {/* Chat Thread Mockup */}
      <div className="py-5 space-y-4">
        {/* User Message */}
        <div className="flex justify-end">
          <div className="max-w-[85%] bg-slate-100/90 text-slate-800 text-sm px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm">
            I've been feeling a little overwhelmed lately.
          </div>
        </div>

        {/* Assistant Reply */}
        <div className="flex items-start space-x-2.5">
          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-serif italic text-xs flex items-center justify-center font-medium shrink-0 mt-0.5">
            h.
          </div>
          <div className="max-w-[85%] bg-white border border-slate-100 text-slate-800 text-sm px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm leading-relaxed">
            I'm glad you're here. You don't have to carry it all at once. What's been on your mind?
          </div>
        </div>
      </div>

      {/* Disabled Input Box */}
      <div className="relative mt-2">
        <div className="w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full border border-slate-200 bg-slate-50/70 text-slate-400 text-sm select-none">
          <span>Share what's on your mind...</span>
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <ArrowUp className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-center justify-center space-x-1.5 mt-3 text-[11px] text-slate-400 font-medium">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Your space. Your pace.</span>
        </div>
      </div>
    </div>
  );
}
