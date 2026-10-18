import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authjsToken =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value ||
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  const patientId = request.cookies.get('cbt_patient_id')?.value;

  const isUserLoggedIn = Boolean(
    (authjsToken && authjsToken.trim() !== '') ||
    (patientId && patientId.trim() !== '')
  );

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');

  if (isUserLoggedIn && isAuthRoute) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/voice') ||
    pathname.startsWith('/chat');

  if (!isUserLoggedIn && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/signup', '/dashboard/:path*', '/profile/:path*', '/voice/:path*', '/chat/:path*'],
};
