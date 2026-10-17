import { ChatWorkspace } from '@/components/chat/chat-workspace';
import { constructMetadata } from '@/lib/site';

export const metadata = constructMetadata({
  title: 'Dashboard · Conversations',
  description: 'A quiet, personal space for thoughtful reflection and conversations.',
});

export default function DashboardPage() {
  return <ChatWorkspace />;
}
