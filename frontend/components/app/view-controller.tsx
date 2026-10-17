'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext } from '@livekit/components-react';
import { HopeVoiceSession } from '@/components/app/hope-voice-session';
import { WelcomeView } from '@/components/app/welcome-view';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionVoiceSession = motion.create(HopeVoiceSession);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.4,
    ease: 'easeInOut',
  },
};

interface ViewControllerProps {
  isVideoInputSupported?: boolean;
  therapistTitle?: string;
}

export function ViewController({ therapistTitle }: ViewControllerProps) {
  const { isConnected, start } = useSessionContext();

  return (
    <AnimatePresence mode="wait">
      {/* Welcome view before connecting */}
      {!isConnected && (
        <MotionWelcomeView
          key="welcome"
          {...VIEW_MOTION_PROPS}
          startButtonText="Start voice session"
          onStartCall={start}
          therapistTitle={therapistTitle}
        />
      )}

      {/* Connected Voice Agent Session View */}
      {isConnected && (
        <MotionVoiceSession
          key="voice-session"
          {...VIEW_MOTION_PROPS}
          therapistTitle={therapistTitle}
          className="fixed inset-0"
        />
      )}
    </AnimatePresence>
  );
}
