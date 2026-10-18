'use client';

import { useEffect, useMemo } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { ViewController } from '@/components/app/view-controller';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = String(reason?.message || reason || '');
      const name = String(reason?.name || '');
      const stack = String(reason?.stack || '');

      // Guard against normal LiveKit disconnect/teardown and Chrome extension fetch aborts during End Session
      if (
        name === 'PublishTrackError' ||
        msg.includes('PublishTrackError') ||
        msg.includes('engine not connected') ||
        msg.includes('engine not connected within timeout') ||
        (msg.includes('Failed to fetch') &&
          (stack.includes('injected.js') ||
            stack.includes('chrome-extension') ||
            stack.includes('token') ||
            stack.includes('fetch')))
      ) {
        event.preventDefault();
        console.warn('ℹ️ [Handled Voice Teardown Warning]:', msg);
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  return null;
}

interface AppProps {
  tokenServerId?: string;
  tokenEndpoint: string;
  agentName?: string;
  isVideoInputSupported: boolean;
  therapistTitle?: string;
}

export function App({
  tokenServerId,
  tokenEndpoint,
  agentName,
  isVideoInputSupported,
  therapistTitle,
}: AppProps) {
  const effectiveTokenEndpoint = useMemo(() => {
    if (!tokenEndpoint || tokenServerId) return tokenEndpoint;
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const url = new URL(tokenEndpoint, origin);
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('hope_current_user');
        let resolvedId = '';
        let resolvedName = '';
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            resolvedId = parsed?.id;
            resolvedName = parsed?.name || parsed?.email?.split('@')[0];
          } catch {}
        }
        if (!resolvedId) {
          const cookieMatch = document.cookie.match(/(^| )cbt_patient_id=([^;]+)/);
          if (cookieMatch) resolvedId = decodeURIComponent(cookieMatch[2]);
        }
        if (!resolvedId) {
          resolvedId = '0ccbaecf-43fd-4b7f-91e0-d32233482b07';
        }
        if (!url.searchParams.has('userId')) {
          url.searchParams.set('userId', resolvedId);
        }
        if (resolvedName && !url.searchParams.has('userName')) {
          url.searchParams.set('userName', resolvedName);
        }
      }
      return url.pathname + url.search;
    } catch {
      return tokenEndpoint;
    }
  }, [tokenEndpoint, tokenServerId]);

  const tokenSource = useMemo(
    () =>
      tokenServerId
        ? TokenSource.developmentTokenServer(tokenServerId)
        : TokenSource.endpoint(effectiveTokenEndpoint),
    [tokenServerId, effectiveTokenEndpoint]
  );

  const session = useSession(tokenSource, {
    agentName: agentName || 'my-agent-local',
    agentConnectTimeoutMilliseconds: 45000,
  });

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <main className="relative h-dvd w-full overflow-hidden">
        <ViewController
          isVideoInputSupported={isVideoInputSupported}
          therapistTitle={therapistTitle}
        />
      </main>
      <StartAudioButton label="🔊 Click to unmute audio" className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg" />
      <Toaster
        icons={{
          warning: <WarningIcon weight="bold" />,
        }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
