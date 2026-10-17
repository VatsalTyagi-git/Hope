'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, AudioLines, Heart, LockKeyhole } from 'lucide-react';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';

const prompt = "I've been feeling a little overwhelmed lately.";
const reply =
  "I'm glad you’re here. You don’t have to carry it all at once. What’s been on your mind?";

export function ChatDemo() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTick(150);
      return;
    }
    const timer = window.setInterval(() => setTick((t) => (t + 1) % 205), 65);
    return () => window.clearInterval(timer);
  }, []);

  const sent = tick >= 58;

  return (
    <div className="demo-scene">
      <div className="floating-note note-left">
        <div className="note-icon">
          <Heart size={18} />
        </div>
        <span>A space without judgment.</span>
        <small>Just you, as you are.</small>
      </div>
      <div className="demo-chat">
        <div className="demo-heading">
          <span className="agent-mark">h.</span>
          <div>
            <strong>Hope, here for you</strong>
            <span>
              <i /> A moment to check in
            </span>
          </div>
          <AudioLines size={19} />
        </div>
        <div className="demo-transcript">
          <Message from="user" className={sent ? 'demo-user' : 'demo-user invisible'}>
            <MessageContent>{prompt}</MessageContent>
          </Message>
          <Message from="assistant" className="demo-assistant">
            <span className="agent-mark">h.</span>
            <MessageContent>
              {tick >= 72 ? (
                <MessageResponse>{reply.slice(0, Math.max(0, tick - 72) * 2)}</MessageResponse>
              ) : sent ? (
                <span className="typing-dots">•••</span>
              ) : (
                <span className="demo-welcome">Whenever you&apos;re ready, I&apos;m here.</span>
              )}
            </MessageContent>
          </Message>
        </div>
        <div className="demo-composer">
          <span>
            {sent ? "Share what's on your mind…" : prompt.slice(0, tick)}
            {!sent && <i className="typing-cursor" />}
          </span>
          <span className="demo-send">
            <ArrowUp size={16} />
          </span>
        </div>
        <div className="demo-privacy">
          <LockKeyhole size={10} /> Your space. Your pace.
        </div>
      </div>
      <div className="floating-note note-right">
        <span className="note-eyebrow">A LITTLE PROGRESS, EVERY DAY</span>
        <div className="waveform">
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} className={`wave-bar wave-${i % 6}`} />
          ))}
        </div>
        <small>Sometimes, being heard is enough.</small>
      </div>
    </div>
  );
}
