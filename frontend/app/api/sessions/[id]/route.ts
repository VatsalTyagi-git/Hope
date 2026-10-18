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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    let pgDeleted = false;
    let pgError: string | null = null;

    // 1. Direct Prisma delete in PostgreSQL
    try {
      await prisma.message.deleteMany({ where: { sessionId: id } }).catch(() => {});
      const delRes = await prisma.session.delete({ where: { id } }).catch((err: any) => {
        if (err?.code !== 'P2025') throw err;
        return null;
      });
      if (delRes) pgDeleted = true;
    } catch (dbErr: any) {
      pgError = dbErr?.message || 'Prisma delete error';
      console.warn(`[API DELETE /api/sessions/${id}] Direct Prisma note:`, pgError);
    }

    // 2. Forward to Express backend to purge from FalkorDB knowledge graph and memory
    let backendData = null;
    try {
      const expressUrl = `http://localhost:5000/api/sessions/${encodeURIComponent(id)}`;
      const backendRes = await fetch(expressUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (backendRes.ok) {
        backendData = await backendRes.json();
      }
    } catch (proxyErr: any) {
      console.warn(`[API DELETE /api/sessions/${id}] Express proxy note:`, proxyErr?.message);
    }

    return NextResponse.json({
      success: true,
      sessionId: id,
      postgres: { deleted: pgDeleted, error: pgError },
      backend: backendData,
    });
  } catch (err: any) {
    console.error(`[API DELETE /api/sessions/[id]] Unhandled error:`, err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete session' },
      { status: 500 }
    );
  }
}
