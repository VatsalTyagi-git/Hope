import { App } from '@/components/app/app';
import { constructMetadata } from '@/lib/site';

export const metadata = constructMetadata({
  title: 'Voice Session · Hope',
  description: 'Live voice space to speak freely, reflect, and feel heard in real-time.',
});

const tokenServerId = process.env.LIVEKIT_TOKEN_SERVER_ID;
const isHomepageAgent = !tokenServerId && !process.env.LIVEKIT_URL;
const baseTokenEndpoint = isHomepageAgent
  ? 'https://livekit.com/api/homepage-agent/token'
  : '/api/token';

export default async function VoicePage({
  searchParams,
}: {
  searchParams?: Promise<{ therapist?: string; agent?: string; mode?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const therapistTitle = resolvedParams?.therapist || resolvedParams?.agent;
  const rawMode = resolvedParams?.mode;

  let tokenEndpoint = baseTokenEndpoint;
  if (!isHomepageAgent && (therapistTitle || rawMode)) {
    const raw = (rawMode || therapistTitle || '').toLowerCase();
    const mode = raw.includes('daily')
      ? 'daily'
      : raw.includes('demand') || raw.includes('anytime') || raw.includes('companion')
      ? 'companion'
      : 'weekly';
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (therapistTitle) params.set('therapist', therapistTitle);
    tokenEndpoint = `${baseTokenEndpoint}?${params.toString()}`;
  }

  return (
    <App
      tokenServerId={tokenServerId}
      tokenEndpoint={tokenEndpoint}
      agentName={process.env.AGENT_NAME || 'my-agent-local'}
      isVideoInputSupported={!isHomepageAgent}
      therapistTitle={therapistTitle}
    />
  );
}
