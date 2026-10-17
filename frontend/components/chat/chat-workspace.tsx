'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
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
  Menu,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Trash2,
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { type Thread, simulatedReply, textMessage, useThreads } from '@/lib/demo-conversations';

export function ChatWorkspace({ threadId }: { threadId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { threads, ready, error, save, remove, reloadFromBackend, fetchThreadById } = useThreads();
  const [activeThread, setActiveThread] = useState<Thread | undefined>(() => threads.find((t) => t.id === threadId));
  const [fetchingSession, setFetchingSession] = useState(false);
  const [savingSession, setSavingSession] = useState(false);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState('');
  const [voice, setVoice] = useState('');
  const [query, setQuery] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [copied, setCopied] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    textarea.current?.focus();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const prevThreadIdRef = useRef<string | undefined>(threadId);

  useEffect(() => {
    // Only reset activeThread if user explicitly navigated to /dashboard from an existing thread
    if (prevThreadIdRef.current && !threadId) {
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
  }, [threadId, threads, fetchThreadById]);

  const thread = activeThread || threads.find((t) => t.id === threadId);
  const missing = ready && !fetchingSession && threadId && !thread;

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

    const currentThreadState: Thread = {
      id: currentThreadId,
      title: thread?.title ?? (value.length > 40 ? value.slice(0, 38) + '…' : value),
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

    // If starting a fresh conversation, update URL seamlessly and update ref
    if (isNew && typeof window !== 'undefined') {
      prevThreadIdRef.current = currentThreadId;
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

      const assistantMsg = textMessage(crypto.randomUUID(), 'assistant', replyContent);
      const finishedThreadState: Thread = {
        ...currentThreadState,
        messages: [...updatedMsgs, assistantMsg],
      };

      setActiveThread(finishedThreadState);
      save(finishedThreadState);
    } catch (err: any) {
      console.error('[ChatWorkspace send error]:', err);
      // Graceful fallback using simulated response if backend had transient failure
      const fallbackReply = simulatedReply(value);
      const assistantMsg = textMessage(crypto.randomUUID(), 'assistant', fallbackReply);
      const finishedThreadState: Thread = {
        ...currentThreadState,
        messages: [...updatedMsgs, assistantMsg],
      };
      setActiveThread(finishedThreadState);
      save(finishedThreadState);
    } finally {
      setPending('');
      setBusy(false);
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

      const finalized: Thread = {
        ...thread,
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
          asChild
          className="new-conversation"
          variant="outline"
          onClick={() => {
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
          }}
        >
          <Link href="/dashboard">
            <Plus size={15} />
            <span>New conversation</span>
          </Link>
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
              <div key={t.id} className={`chatgpt-thread-item ${threadId === t.id ? 'active' : ''}`}>
                <Link
                  href={`/dashboard/${t.id}`}
                  onClick={() => setHistoryOpen(false)}
                  className="chatgpt-thread-link"
                  title={t.title}
                >
                  <span className="chatgpt-thread-title">{t.title}</span>
                </Link>
                <button
                  className="chatgpt-delete-btn"
                  aria-label={`Delete ${t.title}`}
                  title="Delete conversation"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.confirm(`Delete "${t.title}"?`)) {
                      remove(t.id);
                      if (threadId === t.id) router.push('/dashboard');
                    }
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
            <span className="demo-label">Hope space</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle history"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <Menu />
            </Button>
          </div>
        </header>
        {fetchingSession ? (
          <div className="chat-empty">
            <span className="empty-mark">h.</span>
            <span className="section-eyebrow">RETRIEVING FROM DATABASE</span>
            <h1>Loading conversation…</h1>
            <p>Fetching session transcript and cognitive insights from your secure graph memory.</p>
          </div>
        ) : missing ? (
          <div className="chat-empty">
            <h1>This conversation isn&apos;t here.</h1>
            <p>It may have been deleted or saved in another browser.</p>
            <Button asChild>
              <Link href="/dashboard">Start a new conversation</Link>
            </Button>
          </div>
        ) : !thread && !busy ? (
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
              <div className="conversation-date">
                {thread?.date ?? 'Today'} · {thread?.agent ?? 'On-demand therapist'}
              </div>
              {thread?.messages.map((m) => (
                <Message key={m.id} from={m.role} className="transcript-message">
                  {m.role === 'assistant' && <span className="agent-mark">h.</span>}
                  <MessageContent>
                    {m.parts.map((part, i) =>
                      part.type === 'text' ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : null
                    )}
                    {m.role === 'assistant' && (
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
              ))}
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
          {thread && (
            <div className="session-controls">
              <span>
                <i />
                {savingSession
                  ? 'Extracting CBT insights & saving to FalkorDB…'
                  : thread.ended
                  ? 'Saved to PostgreSQL & FalkorDB graph memory'
                  : 'A moment just for you'}
              </span>
              <Button
                variant={thread.ended ? 'ghost' : 'outline'}
                size="sm"
                disabled={busy || savingSession || thread.ended}
                onClick={endAndSaveSession}
              >
                {savingSession ? (
                  <>
                    <Loader2 className="animate-spin mr-1" size={12} />
                    Reflecting & Saving…
                  </>
                ) : thread.ended ? (
                  <>
                    <Check />
                    Session saved
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 text-primary" size={12} />
                    End & save to graph memory
                  </>
                )}
              </Button>
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
            <div className="session-meta">
              {thread.date} · {thread.agent}
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
    </div>
  );
}
