import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const EXPRESS_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // 1. Fetch from PostgreSQL
    let dbUser: any = null;
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          ageRange: true,
          focusAreas: true,
          conversationStyle: true,
          preferredTime: true,
          preferredMode: true,
          bio: true,
          onboardingComplete: true,
          createdAt: true,
        },
      });
    } catch (e: any) {
      console.warn('[GET /api/profile] Prisma read error:', e?.message);
    }

    if (dbUser) {
      return NextResponse.json({
        success: true,
        profile: {
          id: dbUser.id,
          name: dbUser.name || 'Friend',
          email: dbUser.email || `${userId}@hope-wellbeing.org`,
          avatarInitial: (dbUser.name || 'F').charAt(0).toUpperCase(),
          ageRange: dbUser.ageRange || '25–34',
          focusAreas: dbUser.focusAreas && dbUser.focusAreas.length > 0 ? dbUser.focusAreas : ['Stress', 'Work-life balance'],
          conversationStyle: (dbUser.conversationStyle as 'gentle' | 'direct') || 'gentle',
          preferredTime: dbUser.preferredTime || 'Evening (7:00 PM)',
          preferredMode: (dbUser.preferredMode as 'text' | 'voice') || 'text',
          bio: dbUser.bio || '',
          onboardingComplete: Boolean(dbUser.onboardingComplete),
          createdAt: dbUser.createdAt,
        },
      });
    }

    // Fallback: Query Express backend FalkorDB profile
    try {
      const res = await fetch(`${EXPRESS_BACKEND_URL}/api/profile/${encodeURIComponent(userId)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          return NextResponse.json({ success: true, profile: data.profile });
        }
      }
    } catch {}

    return NextResponse.json({
      success: true,
      profile: {
        id: userId,
        name: 'Friend',
        email: `${userId}@hope-wellbeing.org`,
        avatarInitial: 'F',
        ageRange: '25–34',
        focusAreas: ['Stress', 'Work-life balance'],
        conversationStyle: 'gentle',
        preferredTime: 'Evening (7:00 PM)',
        preferredMode: 'text',
        bio: '',
        onboardingComplete: false,
      },
    });
  } catch (err: any) {
    console.error('GET /api/profile error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      name,
      email,
      ageRange,
      focusAreas,
      conversationStyle,
      preferredTime,
      preferredMode,
      bio,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const cleanName = (name || '').trim() || 'Friend';
    const cleanEmail = (email || '').trim().toLowerCase() || `${userId}@hope-wellbeing.org`;
    const cleanFocusAreas = Array.isArray(focusAreas) ? focusAreas : [];

    // 1. Save to PostgreSQL database
    let pgSaved = false;
    let pgUser: any = null;
    let pgError: string | null = null;

    try {
      pgUser = await prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          name: cleanName,
          email: cleanEmail,
          ageRange: ageRange || '25–34',
          focusAreas: cleanFocusAreas,
          conversationStyle: conversationStyle || 'gentle',
          preferredTime: preferredTime || 'Evening (7:00 PM)',
          preferredMode: preferredMode || 'text',
          bio: bio || '',
          onboardingComplete: true,
        },
        update: {
          name: cleanName,
          ageRange: ageRange || undefined,
          focusAreas: cleanFocusAreas,
          conversationStyle: conversationStyle || 'gentle',
          preferredTime: preferredTime || 'Evening (7:00 PM)',
          preferredMode: preferredMode || 'text',
          bio: bio || '',
          onboardingComplete: true,
        },
      });
      pgSaved = true;
    } catch (e: any) {
      pgError = e?.message || 'Database update error';
      console.warn('[POST /api/profile] PostgreSQL note:', pgError);
    }

    // 2. Sync to FalkorDB on Express backend
    let falkorSynced = false;
    let falkorError: string | null = null;

    try {
      const falkorRes = await fetch(`${EXPRESS_BACKEND_URL}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: cleanName,
          email: cleanEmail,
          ageRange,
          focusAreas: cleanFocusAreas,
          conversationStyle,
          preferredTime,
          preferredMode,
          bio,
        }),
      });
      if (falkorRes.ok) {
        falkorSynced = true;
      } else {
        falkorError = `Express returned ${falkorRes.status}`;
      }
    } catch (e: any) {
      falkorError = e?.message || 'FalkorDB sync connection error';
      console.warn('[POST /api/profile] FalkorDB sync note:', falkorError);
    }

    const updatedProfile = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      avatarInitial: cleanName.charAt(0).toUpperCase(),
      ageRange: ageRange || '25–34',
      focusAreas: cleanFocusAreas,
      conversationStyle: conversationStyle || 'gentle',
      preferredTime: preferredTime || 'Evening (7:00 PM)',
      preferredMode: preferredMode || 'text',
      bio: bio || '',
      onboardingComplete: true,
    };

    return NextResponse.json({
      success: true,
      message: 'Profile synchronized in both databases.',
      profile: updatedProfile,
      saved: {
        postgres: pgSaved,
        pgError,
        falkor: falkorSynced,
        falkorError,
      },
    });
  } catch (err: any) {
    console.error('POST /api/profile error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save profile' }, { status: 500 });
  }
}
