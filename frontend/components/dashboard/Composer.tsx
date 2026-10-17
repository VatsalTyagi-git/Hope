'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUp, Mic, AudioWaveform as Waveform, Square } from 'lucide-react';

interface ComposerProps {
  onSendMessage: (text: string) => void;
  onEndSession: () => void;
  disabled?: boolean;
}

export function Composer({ onSendMessage, onEndSession, disabled = false }: ComposerProps) {
  const [text, setText] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as text grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoiceMode = () => {
    setIsVoiceActive(!isVoiceActive);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-3 pt-2">
      {/* Top Header of Composer */}
      <div className="flex items-center justify-between mb-2 px-1 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span className="font-medium text-slate-600">A moment just for you</span>
        </div>
        <button
          onClick={onEndSession}
          type="button"
          className="text-slate-400 hover:text-slate-700 text-xs transition-colors hover:underline underline-offset-2"
        >
          End session
        </button>
      </div>

      {/* Main Input Box */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] focus-within:border-slate-400 focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all p-3 sm:p-4">
        {isVoiceActive ? (
          /* Voice Listening Mode Simulation */
          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center gap-1.5 h-8">
              <span className="w-1 bg-[#5244E3] rounded-full animate-bounce [animation-delay:0ms] h-4" />
              <span className="w-1 bg-[#5244E3] rounded-full animate-bounce [animation-delay:150ms] h-8" />
              <span className="w-1 bg-[#5244E3] rounded-full animate-bounce [animation-delay:300ms] h-6" />
              <span className="w-1 bg-[#5244E3] rounded-full animate-bounce [animation-delay:75ms] h-7" />
              <span className="w-1 bg-[#5244E3] rounded-full animate-bounce [animation-delay:200ms] h-4" />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Listening gently... speak at your own pace
            </div>
            <button
              onClick={toggleVoiceMode}
              className="inline-flex items-center gap-1 text-[11px] text-purple-700 hover:text-purple-900 font-medium px-3 py-1 rounded-full bg-purple-50"
            >
              <Square className="w-3 h-3 fill-current" />
              Switch back to text
            </button>
          </div>
        ) : (
          /* Textarea Input */
          <textarea
            ref={textareaRef}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Share what's on your mind..."
            className="w-full resize-none border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 leading-relaxed"
          />
        )}

        {/* Bottom Toolbar Inside Input */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
          <span className="text-[11px] text-slate-400 font-normal select-none">
            Hope · Here for you
          </span>

          <div className="flex items-center gap-2">
            {/* Audio Waveform / Voice Button -> Routes to Voice Agent */}
            <Link
              href="/voice?type=companion"
              title="Voice check-in with on-demand companion"
              className="p-2 rounded-full text-slate-400 hover:text-[#5244E3] hover:bg-purple-50 transition-colors"
            >
              <Waveform className="w-4 h-4" />
            </Link>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!text.trim() || disabled}
              className="w-8 h-8 rounded-full bg-[#5244E3] hover:bg-[#4335D6] text-white flex items-center justify-center shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              aria-label="Send message"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Legal/Safety Note Matching Screenshot 3 */}
      <p className="mt-2 text-[10px] sm:text-[11px] text-slate-400 text-center leading-normal select-none">
        AI-guided support, not professional or emergency care. Conversations are simulated and saved in this browser.
      </p>
    </div>
  );
}
