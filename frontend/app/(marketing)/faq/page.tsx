import { SiteFooter, SiteHeader } from '@/components/brand/hope-brand';
import { constructMetadata } from '@/lib/site';

export const metadata = constructMetadata({
  title: 'A few answers',
  description:
    'Answers about Hope conversations, shared memory, voice sessions, and wellbeing support.',
});

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main className="inner-page section-wrap">
        <h1>A few things you might wonder.</h1>
        <p className="inner-intro">A little clarity, before you begin.</p>
        <div className="faq-list">
          {[
            [
              'Is Hope a replacement for therapy?',
              'No. Hope is intended for AI-guided wellbeing support, not diagnosis, treatment, or crisis care. If you need professional support, reach out to a qualified clinician.',
            ],
            [
              'How does Hope work?',
              'You can explore conversations, try guided sessions, and view summaries. Our text workspace gives you room to write, while our LiveKit Voice Agent allows real-time spoken sessions with live transcripts.',
            ],
            [
              'Where are my conversations saved?',
              'Conversations are securely held in your browser and account space. Avoid entering sensitive personal identification in public environments.',
            ],
            [
              'Can I talk by voice?',
              'Yes! Weekly, daily, and on-demand voice entry points are powered by LiveKit real-time voice with an animated orb and live interactive transcription.',
            ],
            [
              'How does shared memory work?',
              'Context carries between your three companions. Session summaries capture key themes, allowing your next conversation to pick up right where you left off.',
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
