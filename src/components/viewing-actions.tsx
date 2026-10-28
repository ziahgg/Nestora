'use client';

import { CalendarX2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { cancelViewing } from '@/app/actions/rentals';
import { ConfirmDialog } from './overlays';
import { useToast } from './toast';
import { Button, ButtonLink } from './ui';

/** Figma "Appointment / Details" footer: Cancel (with confirm) and Reschedule. */
export function ViewingActions({ viewingId, when }: { viewingId: string; when: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <Button variant="danger" onClick={() => setConfirm(true)} className="flex-1 gap-1.5 px-2 whitespace-nowrap">
        Cancel
      </Button>
      <ButtonLink href={`/viewings/${viewingId}/reschedule`} icon={RefreshCw} className="flex-[1.8] gap-1.5 px-2 whitespace-nowrap">
        Reschedule
      </ButtonLink>
      <ConfirmDialog
        open={confirm}
        icon={CalendarX2}
        title="Cancel this viewing?"
        message={`Your viewing on ${when} will be cancelled and the time is released for others.`}
        confirmLabel="Cancel viewing"
        loading={pending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          start(async () => {
            const r = await cancelViewing({ viewingId, reason: '' });
            if (!r.ok) {
              toast({ kind: 'error', title: 'Couldn’t cancel', message: r.error });
              return;
            }
            setConfirm(false);
            toast({ title: 'Viewing cancelled' });
            router.refresh();
          })
        }
      />
    </>
  );
}
