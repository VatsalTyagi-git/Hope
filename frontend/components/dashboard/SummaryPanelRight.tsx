'use client';

import React from 'react';
import {
  FileText,
  X,
  Leaf,
  Check,
  Download,
} from 'lucide-react';
import { Conversation, SessionSummary } from '@/lib/types';
import { summaryService } from '@/lib/services/summaryService';

interface SummaryPanelRightProps {
  conversation: Conversation;
  summary?: SessionSummary | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SummaryPanelRight({
  conversation,
  summary: propSummary,
  isOpen,
  onClose,
}: SummaryPanelRightProps) {
  // Use attached summary, or prop, or fallback
  const summary =
    propSummary ||
    conversation.summary || {
      id: 'default',
      conversationId: conversation.id,
      title: conversation.title,
      dateLabel: `Today · ${
        conversation.companionType === 'weekly'
          ? 'Weekly main therapist'
          : conversation.companionType === 'daily'
          ? 'Daily exercise therapist'
          : 'On-demand therapist'
      }`,
      whatWeExplored:
        "You explored feeling stretched between work and your own needs. Evening walks emerged as a familiar, restorative practice that you'd like to return to.",
      tags: ['Work-life balance', 'Self-care', 'Feeling overwhelmed'],
      carryWithYou: 'Make space for a ten-minute, phone-free walk.',
      createdAt: new Date().toISOString(),
    };

  const handleDownload = () => {
    summaryService.exportConversationTxt(conversation);
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 lg:w-88 shrink-0 h-full flex flex-col justify-between bg-white border-l border-slate-200/80 p-5 sm:p-6 overflow-y-auto select-none transition-all animate-in slide-in-from-right-4 duration-200">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Session summary</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close summary panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reflection Header */}
        <div className="mb-6">
          <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
            Your moment, reflected
          </span>
          <h3 className="text-2xl font-serif text-slate-900 tracking-tight leading-snug mb-1">
            {summary.title}
          </h3>
          <span className="text-xs text-slate-400">
            {summary.dateLabel}
          </span>
        </div>

        {/* Section: What we explored */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-slate-700 mb-2">
            What we explored
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {summary.whatWeExplored}
          </p>
        </div>

        {/* Section: Threads of your story */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-slate-700 mb-2.5">
            Threads of your story
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {summary.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50/80 text-[11px] font-medium text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Section: A little thing to carry with you */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-slate-700 mb-2.5">
            A little thing to carry with you
          </h4>
          <div className="rounded-2xl p-4 bg-[#EAF5EC] border border-[#D2EADA] flex items-start gap-2.5 text-slate-800">
            <div className="w-5 h-5 rounded-full bg-emerald-200/70 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Leaf className="w-3 h-3" />
            </div>
            <p className="text-xs font-medium text-slate-800 leading-relaxed">
              {summary.carryWithYou}
            </p>
          </div>
        </div>

        {/* Checked Demo Memory Note */}
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 mb-6">
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Included in your demo memory</span>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all active:scale-[0.99]"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Download conversation</span>
        </button>

        <p className="text-[10px] text-slate-400 text-center mt-3">
          Demo summary · Not a clinical assessment
        </p>
      </div>
    </aside>
  );
}
