'use client';

import { Heart } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setSaved } from '@/app/actions/lists';
import { useToast } from './toast';
import { cx } from './ui';

/**
 * Figma "Favorite button": white circle, heart turns red when saved, toast "Saved to your list" with View.
 * Signed-out visitors are sent to sign in and come back here.
 */
export function SaveButton({ propertyId, title, saved: initial, signedIn, size = 'lg', bare }: { propertyId: string; title: string; saved: boolean; signedIn: boolean; size?: 'lg' | 'sm'; bare?: boolean }) {
  const [saved, setSavedState] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const path = usePathname();
  const toast = useToast();
  const toggle = () => {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    const next = !saved;
    setSavedState(next);
    start(async () => {
      const r = await setSaved(propertyId, next);
      if (!r.ok) {
        setSavedState(!next);
        toast({ kind: 'error', title: 'Couldn’t update Saved', message: r.error });
        return;
      }
      toast(next ? { title: 'Saved to your list', message: title, icon: Heart, action: { label: 'View', onClick: () => router.push('/saved') } } : { title: 'Removed from Saved', message: title, icon: Heart });
    });
  };
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from Saved` : `Save ${title}`}
      className={cx('relative z-10 grid shrink-0 place-items-center rounded-full transition-transform active:scale-95', !bare && 'bg-surface', size === 'lg' ? 'size-11' : 'size-9')}
    >
      <Heart size={size === 'lg' ? 20 : 19} className={saved ? 'fill-heart text-heart' : 'text-text'} aria-hidden />
    </button>
  );
}
