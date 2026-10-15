'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useLocalParticipant,
  useTranscriptions,
  useChat,
  useRoomContext,
} from '@livekit/components-react';
import { useDebugMode } from '@/hooks/useDebug';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { AgentAudioVisualizerBar } from '@/components/agents-ui/agent-audio-visualizer-bar';
import { ThemeToggle } from '@/components/app/theme-toggle';
import {
  ChevronLeft,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Sparkles,
  Loader2,
  Send,
  Lock,
  RotateCcw,
} from 'lucide-react';

interface HopeVoiceRoomProps {
  userId: string;
  userName: string;
  companionTitle: string;
  sessionType?: 'weekly' | 'daily' | 'companion';
  isInitial?: boolean;
  onDisconnected?: () => void;
}

interface ConnectionDetails {
  serverUrl: string;
  roomName: string;
  participantToken: string;
}

interface UnifiedStreamMessage {
  id: string;
  isUser: boolean;
  senderName?: string;
  text: string;
  timestamp: number;
  isStreaming?: boolean;
}

/**
 * Orders messages so that conversational turns remain natural:
 * 1. The opening greeting (if sent by agent before any user speech) stays at the top.
 * 2. In real-time speech-to-speech, STT transcription for the user's speech is often delivered
 *    concurrently with or slightly after the agent's initial reply stream starts.
 *    Any user message that prompted an agent reply is guaranteed to appear BEFORE that agent reply.
 */
function orderConversationMessages(rawMessages: UnifiedStreamMessage[]): UnifiedStreamMessage[] {
  if (rawMessages.length <= 1) return rawMessages;

  // 1. Sort initially by raw timestamp/arrival
  const sorted = [...rawMessages].sort((a, b) => a.timestamp - b.timestamp);

  // 2. Determine if the first message is the agent's opening session greeting
  const firstUserIdx = sorted.findIndex((m) => m.isUser);
  const openingGreetingId = firstUserIdx > 0 ? sorted[0].id : null;

  // 3. For any agent response (not opening greeting), ensure the user message that prompted it comes first
  const result: UnifiedStreamMessage[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    if (!current.isUser && current.id !== openingGreetingId) {
      // Look ahead for any user message that arrived as the prompt for this turn
      // (within a conversational turn window of 10s)
      let foundUserIndex = -1;
      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        if (next.isUser) {
          if (Math.abs(next.timestamp - current.timestamp) <= 10000) {
            foundUserIndex = j;
          }
          break;
        }
      }

      if (foundUserIndex !== -1) {
        // Place the prompting user message before this agent response
        const userMsg = sorted.splice(foundUserIndex, 1)[0];
        result.push(userMsg);
      }
    }

    result.push(current);
  }

  return result;
}

/**
 * Renders smooth caption bubbles matching LiveKit Agent UI.
 * Words stream progressively in real time without stuttering or re-mounting glitch.
 */
function StreamingMessageBubble({
  text,
  isStreaming,
  isUser,
  timestamp,
}: {
  text: string;
  isStreaming?: boolean;
  isUser: boolean;
  timestamp: number;
}) {
  const formatTime = (ts: number) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end transition-opacity duration-150">
        <div className="max-w-md bg-[#F1EDFC] border border-purple-100/90 rounded-2xl rounded-tr-sm px-4 py-3 shadow-2xs text-slate-800 text-sm sm:text-base leading-relaxed">
          <div className="break-words font-sans">{text}</div>
          <div className="text-[10px] text-slate-400 mt-1 text-right font-sans select-none">
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 transition-opacity duration-150">
      {/* Hope Avatar 'h.' */}
      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs select-none">
        <span className="font-serif italic font-medium text-xs text-slate-700">h.</span>
      </div>

      {/* Assistant Bubble */}
      <div className="max-w-xl bg-white border border-slate-200/90 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-2xs text-slate-800 text-sm sm:text-base leading-relaxed">
        <div className="font-sans break-words text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
        <div className="text-[10px] text-slate-400 mt-2 font-sans select-none">
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
}

function VoiceSessionActiveUI({
  companionTitle,
  userName,
  onEnd,
}: {
  companionTitle: string;
  userName: string;
  onEnd: () => void;
}) {
  useDebugMode({ enabled: process.env.NODE_ENV !== 'production' });

  const room = useRoomContext();
  const { state, audioTrack } = useVoiceAssistant();
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const transcriptions = useTranscriptions();
  const { chatMessages, send, isSending } = useChat();

  const [chatInput, setChatInput] = useState('');
  const [isEnding, setIsEnding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);

  const handleEndClick = async () => {
    if (isEnding) return;
    setIsEnding(true);
    try {
      if (room) {
        await room.disconnect();
      }
    } catch (e) {
      console.warn('Room disconnect error:', e);
    }
    // Allow brief time for agent to finish sending transcript to DB
    setTimeout(() => {
      onEnd();
    }, 1200);
  };

  // Maintain persistent stable IDs and initial timestamps so streaming items don't remount or jitter
  const segmentIdMapRef = useRef<Map<string, string>>(new Map());
  const segmentTimeMapRef = useRef<Map<string, number>>(new Map());

  // Merge live streaming transcriptions from LiveKit with typed chat messages
  const unifiedMessages = useMemo(() => {
    const list: UnifiedStreamMessage[] = [];

    // 1. Live transcription streams (audio speech from Agent & User)
    for (const tr of transcriptions) {
      if (!tr.text || !tr.text.trim()) continue;

      const participantId = tr.participantInfo.identity;
      const isUser =
        participantId === localParticipant?.identity ||
        tr.streamInfo.attributes?.['lk.publish_on_behalf'] === localParticipant?.identity ||
        (!participantId?.toLowerCase().includes('agent') && participantId === userName);

      const isStreaming = tr.streamInfo.attributes?.['lk.transcription_final'] !== 'true';

      // Ensure stable key across all updates of this segment
      const rawSegId = tr.streamInfo.attributes?.['lk.segment_id'] || tr.streamInfo.id;
      let stableId = segmentIdMapRef.current.get(rawSegId);
      if (!stableId) {
        stableId = rawSegId || `tr_${participantId}_${Date.now()}`;
        segmentIdMapRef.current.set(rawSegId, stableId);
      }

      // Record first arrival time so timestamp doesn't drift during streaming
      let stableTimestamp = segmentTimeMapRef.current.get(stableId);
      if (!stableTimestamp) {
        stableTimestamp = tr.streamInfo.timestamp || Date.now();
        segmentTimeMapRef.current.set(stableId, stableTimestamp);
      }

      list.push({
        id: stableId,
        isUser,
        senderName: isUser ? userName : 'Hope',
        text: tr.text,
        timestamp: stableTimestamp,
        isStreaming,
      });
    }

    // 2. Typed chat messages from user
    for (const chat of chatMessages) {
      if (!chat.message || !chat.message.trim()) continue;
      const isUser = chat.from?.isLocal ?? true;

      // Avoid duplication if the message text was already received via transcription
      const isDuplicate = list.some(
        (m) => m.text.trim() === chat.message.trim() && Math.abs(m.timestamp - chat.timestamp) < 4000
      );

      if (!isDuplicate) {
        list.push({
          id: chat.id,
          isUser,
          senderName: isUser ? userName : 'Hope',
          text: chat.message,
          timestamp: chat.timestamp,
          isStreaming: false,
        });
      }
    }

    // Reorder conversation turns so user speech consistently appears before agent responses
    return orderConversationMessages(list);
  }, [transcriptions, chatMessages, localParticipant?.identity, userName]);

  // Auto-scroll smoothly when a new turn arrives; keep pinned without jitter when streaming
  useEffect(() => {
    const isNewTurn = unifiedMessages.length !== prevMsgCountRef.current;
    prevMsgCountRef.current = unifiedMessages.length;

    messagesEndRef.current?.scrollIntoView({
      behavior: isNewTurn ? 'smooth' : 'auto',
    });
  }, [unifiedMessages, state]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || isSending) return;
    setChatInput('');
    try {
      await send(text);
    } catch (err) {
      console.error('Failed to send chat message to agent:', err);
    }
  };

  const toggleMic = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isConnecting = state === 'connecting' || state === 'initializing';
  const isAgentOffline = state === 'disconnected' || !audioTrack;

  return (
    <div className="relative h-screen w-full bg-[#FAF8FE] text-slate-800 flex flex-col justify-between overflow-hidden select-none">
      {/* Background radial ambiance */}
      <div className="absolute top-0 inset-x-0 h-96 bg-[radial-gradient(circle_at_top,_rgba(224,204,255,0.35)_0%,_rgba(244,238,253,0.15)_50%,_transparent_100%)] pointer-events-none" />

      {/* TOP HEADER */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-slate-100/90 bg-white/60 backdrop-blur-md">
        {/* Left Side Info */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleEndClick}
            disabled={isEnding}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors cursor-pointer disabled:opacity-60"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Hope</span>
          </button>
          <span className="text-slate-200">|</span>
          <span className="font-serif text-xl tracking-tight text-slate-900 font-normal">
            hope.
          </span>
          <span className="text-slate-200">|</span>
          <span className="text-xs font-medium text-slate-700 hidden sm:inline">
            {companionTitle}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Voice
          </span>
        </div>

        {/* Right Side Theme & Controls */}
        <div className="flex items-center gap-4">
          <ThemeToggle className="w-auto border-slate-200/80 bg-white/80" />
          <button
            type="button"
            onClick={handleEndClick}
            disabled={isEnding}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-70"
          >
            {isEnding ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving reflection...</span>
              </>
            ) : (
              <>
                <PhoneOff className="w-3.5 h-3.5" />
                <span>End session</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* TOP CENTER: Visualizer Orb & Dynamic Pill Status */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-6 pb-2">
        {/* Circular Visualizer Container */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing ambient aura */}
          <div
            className={`absolute w-36 h-36 rounded-full transition-all duration-700 ${
              isSpeaking
                ? 'bg-purple-300/40 animate-ping'
                : isListening
                ? 'bg-purple-200/30 animate-pulse'
                : 'bg-transparent'
            }`}
          />
          <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/95 border border-purple-200/80 shadow-[0_4px_28px_rgba(139,92,246,0.14)] flex items-center justify-center">
            {/* LiveKit reactive 5-bar visualizer */}
            <AgentAudioVisualizerBar
              state={state}
              audioTrack={audioTrack}
              barCount={5}
              color="#7c3aed"
              className="h-9 gap-1.5"
            />
          </div>
        </div>

        {/* State Pill Badge */}
        <div className="mt-3.5 inline-flex items-center gap-2 px-4 py-1 rounded-full bg-purple-50/90 border border-purple-200/70 text-purple-700 text-xs font-medium shadow-2xs">
          {isSpeaking ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
              <span>Hope is speaking...</span>
            </>
          ) : isThinking ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-spin" />
              <span>Hope is reflecting...</span>
            </>
          ) : isListening ? (
            <>
              <Mic className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
              <span>Hope is listening...</span>
            </>
          ) : isConnecting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
              <span>Hope is joining session...</span>
            </>
          ) : isAgentOffline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Waiting for Hope to join...</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Hope is ready</span>
            </>
          )}
        </div>
      </div>

      {/* CENTER: Date Divider Marker */}
      <div className="relative z-10 flex items-center justify-center my-1 select-none">
        <span className="text-[11px] text-slate-400 bg-white/80 border border-slate-200/60 rounded-full px-3.5 py-0.5 shadow-2xs font-sans">
          Today · {companionTitle}
        </span>
      </div>

      {/* MIDDLE: Caption-First Streaming Conversation Area */}
      <main className="relative z-10 flex-1 w-full max-w-2xl sm:max-w-3xl mx-auto px-4 overflow-y-auto space-y-4 py-3 custom-scrollbar">
        {unifiedMessages.map((msg) => (
          <StreamingMessageBubble
            key={msg.id}
            text={msg.text}
            isStreaming={msg.isStreaming}
            isUser={msg.isUser}
            timestamp={msg.timestamp}
          />
        ))}

        {/* If agent is thinking with no current text yet */}
        {isThinking && (
          <div className="flex items-start gap-3 animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
              <span className="font-serif italic font-medium text-xs text-slate-600">h.</span>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-sm px-4 py-3 shadow-2xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </main>

      {/* BOTTOM CONTROLS & TEXT INPUT BAR */}
      <footer className="relative z-20 w-full max-w-2xl sm:max-w-3xl mx-auto px-4 pb-4 pt-1">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          {/* Circular Microphone Toggle Button */}
          <button
            type="button"
            onClick={toggleMic}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 flex-shrink-0 cursor-pointer ${
              isMicrophoneEnabled
                ? 'bg-[#5F48EA] hover:bg-[#503cd2] text-white shadow-purple-500/20'
                : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
            }`}
            title={isMicrophoneEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicrophoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Rounded Pill Text Input */}
          <div className="flex-1 bg-white border border-slate-200/90 rounded-full px-5 py-2.5 shadow-2xs flex items-center gap-3 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Share what's on your mind or speak freely..."
              className="w-full bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 font-sans"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isSending}
              className="text-slate-400 hover:text-purple-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Security Reassurance Trust Note */}
        <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11px] text-slate-400 select-none">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Your voice and story, held with care. No judgment.</span>
        </div>
      </footer>

      {/* Bottom Left Next.js Brand Badge */}
      <div className="fixed bottom-4 left-4 pointer-events-none select-none hidden sm:flex z-10">
        <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-md">
          N
        </div>
      </div>

      {/* Saving Session Reflection Overlay */}
      {isEnding && (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center mb-4 shadow-sm">
            <Loader2 className="w-6 h-6 text-[#5F48EA] animate-spin" />
          </div>
          <h4 className="text-lg font-serif text-slate-900 mb-1">
            Reflecting on your session...
          </h4>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Generating your CBT summary and saving your conversation to your dashboard.
          </p>
        </div>
      )}
    </div>
  );
}

export function HopeVoiceRoom({
  userId,
  userName,
  companionTitle,
  sessionType = 'weekly',
  isInitial = false,
  onDisconnected,
}: HopeVoiceRoomProps) {
  const [connection, setConnection] = useState<ConnectionDetails | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 15000);

    setConnecting(true);
    setError(null);

    async function fetchToken() {
      try {
        const targetMode = isInitial ? 'initial' : (sessionType || 'weekly');
        const res = await fetch(
          `/api/token?userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}&type=${encodeURIComponent(sessionType)}&mode=${encodeURIComponent(targetMode)}&initial=${isInitial ? 'true' : 'false'}&_t=${Date.now()}`,
          { signal: abortController.signal }
        );
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch token: HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!ignore) {
          setConnection(data);
          setConnecting(false);
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (!ignore) {
          console.error('Error fetching voice token:', err);
          const isTimeout = err instanceof Error && err.name === 'AbortError';
          setError(
            isTimeout
              ? 'Connecting to the voice agent server took longer than expected. Please make sure the agent is running in your terminal.'
              : err instanceof Error
              ? err.message
              : 'Unable to connect to the voice agent server. Please make sure the agent is running in your terminal.'
          );
          setConnecting(false);
        }
      }
    }

    fetchToken();

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [userId, userName, sessionType, isInitial, retryKey]);

  const handleEnd = () => {
    if (onDisconnected) {
      onDisconnected();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  const handleRetry = () => {
    setConnection(null);
    setError(null);
    setConnecting(true);
    setRetryKey((prev) => prev + 1);
  };

  if (connecting) {
    return (
      <div className="min-h-screen w-full bg-[#FAF8FE] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#5F48EA] animate-spin" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-800 font-sans">
            Preparing your quiet voice space...
          </p>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Connecting securely with your AI companion
          </p>
        </div>
      </div>
    );
  }

  if (error || !connection) {
    return (
      <div className="min-h-screen w-full bg-[#FAF8FE] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <PhoneOff className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-800 mb-1 font-sans">
          Voice Connection Unavailable
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed font-sans">
          {error || 'Unable to establish live audio session.'}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#5F48EA] hover:bg-[#503cd2] text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.location.href = '/dashboard';
            }}
            className="px-5 py-2 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={connection.participantToken}
      serverUrl={connection.serverUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={handleEnd}
      onError={(err) => {
        console.warn('[LiveKitRoom] error:', err);
      }}
      className="h-screen w-full flex flex-col overflow-hidden"
    >
      <RoomAudioRenderer />
      <StartAudioButton
        label="Click to allow audio playback"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-xs font-medium bg-[#5F48EA] hover:bg-[#503cd2] text-white rounded-full px-4 py-1.5 shadow-md"
      />
      <VoiceSessionActiveUI
        companionTitle={companionTitle}
        userName={userName}
        onEnd={handleEnd}
      />
    </LiveKitRoom>
  );
}
