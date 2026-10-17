'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Synchronize with Hope's persistent theme key if set
    try {
      const saved = localStorage.getItem('hope-theme');
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
      }
    } catch {}
  }, [setTheme]);

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('hope-theme', nextTheme);
    } catch {}
  };

  return (
    <Button
      variant="outline"
      size="icon"
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'border-border/80 bg-card/80 text-foreground hover:bg-accent hover:text-foreground size-9 shrink-0 rounded-full border backdrop-blur-xs transition-colors',
        className
      )}
    >
      {isDark ? (
        <Sun className="text-foreground size-4 transition-transform duration-200" />
      ) : (
        <Moon className="text-foreground size-4 transition-transform duration-200" />
      )}
    </Button>
  );
}
