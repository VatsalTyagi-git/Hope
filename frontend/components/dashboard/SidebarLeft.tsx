'use client';

import React from 'react';
import Link from 'next/link';
import {
  Plus,
  Calendar,
  Leaf,
  Search,
  MessageSquare,
  ChevronLeft,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react';
import { Conversation, CompanionType } from '@/lib/types';
import { authService } from '@/lib/services/authService';

interface SidebarLeftProps {
  conversations: Conversation[];
  activeId: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: (type?: CompanionType) => void;
  userName?: string;
  onLogout?: () => void;
  onCloseMobile?: () => void;
}

export function SidebarLeft({
  conversations,
  activeId,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onNewConversation,
  userName = 'You',
  onLogout,
  onCloseMobile,
}: SidebarLeftProps) {
  const avatarLetter = userName.charAt(0).toUpperCase() || 'Y';

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
      window.location.href = '/login';
    }
  };

  const getTimeLabel = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) return 'Today';
    if (hours < 48) return 'Yesterday';
    return 'Last week';
  };

  return (
    <aside className="w-72 lg:w-80 shrink-0 h-full flex flex-col justify-between bg-[#F7F9F7] border-r border-slate-200/80 text-slate-800 select-none">
      {/* Top Section */}
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
        {/* Mobile Close Button */}
        {onCloseMobile && (
          <div className="flex items-center justify-between lg:hidden mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Navigation
            </span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <h2 className="text-sm font-semibold text-slate-800 tracking-tight mb-4">
          Your conversations
        </h2>

        {/* New Conversation Button */}
        <button
          onClick={() => onNewConversation('on-demand')}
          className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white border border-slate-200/90 text-slate-800 text-xs font-medium shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5 text-slate-600" />
          <span>New conversation</span>
        </button>

        {/* Companion Quick Switch Cards -> Routes to Voice Agent */}
        <div className="space-y-2 mb-4">
          {/* Weekly Main Therapist */}
          <Link
            href="/voice?type=weekly"
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#EEF4FD] hover:bg-[#E4EEFC] border border-[#DCE7F7] text-slate-700 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-blue-100/90 text-blue-700 flex items-center justify-center shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-slate-800">
                Weekly main therapist
              </span>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              ↗
            </span>
          </Link>

          {/* Daily Exercise Therapist */}
          <Link
            href="/voice?type=daily"
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#EBF7EE] hover:bg-[#DFEFE3] border border-[#D7EBDC] text-slate-700 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0">
                <Leaf className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-slate-800">
                Daily exercise therapist
              </span>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              ↗
            </span>
          </Link>

          {/* On-Demand Companion */}
          <Link
            href="/voice?type=companion"
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#F5F0FF] hover:bg-[#EBE2FC] border border-[#E8DCFB] text-slate-700 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-purple-100/90 text-purple-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-slate-800">
                On-demand companion
              </span>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              ↗
            </span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative mb-5">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Find a moment..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 transition-all"
          />
        </div>

        {/* Section Header */}
        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-1 mb-2">
          Your recent moments
        </div>

        {/* Conversation List */}
        <div className="space-y-1.5">
          {conversations.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No conversations found.
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeId;
              const timeLabel = getTimeLabel(conv.updatedAt || conv.createdAt);

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all ${
                    isActive
                      ? 'bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
                      : 'hover:bg-slate-200/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <MessageSquare
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        isActive ? 'text-purple-600' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs truncate ${
                          isActive
                            ? 'font-semibold text-slate-900'
                            : 'font-normal text-slate-700'
                        }`}
                      >
                        {conv.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {timeLabel}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Pinned Section Matching Screenshot 3 */}
      <div className="p-4 sm:p-5 border-t border-slate-200/70 bg-[#F7F9F7] space-y-3.5 shrink-0">
        {/* Your story is connected banner */}
        <div className="flex items-start gap-2.5 text-left">
          <div className="w-5 h-5 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
            <Leaf className="w-3 h-3" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">
              Your story is connected
            </div>
            <div className="text-[11px] text-slate-500 leading-snug">
              A shared understanding across all three companions.
            </div>
          </div>
        </div>

        {/* Back to Hope link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Hope</span>
          </Link>
        </div>

        {/* User Pill Card */}
        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center shrink-0">
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-800 truncate">
                {userName}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Your personal demo space
              </div>
            </div>
          </div>

          <button
            onClick={handleLogoutClick}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
            aria-label="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
