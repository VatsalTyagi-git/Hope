'use client';

import { useEffect, useRef } from 'react';
import { useSessionContext } from '@livekit/components-react';
import { HopeVoiceSession } from '@/components/app/hope-voice-session';

interface ViewControllerProps {
  isVideoInputSupported?: boolean;
  therapistTitle?: string;
}

export function ViewController({ therapistTitle }: ViewControllerProps) {
  const session = useSessionContext();
  const { isConnected, start } = session;
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current && !isConnected) {
      startedRef.current = true;
      start().catch((err) => {
        console.error('[LiveKit Voice Auto-Connect Error]:', err);
        startedRef.current = false;
      });
    }
  }, [isConnected, start]);

  return (
    <HopeVoiceSession
      therapistTitle={therapistTitle}
      className="fixed inset-0"
    />
  );
}
