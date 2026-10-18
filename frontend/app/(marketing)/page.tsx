import Link from 'next/link';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/brand/hope-brand';
import { SideArt } from '@/components/brand/side-art';
import { MemorySection, TherapistCards } from '@/components/chat/care-content';
import { ChatDemo } from '@/components/chat/chat-demo';
import { Button } from '@/components/ui/button';
import { constructMetadata } from '@/lib/site';

export const metadata = constructMetadata({
  title: 'Hope — A little space for yourself',
  description:
    'AI-guided conversations, daily practices, and a space to feel heard. Meet your weekly, daily, and anytime wellbeing companions.',
});

export default function LandingPage() {
  return (
    <div className="theme-purple">
      <section className="landing-hero">
        <SideArt />
        <SiteHeader />
        <main className="hero-content">
          <div className="hero-badge">
            <span /> A little space for yourself
          </div>
          <h1>
            Hope. A space to be heard.
            <br />
            <em>A place to feel like you.</em>
          </h1>
          <p>
            Some days, you need a conversation. Some days, a little calm.
            <br className="desktop-break" /> Meet your AI companions for whatever today feels like.
          </p>
          <div className="hero-actions">
            <Button asChild size="lg" className="pill-button">
              <Link href="/login">
                Let&apos;s talk <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <div className="hero-reassurance">
            <LockKeyhole size={12} />
            <span>Your story, held with care.</span>
            <span className="reassurance-dot">•</span>
            <span>No judgment. No pressure.</span>
          </div>
        </main>
        <ChatDemo />
      </section>

      <section id = "therapists"className="section-wrap care-section">
        <div className="section-title">
          <span className="section-eyebrow">DIFFERENT MOMENTS. THE SAME CARE.</span>
          <h2>
            Three companions.
            <br />
            <em>One understanding of you.</em>
          </h2>
          <p>
            A deeper conversation, a daily practice, or support in the moment.
            <br />
            There’s a space for every version of your day.
          </p>
        </div>
        <TherapistCards />
      </section>

      <MemorySection />

      <section className="closing-section theme-purple">
        <span className="section-eyebrow">YOU DON&apos;T HAVE TO HAVE IT ALL FIGURED OUT</span>
        <h2>Start with what&apos;s on your mind.</h2>
        <Button asChild size="lg" className="pill-button">
          <Link href="/login">
            Find your space <ArrowUpRight />
          </Link>
        </Button>
        <p>
          Hope is AI-guided wellbeing support, not a licensed therapist or emergency service.
          <br />
          If you are in immediate danger, contact your local emergency services.
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
