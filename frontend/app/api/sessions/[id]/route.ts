import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    let session = null;
    let dbSuccess = false;

    // 1. Direct Prisma query
    try {
      session = await prisma.session.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (session) dbSuccess = true;
    } catch (dbErr: any) {
      console.warn(`[API /api/sessions/${id}] Direct Prisma error:`, dbErr?.message);
    }

    // 2. Fallback to Express backend if not found or direct DB temporarily unreachable
    if (!dbSuccess || !session) {
      try {
        const expressUrl = `http://localhost:5000/api/sessions/${encodeURIComponent(id)}`;
        const backendRes = await fetch(expressUrl, { cache: 'no-store' });
        if (backendRes.ok) {
          const data = await backendRes.json();
          if (data.session) {
            session = data.session;
          }
        }
      } catch (proxyErr: any) {
        console.warn(`[API /api/sessions/${id}] Express proxy note:`, proxyErr?.message);
      }
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: `Session ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (err: any) {
    console.error(`[API /api/sessions/[id]] Unhandled error:`, err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
