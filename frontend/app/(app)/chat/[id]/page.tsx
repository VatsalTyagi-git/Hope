import { redirect } from 'next/navigation';

export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  redirect(`/dashboard/${resolvedParams.id}`);
}

