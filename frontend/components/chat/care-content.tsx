import Link from 'next/link';
import {
  ArrowUpRight,
  AudioLines,
  Brain,
  CalendarDays,
  FileText,
  Leaf,
  MessagesSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const therapists = [
  {
    name: 'Your weekly anchor',
    label: 'Weekly main therapist',
    text: 'Make room for the bigger picture. Reflect on your week, explore patterns, and move forward with intention.',
    icon: CalendarDays,
    tone: 'care-blue',
    tag: 'A deeper conversation',
  },
  {
    name: 'Your daily reset',
    label: 'Daily exercise therapist',
    text: 'Small practices, meaningful shifts. Find a little calm with guided breathing, grounding, and daily check-ins.',
    icon: Leaf,
    tone: 'care-green',
    tag: 'One small step at a time',
  },
  {
    name: 'Your anytime support',
    label: 'On-demand therapist',
    text: "For the thoughts that can't wait until next week. A listening ear, right when you need one.",
    icon: AudioLines,
    tone: 'care-lilac',
    tag: 'Here when you need it',
  },
];

export function TherapistCards() {
  return (
    <div className="care-grid">
      {therapists.map((t) => (
        <article className={`care-card ${t.tone}`} key={t.name}>
          <div className="care-icon">
            <t.icon size={23} />
          </div>
          <span className="section-eyebrow">{t.label}</span>
          <h3>{t.name}</h3>
          <p>{t.text}</p>
          <div className="care-card-bottom">
            <span>{t.tag}</span>
            <Button asChild variant="ghost" size="icon" aria-label={`Meet ${t.label}`}>
              <Link href={`/voice?therapist=${encodeURIComponent(t.label)}`}>
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function MemorySection() {
  return (
    <section className="memory-section section-wrap">
      <div>
        <span className="section-eyebrow">A THREAD THAT STAYS WITH YOU</span>
        <h2>
          You grow.
          <br />
          <em>Your story stays connected.</em>
        </h2>
        <p>
          No starting from the beginning, again. Each conversation becomes part of a shared
          understanding of you, so your next session can pick up where you left off.
        </p>
        <Button asChild variant="link" className="px-0">
          <Link href="/approach">
            Explore our approach <ArrowUpRight />
          </Link>
        </Button>
      </div>
      <div className="memory-flow">
        <div>
          <MessagesSquare />
          <span>Your conversation</span>
          <small>A moment to be heard</small>
        </div>
        <span className="flow-line" />
        <div>
          <FileText />
          <span>Your session summary</span>
          <small>The things that mattered</small>
        </div>
        <span className="flow-line" />
        <div>
          <Brain />
          <span>A shared understanding</span>
          <small>Carried into your next conversation</small>
        </div>
      </div>
    </section>
  );
}
