'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Eye, EyeOff, Heart, Loader2 } from 'lucide-react';
import { SiteHeader } from '@/components/brand/hope-brand';
import { SideArt } from '@/components/brand/side-art';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

export function AuthScreen({ signup = false }: { signup?: boolean }) {
  const router = useRouter();
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || user) {
    return (
      <div className="auth-page theme-purple min-h-screen flex flex-col items-center justify-center">
        <SideArt />
        <SiteHeader />
        <main className="auth-form-wrap flex flex-col items-center text-center">
          <Loader2 className="size-8 animate-spin text-primary mb-3" />
          <h2 className="text-foreground font-serif text-xl">Entering your Hope space…</h2>
          <p className="text-muted-foreground text-xs mt-1">You are already signed in. Taking you to your dashboard.</p>
        </main>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (signup) {
        const res = await signUp(email, password, { fullName: name });
        if (res.error) {
          setError(res.error.message);
          setLoading(false);
          return;
        }
        if (res.session) {
          router.push('/dashboard');
          router.refresh();
        } else {
          setSubmittedMessage(
            'Check your inbox! We sent a confirmation link to finalize your space.'
          );
        }
      } else {
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error.message);
          setLoading(false);
          return;
        }
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await signInWithGoogle('/dashboard');
      if (res.error) {
        setError(res.error.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page theme-purple">
      <SideArt />
      <SiteHeader />
      <main className="auth-form-wrap">
        <span className="agent-mark">
          <Heart size={17} />
        </span>
        <h1>{signup ? 'A space of your own.' : 'Welcome back.'}</h1>
        <p>
          {signup ? 'A small step toward a little more you.' : 'Your story can pick up right here.'}
        </p>

        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-xl border px-4 py-2.5 text-xs">
            {error}
          </div>
        )}

        {submittedMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-600 dark:text-emerald-400">
            {submittedMessage}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {signup && (
            <>
              <label htmlFor="name">Your name</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="What should we call you?"
                required
              />
            </>
          )}

          <label htmlFor="email">Email address</label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-field">
            <Input
              id="password"
              type={visible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={signup ? 'new-password' : 'current-password'}
              minLength={8}
              placeholder={signup ? 'At least 8 characters' : 'Your password'}
              required
            />
            <Button
              variant="ghost"
              type="button"
              size="icon"
              aria-label={visible ? 'Hide password' : 'Show password'}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff /> : <Eye />}
            </Button>
          </div>

          <Button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                {signup ? 'Creating your account…' : 'Logging in…'}
              </span>
            ) : (
              <>
                {signup ? 'Create your account' : 'Log in'}
                <ArrowUpRight />
              </>
            )}
          </Button>

          <div className="relative my-2 flex items-center justify-center">
            <div className="border-border/60 absolute inset-0 flex items-center border-t" />
            <span className="bg-card text-muted-foreground relative px-3 text-[11px] tracking-wider uppercase">
              or
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="border-border/80 hover:bg-accent w-full gap-2 rounded-full text-xs font-medium"
          >
            <svg className="size-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </Button>
        </form>

        <div className="auth-switch">
          {signup ? 'Already have a space here? ' : 'New to Hope? '}
          <Link href={signup ? '/login' : '/signup'}>
            {signup ? 'Log in' : 'Create an account'}
          </Link>
        </div>

        <div className="auth-notice">
          Hope offers AI-guided wellbeing support, not clinical care.
          <br />
          Your personal space is private, secure, and confidential.
        </div>
      </main>
    </div>
  );
}
