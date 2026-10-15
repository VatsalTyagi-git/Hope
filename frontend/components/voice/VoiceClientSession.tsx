'use client';

import React, { useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { HopeVoiceRoom } from '@/components/voice/HopeVoiceRoom';
import { authService } from '@/lib/services/authService';

export function VoiceClientSession() {
  const searchParams = useSearchParams();
  const rawType = (searchParams.get('type') || searchParams.get('mode') || 'companion').toLowerCase();
  const isInitial = searchParams.get('initial') === 'true' || rawType === 'initial';
  const queryUserName = searchParams.get('userName');
  const { data: session } = useSession();

  const queryUserId = searchParams.get('userId');
  const localUser = authService.getCurrentUser();
  const userId = queryUserId || session?.user?.id || localUser?.id || 'patient_vatsal';
  const userName = queryUserName || session?.user?.name || localUser?.name || 'Vatsal';

  const sessionType: 'weekly' | 'daily' | 'companion' = useMemo(() => {
    if (rawType === 'weekly' || isInitial) return 'weekly';
    if (rawType === 'daily') return 'daily';
    return 'companion';
  }, [rawType, isInitial]);

  const companionTitle = useMemo(() => {
    if (isInitial && sessionType === 'weekly') {
      return 'Initial Intake Session';
    }
    switch (sessionType) {
      case 'weekly':
        return 'Weekly main therapist';
      case 'daily':
        return 'Daily exercise therapist';
      default:
        return 'On-demand companion';
    }
  }, [sessionType, isInitial]);

  useEffect(() => {
    document.title = `${companionTitle} | hope.`;
  }, [companionTitle]);

  return (
    <HopeVoiceRoom
      userId={userId}
      userName={userName}
      companionTitle={companionTitle}
      sessionType={sessionType}
      isInitial={isInitial}
      onDisconnected={() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard';
        }
      }}
    />
  );
}
