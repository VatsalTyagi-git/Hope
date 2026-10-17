'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, LockKeyhole } from 'lucide-react';
import { ThemeToggle } from '@/components/brand/theme-toggle';
import { Button } from '@/components/ui/button';

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
  therapistTitle?: string;
}

export const WelcomeView = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & WelcomeViewProps
>(({ startButtonText = 'Start voice session', onStartCall, therapistTitle, ...props }, ref) => {
  const companionTitle = therapistTitle || 'On-demand therapist';

  return (
    <div
      ref={ref}
      {...props}
      className="bg-background text-foreground relative flex min-h-screen w-full flex-col items-center justify-between overflow-hidden px-4 py-8"
    >
      {/* Soft ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--glow, oklch(0.72 0.17 295)) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-35 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--glow, oklch(0.72 0.17 295)) 0%, transparent 70%)',
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex w-full max-w-4xl items-center justify-between">
        <Link
          href="/dashboard"
          className="group text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
        >
          <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to text chat</span>
        </Link>
        <Link
          href="/"
          className="hope-brand text-foreground font-serif text-3xl font-normal tracking-tight"
        >
          hope<span className="text-primary">.</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main card */}
      <section className="relative z-10 my-auto flex max-w-lg flex-col items-center text-center">
        {/* Animated circular voice agent orb */}
        <div className="relative mb-6 flex items-center justify-center">
          <div
            className="absolute -inset-4 animate-pulse rounded-full opacity-30 blur-md"
            style={{
              background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
            }}
          />
          <div className="animate-voice-breathe border-primary/40 from-primary/15 via-card to-secondary relative flex size-28 items-center justify-center rounded-full border-2 bg-gradient-to-br shadow-lg backdrop-blur-sm sm:size-32">
            <span className="hope-brand text-primary font-serif text-4xl italic sm:text-5xl">
              h.
            </span>
          </div>
        </div>

        {/* Eyebrow badge */}
        <div className="border-border/80 bg-card/80 text-muted-foreground mb-3 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs shadow-2xs">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>A little space for yourself</span>
        </div>

        {/* Heading */}
        <h1 className="text-foreground font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          Voice session with your
          <br />
          <em className="text-muted-foreground not-italic">{companionTitle}</em>
        </h1>

        <p className="text-muted-foreground mt-3 max-w-md text-xs leading-relaxed sm:text-sm">
          A quieter, private space to speak freely, reflect, and feel heard. Hope listens in
          real-time and responds gently at your pace.
        </p>

        {/* Start Call Button */}
        <Button
          size="lg"
          onClick={onStartCall}
          className="mt-7 h-12 gap-2 rounded-full px-8 text-xs font-medium tracking-wide shadow-md transition-all hover:scale-[1.02] sm:text-sm"
        >
          <span>{startButtonText}</span>
          <ArrowUpRight className="size-4" />
        </Button>

        {/* Reassurance notes */}
        <div className="text-muted-foreground mt-5 flex items-center justify-center gap-2 text-[11px]">
          <LockKeyhole className="size-3.5" />
          <span>Your story, held with care</span>
          <span>•</span>
          <span>No judgment</span>
          <span>•</span>
          <span>At your own pace</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-muted-foreground relative z-10 w-full text-center text-xs">
        <p>Hope AI Care · Private Voice Space</p>
      </footer>
    </div>
  );
});

WelcomeView.displayName = 'WelcomeView';
