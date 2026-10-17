import { SiteFooter, SiteHeader } from '@/components/brand/hope-brand';
import { MemorySection } from '@/components/chat/care-content';
import { constructMetadata } from '@/lib/site';

export const metadata = constructMetadata({
  title: 'A gentler way forward',
  description:
    'Learn how Hope connects conversations, reflection, and shared context across three wellbeing companions.',
});

export default function ApproachPage() {
  return (
    <>
      <SiteHeader />
      <main className="inner-page">
        <h1>A gentler way forward.</h1>
        <p className="inner-intro">
          Wellbeing isn&apos;t a straight line. Hope makes room for the everyday moments, the deeper
          questions, and everything in between.
        </p>
        <MemorySection />
        <div className="inner-intro">
          <h2>Your story, on your terms.</h2>
          <p>
            You can revisit each conversation alongside its summary, follow a memory back to its
            original session, or delete a conversation from your browser. Hope offers safe,
            AI-guided wellbeing support to help you feel heard.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
