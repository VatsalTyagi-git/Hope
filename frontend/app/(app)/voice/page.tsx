import { cookies } from 'next/headers';
import { auth } from '@/auth';
import prisma from '@/lib/db';
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
  searchParams?: Promise<{ therapist?: string; agent?: string; mode?: string; type?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const rawType = resolvedParams?.type || resolvedParams?.mode;
  let therapistTitle = resolvedParams?.therapist || resolvedParams?.agent;

  if (!therapistTitle && rawType) {
    const lower = rawType.toLowerCase();
    if (lower.includes('weekly')) {
      therapistTitle = 'Weekly main therapist';
    } else if (lower.includes('daily')) {
      therapistTitle = 'Daily exercise therapist';
    } else {
      therapistTitle = 'On-demand therapist';
    }
  } else if (!therapistTitle) {
    therapistTitle = 'On-demand therapist';
  }

  const rawMode = (rawType || therapistTitle || '').toLowerCase();
  const mode = rawMode.includes('daily')
    ? 'daily'
    : rawMode.includes('demand') || rawMode.includes('anytime') || rawMode.includes('companion')
    ? 'companion'
    : 'weekly';

  const session = await auth().catch(() => null);
  const cookieStore = await cookies();
  const patientId = cookieStore.get('cbt_patient_id')?.value;

  const currentUserId = session?.user?.id || patientId;
  let currentUserName = session?.user?.name || session?.user?.email?.split('@')[0];

  if (!currentUserName && currentUserId) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { name: true, email: true },
      });
      if (dbUser) {
        currentUserName = dbUser.name || dbUser.email?.split('@')[0];
      }
    } catch {}
  }

  let tokenEndpoint = baseTokenEndpoint;
  if (!isHomepageAgent) {
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (therapistTitle) params.set('therapist', therapistTitle);
    if (currentUserId) params.set('userId', currentUserId);
    if (currentUserName) params.set('userName', currentUserName);
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
