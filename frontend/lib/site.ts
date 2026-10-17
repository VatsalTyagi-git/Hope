import type { Metadata } from 'next';

export function constructMetadata({
  title = 'Hope — A little space for yourself',
  description = 'AI-guided conversations, daily practices, and a space to feel heard. Meet your weekly, daily, and anytime wellbeing companions.',
}: {
  title?: string;
  description?: string;
} = {}): Metadata {
  return {
    title: `${title} — Hope`,
    description,
    openGraph: {
      title: `${title} — Hope`,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — Hope`,
      description,
    },
  };
}
