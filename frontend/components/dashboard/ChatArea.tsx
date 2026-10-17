'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Copy,
  Check,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Conversation, CompanionType } from '@/lib/types';
import { Composer } from './Composer';

interface ChatAreaProps {
  conversation: Conversation;
  onSendMessage: (text: string) => void;
  onEndSession: () => void;
  isTyping: boolean;
  onOpenMobileSidebar: () => void;
  onToggleSummary: () => void;
  isSummaryOpen: boolean;
  onOpenCrisis: () => void;
}

export function ChatArea({
  conversation,
  onSendMessage,
  onEndSession,
  isTyping,
  onOpenMobileSidebar,
  onToggleSummary,
  isSummaryOpen,
  onOpenCrisis,
}: ChatAreaProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [conversation.messages.length, isTyping]);

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const getCompanionLabel = (type: CompanionType) => {
    switch (type) {
      case 'weekly':
        return 'Weekly main therapist';
      case 'daily':
        return 'Daily exercise therapist';
      default:
        return 'On-demand therapist';
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col justify-between bg-white overflow-hidden relative">
      {/* Top Header */}
      <header className="h-14 shrink-0 px-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={onOpenMobileSidebar}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Hope Wordmark & Subtitle */}
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-serif text-slate-900 tracking-tight">
              hope.
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Your quiet space
            </span>
          </div>
        </div>

        {/* Right Header Badges and Actions */}
        <div className="flex items-center gap-2.5">
          {/* Need Urgent Help? Crisis Trigger */}
          <button
            onClick={onOpenCrisis}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50/80 hover:bg-rose-100/70 border border-rose-200/60 px-2.5 py-1 rounded-full transition-all"
          >
            <AlertCircle className="w-3 h-3" />
            <span className="hidden xs:inline">Need urgent help?</span>
          </button>

          {/* Demo Space Pill */}
          <span className="px-3 py-1 rounded-full border border-slate-200 bg-slate-50/60 text-slate-600 text-xs font-normal">
            Demo space
          </span>

          {/* Toggle Summary Button (when panel is closed) */}
          {!isSummaryOpen && (
            <button
              onClick={onToggleSummary}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Show session summary"
              aria-label="Show session summary"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Companion Subtitle in middle of chat matching Screenshot 3 */}
        <div className="text-center">
          <span className="text-xs text-slate-400 select-none">
            Today · {getCompanionLabel(conversation.companionType)}
          </span>
        </div>

        {/* Message Bubbles */}
        {conversation.messages.map((msg) => {
          const isUser = msg.role === 'user';

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end animate-in fade-in duration-200">
                <div className="bg-[#EFF3F6] text-slate-800 text-sm px-4.5 py-3 rounded-2xl max-w-[85%] sm:max-w-[70%] leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {msg.content}
                </div>
              </div>
            );
          }

          // Companion message
          const isCopied = copiedId === msg.id;

          return (
            <div key={msg.id} className="flex items-start gap-3 max-w-[90%] sm:max-w-[80%] animate-in fade-in duration-200">
              {/* Hope Avatar 'h.' */}
              <div className="w-7 h-7 rounded-full bg-[#EAE8FC] text-[#5244E3] flex items-center justify-center font-serif italic text-xs font-semibold shrink-0 mt-0.5 select-none shadow-2xs">
                h.
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {msg.content}
                </div>

                {/* Copy Button */}
                <button
                  onClick={() => handleCopy(msg.content, msg.id)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                  title="Copy response"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start gap-3 animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-full bg-[#EAE8FC] text-[#5244E3] flex items-center justify-center font-serif italic text-xs font-semibold shrink-0 mt-0.5 select-none">
              h.
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-2.5 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Invisible anchor to scroll down */}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Composer Section */}
      <div className="shrink-0 bg-white border-t border-slate-100/80">
        <Composer
          onSendMessage={onSendMessage}
          onEndSession={onEndSession}
          disabled={isTyping}
        />
      </div>
    </div>
  );
}
