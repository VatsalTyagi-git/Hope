import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const expressUrl = 'http://localhost:5000/api/sessions/finalize';
    const backendRes = await fetch(expressUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      return NextResponse.json(
        { success: false, error: errText || 'Session finalization failed' },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API /api/sessions/finalize Proxy Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Backend service unreachable' },
      { status: 500 }
    );
  }
}
