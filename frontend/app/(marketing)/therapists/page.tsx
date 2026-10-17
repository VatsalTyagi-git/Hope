import { SiteFooter, SiteHeader } from '@/components/brand/hope-brand';
import { TherapistCards } from '@/components/chat/care-content';
import { constructMetadata } from '@/lib/site';

export const metadata = constructMetadata({
  title: 'Your three companions',
  description:
    'Meet your weekly main therapist, daily exercise therapist, and on-demand wellbeing companion.',
});

export default function TherapistsPage() {
  return (
    <>
      <SiteHeader />
      <main className="inner-page section-wrap">
        <h1>Different moments. The same care.</h1>
        <p className="inner-intro">
          Three AI companions for different parts of your day. One connected story, so you can begin
          where you are.
        </p>
        <TherapistCards />
        <p className="inner-intro mt-10">
          These are AI-guided wellbeing companions, not licensed clinicians. Connect via text in
          your chat space or engage in real-time voice sessions with our LiveKit voice agent.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
