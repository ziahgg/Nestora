'use client';

import { CalendarDays, Copy, Ellipsis, House, Reply, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { sendMessage, withdrawInquiry } from '@/app/actions/rentals';
import { ConfirmDialog, Sheet } from './overlays';
import { useToast } from './toast';
import { Button, ButtonLink, IconButton, TextArea } from './ui';

/** "…" menu on Inquiry details. */
export function InquiryMenu({ reference, propertyHref, canWithdraw, inquiryId }: { reference: string; propertyHref: string; canWithdraw: boolean; inquiryId: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  return (
    <>
      <IconButton icon={Ellipsis} label="More actions" onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title="Inquiry">
        <ul className="flex flex-col pb-2">
          <li>
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 rounded-[14px] px-2 t-item hover:bg-surface-muted"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(reference);
                  toast({ title: 'Reference copied', message: reference });
                } catch {
                  toast({ kind: 'error', title: 'Couldn’t copy', message: reference });
                }
                setOpen(false);
              }}
            >
              <Copy size={20} aria-hidden /> Copy reference
            </button>
          </li>
          <li>
            <Link href={propertyHref} className="flex min-h-12 items-center gap-3 rounded-[14px] px-2 t-item hover:bg-surface-muted">
              <House size={20} aria-hidden /> View home
            </Link>
          </li>
          {canWithdraw ? (
            <li>
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 rounded-[14px] px-2 t-item text-error hover:bg-error-soft"
                onClick={() => {
                  setOpen(false);
                  setConfirm(true);
                }}
              >
                <Undo2 size={20} aria-hidden /> Withdraw inquiry
              </button>
            </li>
          ) : null}
        </ul>
      </Sheet>
      <WithdrawDialog open={confirm} onClose={() => setConfirm(false)} inquiryId={inquiryId} />
    </>
  );
}

function WithdrawDialog({ open, onClose, inquiryId }: { open: boolean; onClose: () => void; inquiryId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <ConfirmDialog
      open={open}
      icon={Undo2}
      title="Withdraw inquiry?"
      message="The agent will see it as withdrawn and any viewing booked through it is cancelled. You can send a new inquiry later."
      confirmLabel="Withdraw"
      loading={pending}
      onCancel={onClose}
      onConfirm={() =>
        start(async () => {
          const r = await withdrawInquiry(inquiryId);
          if (!r.ok) {
            toast({ kind: 'error', title: 'Couldn’t withdraw', message: r.error });
            return;
          }
          onClose();
          toast({ title: 'Inquiry withdrawn' });
          router.refresh();
        })
      }
    />
  );
}

/** Footer actions on Inquiry details: Withdraw / Reply, plus Schedule viewing or the booked viewing. */
export function InquiryFooter({ inquiryId, status, scheduleHref, viewingHref }: { inquiryId: string; status: string; scheduleHref: string | null; viewingHref: string | null }) {
  const [withdraw, setWithdraw] = useState(false);
  const [reply, setReply] = useState(false);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const id = useId();

  const primary = viewingHref ? (
    <ButtonLink href={viewingHref} icon={CalendarDays} className="flex-[1.6] gap-1.5 px-2 whitespace-nowrap">
      View appointment
    </ButtonLink>
  ) : scheduleHref ? (
    <ButtonLink href={scheduleHref} icon={CalendarDays} className="flex-[1.6] gap-1.5 px-2 whitespace-nowrap">
      Schedule viewing
    </ButtonLink>
  ) : null;

  return (
    <>
      {status === 'awaiting_response' ? (
        <Button variant="danger" onClick={() => setWithdraw(true)} className="flex-1 gap-1.5 px-2 whitespace-nowrap">
          Withdraw
        </Button>
      ) : (
        <Button variant="secondary" icon={Reply} onClick={() => setReply(true)} className="flex-1 gap-1.5 px-2 whitespace-nowrap">
          Reply
        </Button>
      )}
      {primary}
      <WithdrawDialog open={withdraw} onClose={() => setWithdraw(false)} inquiryId={inquiryId} />
      <Sheet
        open={reply}
        onClose={() => setReply(false)}
        title="Reply to agent"
        footer={
          <Button
            full
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await sendMessage({ inquiryId, body });
                if (!r.ok) {
                  setError(r.fields?.body ?? r.error);
                  return;
                }
                setReply(false);
                setBody('');
                setError(undefined);
                toast({ title: 'Reply sent', message: 'Saved to this inquiry' });
                router.refresh();
              })
            }
          >
            Send reply
          </Button>
        }
      >
        <TextArea id={`${id}-reply`} label="Message" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} counter={`${body.length} / 1000`} error={error} />
      </Sheet>
    </>
  );
}
