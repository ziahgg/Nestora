'use client';

import { Share2 } from 'lucide-react';

import { useToast } from './toast';
import { IconButton } from './ui';

/** Shares a page link (Web Share API, falling back to copying the link). */
export function ShareButton({ text, path, look = 'surface', label = 'Share' }: { text: string; path?: string; look?: 'surface' | 'glass'; label?: string }) {
  const toast = useToast();
  const share = async () => {
    const url = new URL(path ?? window.location.pathname, window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: 'Nestora', text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast({ title: 'Link copied', message: text });
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') toast({ kind: 'error', title: 'Couldn’t share', message: 'Sharing isn’t available here.' });
    }
  };
  return <IconButton icon={Share2} label={label} look={look} onClick={share} />;
}
