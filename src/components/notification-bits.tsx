'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useTransition } from 'react';

import { markNotificationsRead } from '@/app/actions/account';
import { useToast } from './toast';

export function MarkAllRead({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const r = await markNotificationsRead('all');
          if (!r.ok) toast({ kind: 'error', title: 'Couldn’t update', message: r.error });
          router.refresh();
        })
      }
      className="t-body-m disabled:text-text-muted"
    >
      Mark all as read
    </button>
  );
}

/** Opening a notification marks it read. */
export function MarkRead({ id, unread }: { id: string; unread: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!unread) return;
    void markNotificationsRead([id]).then(() => router.refresh());
  }, [id, unread, router]);
  return null;
}
