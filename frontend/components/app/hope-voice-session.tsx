'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AudioLines,
  Check,
  ChevronLeft,
  Copy,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useAgent,
  useChat,
  useLocalParticipant,
  useSessionContext,
  useSessionMessages,
  useVoiceAssistant,
} from '@livekit/components-react';
import { ThemeToggle } from '@/components/brand/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

interface HopeVoiceSessionProps {
  therapistTitle?: string;
  className?: string;
}

export const HopeVoiceSession = React.forwardRef<
  HTMLDivElement,
  HopeVoiceSessionProps & React.ComponentProps<'div'>
>(({ therapistTitle, className, ...props }, ref) => {
  const router = useRouter();
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const agent = useAgent();
  const voiceAssistant = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const { send } = useChat();

  const [inputMessage, setInputMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [connectTimeout, setConnectTimeout] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [endingCall, setEndingCall] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session.isConnected) {
      setConnectTimeout(false);
      return;
    }
    const t = setTimeout(() => {
      if (!session.isConnected) setConnectTimeout(true);
    }, 12000);
    return () => clearTimeout(t);
  }, [session.isConnected]);

  const handleReconnect = async () => {
    setReconnecting(true);
    setConnectTimeout(false);
    try {
      if (typeof session.end === 'function') {
        await session.end().catch(() => {});
      }
      if (typeof session.start === 'function') {
        await session.start();
      }
    } catch (e) {
      console.error('Reconnect error:', e);
      setConnectTimeout(true);
    } finally {
      setReconnecting(false);
    }
  };

  // Microhpone state
  const isMicEnabled = localParticipant?.isMicrophoneEnabled ?? true;

  const toggleMic = async () => {
    try {
      await localParticipant?.setMicrophoneEnabled(!isMicEnabled);
    } catch (err) {
      console.error('Failed to toggle microphone', err);
    }
  };

  const handleEndCall = async () => {
    if (endingCall) return;
    setEndingCall(true);

    try {
      // 1. Resolve current user identity and session mode
      let currentUserId = '0ccbaecf-43fd-4b7f-91e0-d32233482b07';
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

      const rawTherapist = (therapistTitle || '').toLowerCase();
      const sessionMode = rawTherapist.includes('daily')
        ? 'DAILY'
        : rawTherapist.includes('demand') || rawTherapist.includes('companion')
        ? 'ON_DEMAND'
        : 'WEEKLY';

      const currentRoomName = session.room?.name || `therapy_${currentUserId}_${sessionMode.toLowerCase()}_${Date.now()}`;

      // 2. Capture live voice turns from session messages
      const liveTurns = (messages || [])
        .filter((m) => m && m.message && m.message.trim().length > 0)
        .map((m) => ({
          role: m.from?.isLocal ? 'user' : 'assistant',
          content: m.message.trim(),
          createdAt: new Date(m.timestamp).toISOString(),
        }));

      // 3. Save transcript to backend database so it immediately appears in conversation history
      if (liveTurns.length > 0) {
        try {
          await fetch('/api/sessions/transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomName: currentRoomName,
              userId: currentUserId,
              startedAt: new Date(messages[0]?.timestamp || Date.now() - 60000).toISOString(),
              endedAt: new Date().toISOString(),
              transcript: liveTurns,
              mode: sessionMode,
            }),
          });
        } catch (saveErr) {
          console.warn('[End Call Voice Transcript Note]:', saveErr);
        }
      }

      // 4. Invalidate local storage cache and notify sidebar listeners to reload
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hope-conversations-v2');
        window.dispatchEvent(new Event('hope-session-updated'));
      }

      // 5. Gracefully stop all local tracks and mute microphone first so PublishTrackError is never raised
      if (localParticipant) {
        try {
          for (const pub of localParticipant.trackPublications.values()) {
            if (pub.track) {
              try {
                pub.track.stop();
              } catch {}
            }
          }
          await localParticipant.setMicrophoneEnabled(false).catch(() => {});
        } catch {}
      }

      // 6. Disconnect the LiveKit session cleanly
      if (typeof session.end === 'function') {
        await session.end().catch(() => {});
      }
    } catch (err) {
      console.warn('[End Call Disconnect Notice]:', err);
    } finally {
      // 7. Smoothly navigate back to dashboard
      router.replace('/dashboard');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;
    setInputMessage('');
    try {
      await send(text);
    } catch (err) {
      console.error('Failed to send text message', err);
    }
    inputRef.current?.focus();
  };

  // Agent dynamic state: 'listening' | 'speaking' | 'thinking' | 'idle'
  const agentState = voiceAssistant.state || agent.state || 'idle';
  const isListening = agentState === 'listening';
  const isSpeaking = agentState === 'speaking';
  const isThinking = agentState === 'thinking';

  // Auto-scroll transcript when new messages arrive
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, agentState]);

  const copyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  const companionName = therapistTitle || 'On-demand therapist';

  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        'bg-background text-foreground relative flex h-screen w-full flex-col overflow-hidden',
        className
      )}
    >
      {/* Ambient background glows matching Hope's purple theme */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--glow, oklch(0.72 0.17 295)) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-35 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--glow, oklch(0.72 0.17 295)) 0%, transparent 70%)',
        }}
      />

      {/* Top Header - Matches Hope's Chat Workspace Header */}
      <header className="border-border/60 bg-background/80 relative z-20 flex h-16 w-full shrink-0 items-center justify-between border-b px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="group text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
            title="Back to text conversations"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to Hope</span>
          </Link>
          <span className="text-border">|</span>
          <Link
            href="/"
            className="hope-brand text-foreground font-serif text-2xl font-normal tracking-tight"
          >
            hope<span className="text-primary">.</span>
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2">
            <span className="text-foreground text-xs font-medium tracking-tight sm:text-sm">
              {companionName}
            </span>
            {session.isConnected ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live Voice
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                <Loader2 className="size-2.5 animate-spin text-amber-500" />
                Connecting…
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Button
            size="sm"
            variant="destructive"
            onClick={handleEndCall}
            disabled={endingCall}
            className="h-8 gap-1.5 rounded-full px-3 text-xs font-medium shadow-xs cursor-pointer"
          >
            {endingCall ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span className="hidden sm:inline">Ending…</span>
              </>
            ) : (
              <>
                <PhoneOff className="size-3.5" />
                <span className="hidden sm:inline">End session</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content Area: Circular Voice Agent Orb + Direct Chat Transcript */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Top: Animated Circular Voice Agent Orb */}
        <section className="border-border/40 from-background/40 to-secondary/20 relative flex shrink-0 flex-col items-center justify-center border-b bg-gradient-to-b pt-4 pb-3 sm:pt-6 sm:pb-4">
          <div className="relative flex items-center justify-center">
            {/* Animated outer ripple waves radiating outwards when listening */}
            {isListening && (
              <>
                <span
                  className="animate-ripple-1 border-primary/40 bg-primary/10 absolute inset-0 rounded-full border-2"
                  aria-hidden="true"
                />
                <span
                  className="animate-ripple-2 border-primary/30 bg-primary/5 absolute inset-0 rounded-full border"
                  aria-hidden="true"
                />
              </>
            )}

            {/* Pulsing ring when speaking */}
            {isSpeaking && (
              <span
                className="border-primary/50 absolute -inset-2.5 animate-pulse rounded-full border-2 opacity-60 blur-xs"
                aria-hidden="true"
              />
            )}

            {/* Rotating shimmer ring when thinking */}
            {isThinking && (
              <span
                className="border-primary/50 absolute -inset-2 animate-spin rounded-full border-2 border-dashed"
                style={{ animationDuration: '4s' }}
                aria-hidden="true"
              />
            )}

            {/* The Main Circular Voice Agent Orb */}
            <div
              className={cn(
                'relative flex size-24 items-center justify-center rounded-full transition-all duration-500 sm:size-28',
                'border-2 shadow-lg backdrop-blur-sm',
                isListening &&
                  'animate-voice-breathe border-primary/60 from-primary/20 via-card to-care-lilac/30 bg-gradient-to-br shadow-[0_0_45px_oklch(0.65_0.18_290/0.35)]',
                isSpeaking &&
                  'border-primary from-primary/30 via-card to-care-blue/40 bg-gradient-to-br shadow-[0_0_55px_oklch(0.7_0.22_295/0.5)]',
                isThinking &&
                  'border-primary/40 from-card via-secondary to-muted bg-gradient-to-br shadow-md',
                !isListening &&
                  !isSpeaking &&
                  !isThinking &&
                  'animate-voice-breathe border-border/80 from-secondary/50 via-card to-background bg-gradient-to-br shadow-md'
              )}
            >
              {/* Center Emblem / Animated Soundwaves */}
              {isSpeaking ? (
                <div className="flex items-center gap-1">
                  {[0.4, 0.8, 1.2, 0.7, 1.0, 0.5].map((delay, idx) => (
                    <span
                      key={idx}
                      className="bg-primary inline-block w-1 rounded-full"
                      style={{
                        animation: `voice-wave-bar 1.1s ease-in-out infinite ${delay}s`,
                      }}
                    />
                  ))}
                </div>
              ) : isListening ? (
                <div className="flex flex-col items-center">
                  <span className="hope-brand text-primary font-serif text-3xl font-normal italic sm:text-4xl">
                    h.
                  </span>
                  <div className="mt-0.5 flex items-center gap-0.5">
                    <span className="bg-primary size-1 animate-ping rounded-full" />
                    <span
                      className="bg-primary size-1 animate-ping rounded-full"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <span
                      className="bg-primary size-1 animate-ping rounded-full"
                      style={{ animationDelay: '0.4s' }}
                    />
                  </div>
                </div>
              ) : !session.isConnected ? (
                <div className="flex flex-col items-center">
                  <span className="hope-brand text-muted-foreground font-serif text-3xl font-normal italic sm:text-4xl">
                    h.
                  </span>
                  <Loader2 className="size-3 animate-spin text-muted-foreground mt-1" />
                </div>
              ) : (
                <span className="hope-brand text-foreground/85 font-serif text-3xl font-normal italic sm:text-4xl">
                  h.
                </span>
              )}
            </div>
          </div>

          {/* Dynamic Status Badge Below the Orb */}
          <div className="mt-2.5 flex items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-300',
                !session.isConnected &&
                  'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 border shadow-xs',
                session.isConnected && isListening &&
                  'border-primary/30 bg-primary/10 text-primary dark:bg-primary/20 border shadow-xs',
                session.isConnected && isSpeaking &&
                  'border-primary/40 bg-primary/15 text-primary dark:bg-primary/25 border shadow-xs',
                session.isConnected && isThinking &&
                  'border-border/60 bg-muted/60 text-muted-foreground border',
                session.isConnected && !isListening && !isSpeaking && !isThinking &&
                  'border-border/40 bg-card/60 text-muted-foreground border'
              )}
            >
              {!session.isConnected ? (
                connectTimeout ? (
                  <button
                    type="button"
                    onClick={handleReconnect}
                    disabled={reconnecting}
                    className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                  >
                    {reconnecting ? (
                      <Loader2 className="size-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                    ) : (
                      <RefreshCw className="size-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>{reconnecting ? 'Retrying…' : 'Tap to reconnect'}</span>
                  </button>
                ) : (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                    <span>Connecting to {companionName}…</span>
                  </>
                )
              ) : isListening ? (
                <>
                  <Mic className="text-primary size-3.5 animate-pulse" />
                  <span>Listening to you…</span>
                </>
              ) : isSpeaking ? (
                <>
                  <AudioLines className="text-primary size-3.5 animate-pulse" />
                  <span>Hope is speaking…</span>
                </>
              ) : isThinking ? (
                <>
                  <Sparkles className="text-primary size-3.5 animate-spin" />
                  <span>Reflecting with care…</span>
                </>
              ) : (
                <>
                  <Volume2 className="text-muted-foreground size-3" />
                  <span>
                    {isMicEnabled ? 'Speak freely, Hope is listening' : 'Microphone muted'}
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Middle: Transcript Shown in the Chat Directly */}
        <section className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end space-y-4">
            {/* The Live Chat Transcript Stream */}
            {messages.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-center">
                  <span className="border-border/40 bg-muted/40 text-muted-foreground rounded-full border px-3 py-1 text-[11px]">
                    Today · {companionName}
                  </span>
                </div>

                {messages.map((item) => {
                  const isUser = item.from?.isLocal;
                  const time = new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-end gap-2.5',
                        isUser ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {/* Assistant Avatar */}
                      {!isUser && (
                        <div
                          className="bg-care-blue/70 text-foreground flex size-8 shrink-0 items-center justify-center rounded-full shadow-2xs"
                          aria-hidden="true"
                        >
                          <span className="hope-brand text-foreground font-serif text-lg italic">
                            h.
                          </span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={cn(
                          'group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%]',
                          isUser
                            ? 'bg-secondary text-secondary-foreground rounded-tr-xs shadow-2xs'
                            : 'border-border/70 bg-card/90 text-foreground rounded-tl-xs border shadow-xs backdrop-blur-xs'
                        )}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                          <div className="whitespace-pre-wrap leading-relaxed">{item.message}</div>
                        </div>

                        <div
                          className={cn(
                            'text-muted-foreground mt-1 flex items-center gap-2 text-[10px]',
                            isUser ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <span>{time}</span>
                          {!isUser && (
                            <button
                              type="button"
                              onClick={() => copyMessage(item.id, item.message)}
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                              title="Copy message"
                            >
                              {copiedId === item.id ? (
                                <Check className="size-3 text-emerald-500" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Assistant Thinking Indicator */}
                {isThinking && (
                  <div className="flex items-end justify-start gap-2.5">
                    <div className="bg-care-blue/70 text-foreground flex size-8 shrink-0 items-center justify-center rounded-full shadow-2xs">
                      <span className="hope-brand text-foreground font-serif text-lg italic">
                        h.
                      </span>
                    </div>
                    <div className="border-border/70 bg-card/80 text-muted-foreground flex items-center gap-1.5 rounded-2xl rounded-tl-xs border px-4 py-3 text-xs shadow-xs">
                      <span className="bg-primary size-1.5 animate-bounce rounded-full" />
                      <span
                        className="bg-primary size-1.5 animate-bounce rounded-full"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <span
                        className="bg-primary size-1.5 animate-bounce rounded-full"
                        style={{ animationDelay: '0.4s' }}
                      />
                      <span className="ml-1 text-[11px]">Taking a moment to reflect…</span>
                    </div>
                  </div>
                )}

                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>
        </section>

        {/* Bottom Floating Controls Bar */}
        <footer className="border-border/60 bg-background/90 relative z-20 shrink-0 border-t px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center gap-2.5">
            {/* Mic Toggle Button */}
            <button
              type="button"
              onClick={toggleMic}
              title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm transition-all duration-200',
                isMicEnabled
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_oklch(0.5_0.18_285/0.3)]'
                  : 'bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/30 border'
              )}
            >
              {isMicEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            </button>

            {/* Optional Text Input Composer (User can talk OR type) */}
            <form
              onSubmit={handleSendMessage}
              className="relative flex min-w-0 flex-1 items-center"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Share what's on your mind or speak freely…"
                className="border-border/70 bg-card/80 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary w-full rounded-full border py-2.5 pr-11 pl-4 text-xs focus:ring-1 focus:outline-none sm:text-sm"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className={cn(
                  'absolute right-1.5 flex size-8 items-center justify-center rounded-full transition-all',
                  inputMessage.trim()
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'text-muted-foreground cursor-not-allowed opacity-40'
                )}
                title="Send message"
              >
                <Send className="size-3.5" />
              </button>
            </form>
          </div>
          <div className="text-muted-foreground mt-1.5 text-center text-[11px]">
            <span>🔒 Your voice and story, held with care. No judgment.</span>
          </div>
        </footer>
      </main>
    </div>
  );
});

HopeVoiceSession.displayName = 'HopeVoiceSession';
