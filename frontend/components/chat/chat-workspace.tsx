'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUp,
  AudioLines,
  CalendarDays,
  Check,
  ChevronLeft,
  Copy,
  Download,
  FileText,
  Leaf,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Brand } from '@/components/brand/hope-brand';
import { ThemeToggle } from '@/components/brand/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { type Thread, simulatedReply, textMessage, useThreads } from '@/lib/demo-conversations';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { CalendarModal } from '@/components/calendar/CalendarModal';
import { profileService } from '@/lib/services/profileService';

function isGreeting(text: string): boolean {
  return /^(hi|hello|hey|hey there|good morning|good afternoon|good evening|sup|yo|greetings|howdy|test)[.!?]?$/i.test(
    (text || '').trim()
  );
}

export function ChatWorkspace({ threadId }: { threadId?: string }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { threads, ready, error, save, remove, reloadFromBackend, fetchThreadById } = useThreads();
  const [activeThread, setActiveThread] = useState<Thread | undefined>(() => threads.find((t) => t.id === threadId));
  const [fetchingSession, setFetchingSession] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<Thread | null>(null);
  const [deletingThread, setDeletingThread] = useState(false);

  // Top-right hamburger user navigation dropdown
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // New user profile onboarding modal
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState('');
  const [voice, setVoice] = useState('');
  const [query, setQuery] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [copied, setCopied] = useState('');
  const [streamingReply, setStreamingReply] = useState<{
    id: string;
    text: string;
    isFinished: boolean;
  } | null>(null);
  const streamingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    textarea.current?.focus();
    if (reloadFromBackend) {
      reloadFromBackend().catch(() => {});
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);
    };
  }, [reloadFromBackend]);

  // Click outside listener for top-right user menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Check if active user needs onboarding pop-up
  useEffect(() => {
    let isMounted = true;
    const checkOnboarding = async () => {
      const isCompleteLocal = profileService.isOnboardingComplete();
      if (!isCompleteLocal) {
        try {
          if (user?.id) {
            const remote = await profileService.fetchRemoteProfile(user.id);
            if (isMounted && !remote?.onboardingComplete) {
              setShowOnboarding(true);
            }
          } else {
            if (isMounted) setShowOnboarding(true);
          }
        } catch {
          if (isMounted) setShowOnboarding(true);
        }
      }
    };
    checkOnboarding();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const prevThreadIdRef = useRef<string | undefined>(threadId);

  useEffect(() => {
    // Only reset activeThread if user explicitly navigated from a thread route to /dashboard
    if (prevThreadIdRef.current !== undefined && threadId === undefined && prevThreadIdRef.current !== '') {
      setActiveThread(undefined);
    }
    prevThreadIdRef.current = threadId;

    if (!threadId) {
      return;
    }

    const local = threads.find((t) => t.id === threadId);
    if (local && local.messages.length > 0) {
      setActiveThread(local);
      setSummaryOpen(true);
    } else if (fetchThreadById) {
      setFetchingSession(true);
      fetchThreadById(threadId)
        .then((fetched) => {
          if (fetched) {
            setActiveThread(fetched);
            setSummaryOpen(true);
          }
        })
        .finally(() => setFetchingSession(false));
    }
  }, [threadId, fetchThreadById]);

  const thread = activeThread || (threadId ? threads.find((t) => t.id === threadId) : undefined);
  const missing = ready && !fetchingSession && threadId && !thread;

  // Optimistic display messages: always display the user's message immediately upon send
  const threadMessages = thread?.messages ?? [];
  const optimisticUserMessage =
    pending && !threadMessages.some((m) => m.parts.some((p) => p.type === 'text' && p.text.trim() === pending.trim()))
      ? [textMessage('temp-optimistic-user-msg', 'user', pending)]
      : [];
  const optimisticStreamingMessage =
    streamingReply && !threadMessages.some((m) => m.id === streamingReply.id)
      ? [textMessage(streamingReply.id, 'assistant', streamingReply.text)]
      : [];
  const displayMessages = [...threadMessages, ...optimisticUserMessage, ...optimisticStreamingMessage];

  const streamAssistantMessage = (
    msgId: string,
    fullText: string,
    baseThreadState: Thread,
    baseMsgs: ReturnType<typeof textMessage>[]
  ): Promise<void> => {
    return new Promise((resolve) => {
      let charIndex = 0;
      const totalLen = fullText.length;
      // High-speed streaming animation:
      // High frequency updates (12ms) with adaptive 4-7 character chunks finishes in ~600-800ms
      const chunk = Math.max(3, Math.ceil(totalLen / 45));
      const stepInterval = 12;

      setStreamingReply({
        id: msgId,
        text: '',
        isFinished: false,
      });

      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }

      streamingIntervalRef.current = setInterval(() => {
        charIndex = Math.min(charIndex + chunk, totalLen);
        const streamedSlice = fullText.slice(0, charIndex);

        setStreamingReply({
          id: msgId,
          text: streamedSlice,
          isFinished: charIndex >= totalLen,
        });

        if (charIndex >= totalLen) {
          if (streamingIntervalRef.current) {
            clearInterval(streamingIntervalRef.current);
            streamingIntervalRef.current = null;
          }
          setStreamingReply(null);

          const finalAssistantMsg = textMessage(msgId, 'assistant', fullText);
          const finishedThreadState: Thread = {
            ...baseThreadState,
            messages: [...baseMsgs, finalAssistantMsg],
          };
          setActiveThread(finishedThreadState);
          save(finishedThreadState);
          resolve();
        }
      }, stepInterval);
    });
  };

  const startNewConversation = () => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    setStreamingReply(null);
    // If active conversation had messages and wasn't finalized, finalize it in the background
    if (thread && !thread.ended && thread.messages.length > 0) {
      fetch('/api/sessions/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: thread.id,
          userId: user?.id || '0ccbaecf-43fd-4b7f-91e0-d32233482b07',
        }),
      }).catch(() => {});
    }

    setActiveThread(undefined);
    setInput('');
    setPending('');
    setBusy(false);
    setHistoryOpen(false);
    prevThreadIdRef.current = undefined;

    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/dashboard');
    }
    router.push('/dashboard');

    setTimeout(() => {
      textarea.current?.focus();
    }, 50);
  };

  const handleConfirmDelete = async () => {
    if (!threadToDelete) return;
    setDeletingThread(true);
    try {
      const targetId = threadToDelete.id;
      await remove(targetId);
      if (thread?.id === targetId || threadId === targetId) {
        startNewConversation();
      }
    } catch (err) {
      console.error('Delete conversation error:', err);
    } finally {
      setDeletingThread(false);
      setThreadToDelete(null);
    }
  };

  async function send(text?: string) {
    const rawVal = (typeof text === 'string' && text.trim()) ? text : input;
    const value = rawVal.trim();
    if (!value || busy || missing) return;

    setInput('');
    setPending(value);
    setBusy(true);
    textarea.current?.focus();

    const currentThreadId = thread?.id ?? crypto.randomUUID();
    const isNew = !thread;

    // Resolve current user ID (Elena Rostova default)
    let currentUserId = user?.id || '0ccbaecf-43fd-4b7f-91e0-d32233482b07';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hope_current_user');
      if (stored) {
        try {
          currentUserId = JSON.parse(stored)?.id || currentUserId;
        } catch {}
      }
      if (!currentUserId) {
        const cookieMatch = document.cookie.match(/(^| )cbt_patient_id=([^;]+)/);
        if (cookieMatch) currentUserId = decodeURIComponent(cookieMatch[2]);
      }
    }

    // Build optimistic user message and conversation state
    const userMsg = textMessage(crypto.randomUUID(), 'user', value);
    const existingMsgs = thread?.messages ?? [];
    const updatedMsgs = [...existingMsgs, userMsg];

    // Derive an intelligent objective title:
    // If the thread title is generic, a greeting, or placeholder, update it once user sends a substantive message.
    let resolvedTitle: string = thread?.title || 'Mindful Reflection';
    const isTitleGeneric =
      !thread?.title ||
      isGreeting(thread.title) ||
      thread.title === 'Mindful Reflection' ||
      thread.title === 'New conversation' ||
      thread.title === 'CBT Session';

    if (isTitleGeneric) {
      if (!isGreeting(value)) {
        let clean = value.trim()
          .replace(/^(i'm feeling|i feel like|i am feeling|can we talk about|i want to talk about|i need help with|feeling)\s+/i, '');
        clean = clean.charAt(0).toUpperCase() + clean.slice(1);
        resolvedTitle = clean.length > 38 ? clean.slice(0, 35) + '…' : clean;
      } else {
        resolvedTitle = 'Mindful Reflection';
      }
    }

    const currentThreadState: Thread = {
      id: currentThreadId,
      title: resolvedTitle,
      date: thread?.date ?? 'Today',
      agent: thread?.agent ?? 'On-demand therapist',
      messages: updatedMsgs,
      summary: thread?.summary ?? 'Session in progress…',
      themes: thread?.themes ?? ['On-Demand Companion', 'CBT Support'],
      takeaway: thread?.takeaway ?? 'Taking a mindful pause for yourself.',
      ended: false,
    };

    setActiveThread(currentThreadState);
    save(currentThreadState);

    // If starting a fresh conversation, update URL seamlessly
    if (isNew && typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/dashboard/${currentThreadId}`);
    }

    // Prepare message turns for backend AI companion
    const historyPayload = updatedMsgs.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p.type === 'text' ? p.text : ''))
        .join('\n'),
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentThreadId,
          messages: historyPayload,
          userId: currentUserId,
          mode: 'ON_DEMAND',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      const replyContent =
        data.message?.content ||
        "I'm right here with you. Take a slow breath. What feels heaviest for you right now?";

      // Clear busy shimmer so the assistant bubble smoothly transitions into live fast streaming
      setBusy(false);
      setPending('');

      const assistantMsgId = crypto.randomUUID();
      await streamAssistantMessage(assistantMsgId, replyContent, currentThreadState, updatedMsgs);
    } catch (err: any) {
      console.error('[ChatWorkspace send error]:', err);
      // Graceful fallback using simulated response if backend had transient failure
      const fallbackReply = simulatedReply(value);
      setBusy(false);
      setPending('');
      const assistantMsgId = crypto.randomUUID();
      await streamAssistantMessage(assistantMsgId, fallbackReply, currentThreadState, updatedMsgs);
    } finally {
      setBusy(false);
      setPending('');
      textarea.current?.focus();
    }
  }

  async function endAndSaveSession() {
    if (!thread || savingSession || thread.messages.length === 0 || thread.ended) return;

    setSavingSession(true);

    let currentUserId = user?.id || '0ccbaecf-43fd-4b7f-91e0-d32233482b07';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hope_current_user');
      if (stored) {
        try {
          currentUserId = JSON.parse(stored)?.id || currentUserId;
        } catch {}
      }
      if (!currentUserId) {
        const cookieMatch = document.cookie.match(/(^| )cbt_patient_id=([^;]+)/);
        if (cookieMatch) currentUserId = decodeURIComponent(cookieMatch[2]);
      }
    }

    const transcript = thread.messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p.type === 'text' ? p.text : ''))
        .join('\n'),
    }));

    try {
      // 1. First attempt quick finalization of the already persisted session
      let data: any = null;
      try {
        const finRes = await fetch('/api/sessions/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: thread.id,
            userId: currentUserId,
          }),
        });
        if (finRes.ok) {
          data = await finRes.json();
        }
      } catch (finErr) {
        console.warn('[Finalize Note]:', finErr);
      }

      // 2. If finalize didn't return data, fallback to raw transcript endpoint
      if (!data || !data.success) {
        const res = await fetch('/api/sessions/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: `ondemand_chat_${thread.id}`,
            userId: currentUserId,
            startedAt: new Date(Date.now() - Math.max(thread.messages.length * 45000, 60000)).toISOString(),
            endedAt: new Date().toISOString(),
            transcript,
            mode: 'ON_DEMAND',
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to save session (${res.status})`);
        }
        data = await res.json();
      }
      const ext = data.extractedData || {};
      const ep = ext.episodes?.[0] || {};

      const summary =
        data.summary ||
        ext.summary ||
        thread.summary ||
        'Session completed and reflected. Automatic thoughts explored with cognitive restructuring.';
      const themes = ep.distortion
        ? [ep.distortion, ep.trigger?.category || 'Stress Regulation', 'Cognitive Restructuring']
        : ext.themes && ext.themes.length > 0
        ? ext.themes
        : ['On-Demand Chat', 'Cognitive Restructuring', 'Self-Compassion'];
      const takeaway =
        ep.reframed_thought ||
        ext.homework?.exercise_name ||
        ext.takeaway ||
        thread.takeaway ||
        'Notice automatic thoughts and give yourself permission to step back.';

      const objectiveTitle =
        ext.title ||
        data.title ||
        (thread.title && !isGreeting(thread.title) && thread.title !== 'Mindful Reflection' ? thread.title : undefined);

      const finalized: Thread = {
        ...thread,
        title: objectiveTitle || thread.title,
        ended: true,
        summary,
        themes,
        takeaway,
      };

      setActiveThread(finalized);
      save(finalized);
      if (reloadFromBackend) {
        await reloadFromBackend();
      }
      setSummaryOpen(true);
    } catch (err: any) {
      console.error('[ChatWorkspace endAndSaveSession error]:', err);
      const fallbackFinal: Thread = {
        ...thread,
        ended: true,
      };
      setActiveThread(fallbackFinal);
      save(fallbackFinal);
      setSummaryOpen(true);
    } finally {
      setSavingSession(false);
    }
  }

  function download() {
    if (!thread) return;
    const content = `${thread.title}\n\nSUMMARY\n${thread.summary}\n\nTRANSCRIPT\n${thread.messages
      .map(
        (m) =>
          `${m.role.toUpperCase()}: ${m.parts
            .filter((p) => p.type === 'text')
            .map((p) => (p.type === 'text' ? p.text : ''))
            .join('\n')}`
      )
      .join('\n\n')}`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${thread.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const userName = user?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
  const userInitial = userName.charAt(0).toUpperCase() || 'Y';

  return (
    <div className={`workspace ${thread && summaryOpen ? 'has-summary' : ''}`}>
      <aside className={`history-panel ${historyOpen ? 'history-open' : ''}`}>
        <div className="panel-heading">
          <Brand compact />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close history"
            className="history-mobile-close"
            onClick={() => setHistoryOpen(false)}
          >
            <X size={16} />
          </Button>
        </div>
        <Button
          type="button"
          className="new-conversation"
          variant="outline"
          onClick={startNewConversation}
        >
          <Plus size={15} />
          <span>New conversation</span>
        </Button>
        <div className="voice-companions-bar">
          <Link href="/voice?therapist=Weekly%20main%20therapist" className="voice-chip" title="Weekly main therapist">
            <CalendarDays size={12} />
            <span>Weekly</span>
          </Link>
          <Link href="/voice?therapist=Daily%20exercise%20therapist" className="voice-chip" title="Daily exercise therapist">
            <Leaf size={12} />
            <span>Daily</span>
          </Link>
          <Link href="/voice?therapist=On-demand%20therapist" className="voice-chip" title="On-demand companion">
            <AudioLines size={12} />
            <span>On-Demand</span>
          </Link>
        </div>
        <div className="history-search">
          <Search size={13} />
          <input
            aria-label="Search conversations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recents…"
          />
        </div>
        <div className="sidebar-section-title">Recents</div>
        <div className="thread-list">
          {threads
            .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
            .map((t) => (
              <div key={t.id} className={`chatgpt-thread-item ${thread?.id === t.id || threadId === t.id ? 'active' : ''}`}>
                <Link
                  href={`/dashboard/${t.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setHistoryOpen(false);
                    if (thread && thread.id !== t.id && !thread.ended && thread.messages.length > 0) {
                      fetch('/api/sessions/finalize', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          sessionId: thread.id,
                          userId: user?.id || '0ccbaecf-43fd-4b7f-91e0-d32233482b07',
                        }),
                      }).catch(() => {});
                    }
                    setActiveThread(t);
                    setSummaryOpen(true);
                    if (typeof window !== 'undefined') {
                      window.history.pushState(null, '', `/dashboard/${t.id}`);
                    }
                    router.push(`/dashboard/${t.id}`);
                  }}
                  className="chatgpt-thread-link"
                  title={`${t.title} (${t.isVoice ? 'Voice Agent session' : 'Chatbot session'})`}
                >
                  <span className={`chatgpt-thread-icon ${t.isVoice ? 'is-voice' : ''}`}>
                    {t.isVoice ? <AudioLines size={13} /> : <MessageSquare size={13} />}
                  </span>
                  <span className="chatgpt-thread-title">{t.title}</span>
                  {t.isVoice && <span className="voice-badge-pill">Voice</span>}
                </Link>
                <button
                  type="button"
                  className="chatgpt-delete-btn"
                  aria-label={`Delete ${t.title}`}
                  title="Delete conversation"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setThreadToDelete(t);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          {threads.filter((t) => t.title.toLowerCase().includes(query.toLowerCase())).length === 0 && (
            <p className="history-empty">No conversations yet</p>
          )}
        </div>
        <div className="history-bottom">
          <div className="demo-account">
            <span>{userInitial}</span>
            <div>
              <strong>{userName}</strong>
              <small>{user ? 'Your secure space' : 'Your personal space'}</small>
            </div>
            <button
              type="button"
              className="chatgpt-logout-btn"
              title="Sign out"
              aria-label="Sign out"
              disabled={loggingOut}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (loggingOut) return;
                setLoggingOut(true);
                await signOut();
              }}
            >
              {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            </button>
          </div>
        </div>
      </aside>
      {(historyOpen || (thread && summaryOpen)) && (
        <div
          className={`panel-backdrop ${historyOpen ? 'backdrop-history' : 'backdrop-summary'}`}
          onClick={() => {
            setHistoryOpen(false);
            setSummaryOpen(false);
          }}
        />
      )}
      <main className="chat-main">
        <header className="chat-header">
          <div className="chat-header-start">
            <Brand compact />
            <span className="chat-header-divider" />
            <span>Your quiet space</span>
          </div>
          <div className="chat-header-tools">
            <ThemeToggle />
            {thread && !summaryOpen && (
              <Button
                variant="ghost"
                size="icon"
                title="Session summary"
                aria-label="Open summary"
                onClick={() => setSummaryOpen(true)}
              >
                <FileText />
              </Button>
            )}
            {/* User Hamburger Dropdown Menu (Contains Profile & Logout) */}
            <div className="user-menu-container" ref={userMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`transition-colors ${userMenuOpen ? 'bg-white/10 text-white shadow-sm' : ''}`}
                title="User menu"
              >
                <Menu />
              </Button>

              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div className="user-menu-header-top">
                      <div className="user-menu-avatar">{userInitial}</div>
                      <div className="overflow-hidden">
                        <div className="user-menu-user-name">{userName}</div>
                        <div className="user-menu-user-email">
                          {user?.email || 'Personal therapeutic space'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/profile"
                    className="user-menu-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserIcon size={14} className="text-purple-400" />
                    <span>Profile & Preferences</span>
                  </Link>

                  <button
                    type="button"
                    className="user-menu-item"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setCalendarOpen(true);
                    }}
                  >
                    <CalendarDays size={14} className="text-purple-400" />
                    <span>Calendar & Schedule</span>
                  </button>

                  <div className="user-menu-divider" />

                  <button
                    type="button"
                    className="user-menu-item logout"
                    disabled={loggingOut}
                    onClick={async () => {
                      setUserMenuOpen(false);
                      setLoggingOut(true);
                      await signOut();
                    }}
                  >
                    {loggingOut ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <LogOut size={14} />
                    )}
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {fetchingSession ? (
          <div className="chat-empty">
            <span className="empty-mark">h.</span>
            <span className="section-eyebrow">REFLECTIONS</span>
            <h1>Loading conversation…</h1>
            <p>Bringing back your notes and conversation insights.</p>
          </div>
        ) : missing ? (
          <div className="chat-empty">
            <h1>This conversation isn&apos;t here.</h1>
            <p>It may have been deleted or saved in another browser.</p>
            <Button type="button" onClick={startNewConversation}>
              Start a new conversation
            </Button>
          </div>
        ) : !thread && !busy && displayMessages.length === 0 ? (
          <div className="chat-empty">
            <span className="empty-mark">h.</span>
            <span className="section-eyebrow">TAKE A BREATH. YOU&apos;RE HERE.</span>
            <h1>What&apos;s on your mind?</h1>
            <p>
              You don’t need the right words.
              <br />
              Just start wherever you are.
            </p>
            <div className="starter-prompts">
              {[
                "I'm feeling a little overwhelmed",
                "I'd like a moment of calm",
                'I just need someone to listen',
              ].map((p) => (
                <Button
                  variant="outline"
                  key={p}
                  onClick={() => {
                    send(p);
                  }}
                >
                  <MessageSquare />
                  {p}
                </Button>
              ))}
            </div>
            <span className="context-note">
              <Leaf size={12} /> A fresh moment, with your story in mind.
            </span>
          </div>
        ) : (
          <Conversation className="chat-conversation">
            <ConversationContent className="chat-transcript">
              <div className="conversation-date flex items-center justify-center gap-2">
                {thread?.isVoice && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <AudioLines size={11} /> Voice Agent Session
                  </span>
                )}
                <span>
                  {thread?.date ?? 'Today'} · {thread?.agent ?? 'On-demand therapist'}
                </span>
              </div>
              {displayMessages.map((m) => {
                const isThisStreaming = Boolean(
                  streamingReply && streamingReply.id === m.id && !streamingReply.isFinished
                );
                return (
                  <Message key={m.id} from={m.role} className="transcript-message">
                    {m.role === 'assistant' && <span className="agent-mark">h.</span>}
                    <MessageContent>
                      {m.parts.map((part, i) =>
                        part.type === 'text' ? (
                          <div key={i} className="inline">
                            <MessageResponse
                              mode={isThisStreaming ? 'streaming' : 'static'}
                              isAnimating={isThisStreaming}
                            >
                              {part.text}
                            </MessageResponse>
                            {isThisStreaming && <span className="streaming-cursor" aria-hidden="true" />}
                          </div>
                        ) : null
                      )}
                      {m.role === 'assistant' && !isThisStreaming && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="message-copy"
                          aria-label="Copy response"
                          title="Copy response"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                m.parts
                                  .filter((p) => p.type === 'text')
                                  .map((p) => (p.type === 'text' ? p.text : ''))
                                  .join('')
                              );
                              setCopied(m.id);
                            } catch {
                              setCopied('');
                            }
                          }}
                        >
                          {copied === m.id ? <Check /> : <Copy />}
                        </Button>
                      )}
                    </MessageContent>
                  </Message>
                );
              })}
              {busy && (
                <Message from="assistant" className="transcript-message">
                  <span className="agent-mark">h.</span>
                  <MessageContent>
                    <Shimmer>Taking a moment…</Shimmer>
                  </MessageContent>
                </Message>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}
        <div className="composer-wrap">
          {error && <p className="storage-error">{error}</p>}
          {savingSession && (
            <div className="session-controls">
              <span>
                <Loader2 className="animate-spin mr-1" size={12} />
                Saving insights & reflection notes…
              </span>
            </div>
          )}
          <PromptInput onSubmit={(msg) => send(msg?.text || input)} className="chat-composer">
            <PromptInputTextarea
              name="message"
              ref={textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Your message"
              placeholder="Share what's on your mind…"
              disabled={Boolean(missing) || !ready}
            />
            <PromptInputFooter>
              <span className="composer-agent">Hope · Here for you</span>
              <div className="composer-actions">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  title="Talk to your on-demand therapist with LiveKit voice"
                  aria-label="On-demand voice therapist"
                >
                  <Link href="/voice?therapist=On-demand%20therapist">
                    <AudioLines />
                  </Link>
                </Button>
                <PromptInputSubmit
                  aria-label="Send message"
                  className="rounded-full"
                  status={busy ? 'submitted' : 'ready'}
                  disabled={busy || !input.trim() || !ready}
                >
                  <ArrowUp />
                </PromptInputSubmit>
              </div>
            </PromptInputFooter>
          </PromptInput>
          <p className="chat-safety">AI-guided support, not professional or emergency care.</p>
        </div>
      </main>
      <aside className={`summary-panel ${thread && summaryOpen ? 'summary-visible' : ''}`}>
        <div className="panel-heading">
          <span>
            <FileText size={15} /> Session summary
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close summary"
            onClick={() => setSummaryOpen(false)}
          >
            <X />
          </Button>
        </div>
        {thread && (
          <>
            <span className="section-eyebrow">YOUR MOMENT, REFLECTED</span>
            <h2>{thread.title}</h2>
            <div className="session-meta flex items-center gap-1.5 flex-wrap">
              {thread.isVoice && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <AudioLines size={11} /> Voice Agent
                </span>
              )}
              <span>{thread.date} · {thread.agent}</span>
            </div>
            <h3>What we explored</h3>
            <p>{thread.summary}</p>
            <h3>Threads of your story</h3>
            <div className="theme-tags">
              {thread.themes.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <h3>A little thing to carry with you</h3>
            <div className="takeaway">
              <Leaf size={17} />
              <p>{thread.takeaway}</p>
            </div>
            <div className="memory-status">
              <Check size={14} />
              <span>Included in your shared memory</span>
            </div>
            <Button variant="outline" className="download-button" onClick={download}>
              <Download /> Download conversation
            </Button>
            <small className="summary-disclaimer">Summary · Not a clinical assessment</small>
          </>
        )}
      </aside>
      <Dialog
        open={Boolean(voice)}
        onOpenChange={(open) => {
          if (!open) setVoice('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <span className="voice-dialog-icon">
              <AudioLines />
            </span>
            <DialogTitle>{voice}</DialogTitle>
            <DialogDescription>
              Connect to your live session with {voice} using the LiveKit voice agent.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild>
              <Link href={`/voice?therapist=${encodeURIComponent(voice)}`}>
                Start LiveKit Voice Session
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => setVoice('')}>
              Continue in chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(threadToDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingThread) setThreadToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-6">
          <DialogHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
              Delete Conversation?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 text-left">
              <span className="block">
                Are you sure you want to delete{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                  "{threadToDelete?.title}"
                </strong>
                ? This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deletingThread}
              onClick={() => setThreadToDelete(null)}
              className="rounded-xl border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deletingThread}
              onClick={handleConfirmDelete}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 flex items-center gap-2"
            >
              {deletingThread ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deleting…</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New User Profile Onboarding Pop-up Modal */}
      {showOnboarding && (
        <OnboardingModal
          userId={user?.id}
          initialName={user?.name}
          initialEmail={user?.email}
          onComplete={(_p, action) => {
            setShowOnboarding(false);
            if (action === 'weekly') {
              router.push('/voice?mode=weekly');
            }
          }}
        />
      )}

      {/* Calendar & Exercises Pop-up Modal */}
      <CalendarModal
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
      />
    </div>
  );
}
