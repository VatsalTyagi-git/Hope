import { NextResponse } from 'next/server';
import {
  AccessToken,
  type AccessTokenOptions,
  RoomAgentDispatch,
  RoomConfiguration,
  type VideoGrant,
} from 'livekit-server-sdk';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// don't cache the results
export const revalidate = 0;

export async function GET(req: Request) {
  return handleToken(req, {});
}

export async function POST(req: Request) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional
  }
  return handleToken(req, body);
}

async function handleToken(req: Request, body: any) {
  // make an exception for the vercel preview environment
  if (process.env.NODE_ENV !== 'development' && process.env.IS_VERCEL_PREVIEW !== 'true') {
    throw new Error(
      'THIS API ROUTE IS INSECURE. DO NOT USE THIS ROUTE IN PRODUCTION WITHOUT AN AUTHENTICATION LAYER.'
    );
  }

  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    const targetAgentName = process.env.AGENT_NAME || 'my-agent-local';

    // Consistent patient identity so therapeutic graph memory persists across sessions
    const url = new URL(req.url);
    const queryUserId = url.searchParams.get('userId');
    const bodyUserId = body?.userId || body?.user_id;

    // Check cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/cbt_patient_id=([^;]+)/);
    const cookieUserId = match ? decodeURIComponent(match[1]) : null;

    // Extract requested session role: weekly, daily, or companion
    const queryMode = url.searchParams.get('mode') || url.searchParams.get('type');
    const bodyMode = body?.mode || body?.type;
    const rawMode = (queryMode || bodyMode || 'weekly').toLowerCase();
    const isInitial =
      url.searchParams.get('initial') === 'true' ||
      body?.initial === true ||
      rawMode === 'initial';

    const sessionMode = isInitial
      ? 'initial'
      : ['daily', 'companion', 'checkin'].includes(rawMode)
      ? (rawMode === 'checkin' ? 'companion' : rawMode)
      : 'weekly';

    const participantIdentity =
      queryUserId || bodyUserId || cookieUserId || process.env.DEFAULT_PATIENT_ID || 'patient_vatsal';

    const queryUserName = url.searchParams.get('userName');
    const bodyUserName = body?.userName || body?.name;
    const participantName = queryUserName || bodyUserName || 'Vatsal';

    const requestedRoomName =
      body?.room_name ||
      body?.roomName ||
      url.searchParams.get('roomName') ||
      url.searchParams.get('room');

    const sessionSuffix = Math.random().toString(36).substring(2, 8);
    const roomName =
      requestedRoomName ||
      `therapy_${participantIdentity}_${sessionMode}_${sessionSuffix}`;

    const metadataPayload = JSON.stringify({
      mode: sessionMode,
      type: isInitial ? 'weekly' : sessionMode,
      isInitialSession: isInitial,
      userName: participantName,
    });

    // Parse room config from request body or construct standard RoomConfiguration
    const roomConfig = body?.room_config
      ? RoomConfiguration.fromJson(body.room_config, { ignoreUnknownFields: true })
      : new RoomConfiguration();

    // Ensure agent dispatch with target agent name and session metadata is included
    if (!roomConfig.agents || roomConfig.agents.length === 0) {
      roomConfig.agents = [
        new RoomAgentDispatch({
          agentName: targetAgentName,
          metadata: metadataPayload,
        }),
      ];
    } else {
      for (const ag of roomConfig.agents) {
        if (!ag.agentName) ag.agentName = targetAgentName;
        if (!ag.metadata) ag.metadata = metadataPayload;
      }
    }

    const participantToken = await createParticipantToken(
      {
        identity: participantIdentity,
        name: participantName,
        metadata: metadataPayload,
      },
      roomName,
      roomConfig
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantName,
      participantToken,
    };
    const headers = new Headers({
      'Cache-Control': 'no-store',
    });
    const response = NextResponse.json(data, { headers });
    response.cookies.set('cbt_patient_id', participantIdentity, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  roomConfig: RoomConfiguration | undefined
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  if (roomConfig) {
    at.roomConfig = roomConfig;
  }

  return at.toJwt();
}
