'use client';

import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { ThemeToggle } from '@/components/brand/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="Hope home" className={`brand ${compact ? 'brand-small' : ''}`}>
      hope<span>.</span>
    </Link>
  );
}

export function SiteHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="site-header">
      <nav className="nav-start" aria-label="Main navigation">
        <Link href="/approach">Our approach</Link>
        <Link href="/therapists">Your therapists</Link>
      </nav>
      <Brand />
      <nav className="nav-end" aria-label="Account navigation">
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:inline-flex">
              <User className="size-3.5" />
              {user.email?.split('@')[0]}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-muted-foreground hover:text-foreground h-8 gap-1 rounded-full px-2.5 text-xs"
              title="Sign out"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        ) : (
          <Link href="/login" className="login-link">
            Log in
          </Link>
        )}
        <Button asChild variant="outline" className="nav-cta">
          <Link href="/dashboard">
            Find your space <span aria-hidden="true">↗</span>
          </Link>
        </Button>
        <ThemeToggle />
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Brand />
      <p>A little more space. A little more you.</p>
      <div>
        <Link href="/faq">Questions?</Link>
        <span>© 2026 Hope</span>
      </div>
    </footer>
  );
}
