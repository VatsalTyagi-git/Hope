import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST() {
  const cookieStore = await cookies();

  // Exhaustive list of auth and session cookies
  const cookiesToClear = [
    'cbt_patient_id',
    'authjs.session-token',
    '__Secure-authjs.session-token',
    'authjs.csrf-token',
    '__Host-authjs.csrf-token',
    'authjs.callback-url',
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
    'next-auth.callback-url',
  ];

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  for (const name of cookiesToClear) {
    try {
      cookieStore.delete(name);
    } catch {}

    // Explicitly attach expired cookie headers to ensure the browser wipes them immediately
    response.cookies.set({
      name,
      value: '',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'lax',
    });
  }

  return response;
}

export async function GET() {
  return POST();
}
