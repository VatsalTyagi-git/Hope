import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let sessions: any[] = [];
    let dbSuccess = false;

    // 1. Primary: Direct PostgreSQL query via Prisma
    try {
      const where = userId ? { userId } : {};
      sessions = await prisma.session.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      dbSuccess = true;
    } catch (dbErr: any) {
      console.warn('[API /api/sessions] Direct Prisma query error:', dbErr?.message);
    }

    // 2. Secondary: Fallback to Express backend if direct Prisma connection experienced transient network issue
    if (!dbSuccess || sessions.length === 0) {
      try {
        const expressUrl = `http://localhost:5000/api/sessions/transcripts${
          userId ? `?userId=${encodeURIComponent(userId)}` : ''
        }`;
        const backendRes = await fetch(expressUrl, { cache: 'no-store' });
        if (backendRes.ok) {
          const data = await backendRes.json();
          if (Array.isArray(data.sessions) && data.sessions.length > 0) {
            sessions = data.sessions;
          }
        }
      } catch (proxyErr: any) {
        console.warn('[API /api/sessions] Express backend proxy note:', proxyErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (err: any) {
    console.error('[API /api/sessions] Unhandled error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
