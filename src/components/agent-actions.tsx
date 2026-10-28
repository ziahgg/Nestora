'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { cancelViewing, closeInquiry, sendMessage } from '@/app/actions/rentals';
import { useToast } from './toast';
import { Button, TextArea } from './ui';

/** Agent queue: answer an inquiry (the first answer marks it Responded) or close it. */
export function AgentInquiryActions({ inquiryId }: { inquiryId: string }) {
  const id = useId();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; fields?: Record<string, string> }>, done: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.fields?.body ?? r.error);
        return;
      }
      setBody('');
      setError(undefined);
      toast({ title: done });
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-2">
      <TextArea id={`${id}-reply`} label="Reply" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} error={error} className="[&_textarea]:min-h-[72px]" />
      <div className="flex gap-2">
        <Button size="sm" loading={pending} onClick={() => run(() => sendMessage({ inquiryId, body }), 'Reply sent')}>
          Send reply
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => closeInquiry(inquiryId, body), 'Inquiry closed')}>
          Close inquiry
        </Button>
      </div>
    </div>
  );
}

export function AgentCancelViewing({ viewingId }: { viewingId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <Button
      size="sm"
      variant="danger"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await cancelViewing({ viewingId, reason: 'The agent cancelled this time.' });
          if (!r.ok) toast({ kind: 'error', title: 'Couldn’t cancel', message: r.error });
          else {
            toast({ title: 'Viewing cancelled' });
            router.refresh();
          }
        })
      }
    >
      Cancel viewing
    </Button>
  );
}
