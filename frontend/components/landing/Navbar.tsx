'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { authService } from '@/lib/services/authService';

export function Navbar() {
  const [isAuth, setIsAuth] = React.useState(false);

  React.useEffect(() => {
    setIsAuth(authService.isAuthenticated());
  }, []);

  return (
    <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
      {/* Left Navigation Links */}
      <nav className="flex items-center space-x-8 text-sm font-medium text-slate-600">
        <a
          href="#approach"
          className="hover:text-slate-900 transition-colors"
        >
          Our approach
        </a>
        <a
          href="#therapists"
          className="hover:text-slate-900 transition-colors"
        >
          Your therapists
        </a>
      </nav>

      {/* Centered Serif Wordmark */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <Link href="/" className="text-3xl font-serif tracking-tight text-slate-900 select-none">
          hope.
        </Link>
      </div>

      {/* Right Navigation / Auth Links */}
      <div className="flex items-center space-x-6">
        {isAuth ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-slate-300 text-sm font-medium text-slate-800 bg-white/80 hover:bg-white hover:border-slate-400 shadow-sm transition-all"
          >
            Go to space
            <ArrowUpRight className="w-4 h-4 text-slate-500" />
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-slate-300 text-sm font-medium text-slate-800 bg-white/80 hover:bg-white hover:border-slate-400 shadow-sm transition-all"
            >
              Find your space
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
