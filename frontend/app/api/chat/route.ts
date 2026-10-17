import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const backendUrl = process.env.EXPRESS_BACKEND_URL || 'http://localhost:5000/api/chat';
    const resp = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      return NextResponse.json(
        { success: false, error: errorText || 'Failed to generate chat response' },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API /api/chat Proxy Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Chat service unavailable' },
      { status: 500 }
    );
  }
}
