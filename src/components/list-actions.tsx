'use client';

import { Heart, History, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { clearRecentlyViewed, setCompared, setSaved } from '@/app/actions/lists';
import { ConfirmDialog } from './overlays';
import { useToast } from './toast';

/** Red heart on Saved rows; asks before removing (Figma "Saved Properties / Remove Confirm"). */
export function UnsaveButton({ propertyId, title }: { propertyId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Remove ${title} from Saved`} className="relative z-10 grid size-9 shrink-0 place-items-center">
        <Heart size={19} className="fill-heart text-heart" aria-hidden />
      </button>
      <ConfirmDialog
        open={open}
        icon={Trash2}
        title="Remove from Saved?"
        message={`${title} will be removed from your saved homes and from compare.`}
        confirmLabel="Remove"
        loading={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const r = await setSaved(propertyId, false);
            if (!r.ok) {
              toast({ kind: 'error', title: 'Couldn’t remove', message: r.error });
              return;
            }
            setOpen(false);
            toast({ title: 'Removed from Saved', message: title, icon: Heart });
            router.refresh();
          })
        }
      />
    </>
  );
}

export function RemoveFromCompare({ propertyId, title }: { propertyId: string; title: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Remove ${title} from compare`}
      onClick={() =>
        start(async () => {
          const r = await setCompared(propertyId, false);
          if (!r.ok) toast({ kind: 'error', title: 'Couldn’t remove', message: r.error });
          else {
            toast({ title: 'Removed from compare', message: title });
            router.refresh();
          }
        })
      }
      className="absolute top-2 right-2 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-ink"
    >
      <X size={18} aria-hidden />
    </button>
  );
}

/** "Clear history" on Recently viewed (Figma "Clear Confirm"). */
export function ClearHistoryButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="t-body-m text-error">
        Clear history
      </button>
      <ConfirmDialog
        open={open}
        icon={History}
        title="Clear recently viewed?"
        message="Homes you’ve opened in the last 7 days will be removed from this list. Saved homes aren’t affected."
        confirmLabel="Clear history"
        loading={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const r = await clearRecentlyViewed();
            if (!r.ok) {
              toast({ kind: 'error', title: 'Couldn’t clear', message: r.error });
              return;
            }
            setOpen(false);
            toast({ title: 'History cleared' });
            router.refresh();
          })
        }
      />
    </>
  );
}
