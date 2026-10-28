'use client';

import { Check, Info } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setCompared } from '@/app/actions/lists';
import { COMPARE_MAX } from '@/lib/domain/listing';
import { ConfirmDialog } from './overlays';
import { useToast } from './toast';
import { cx } from './ui';

/** Figma "Compare control": "Compare up to 3 homes" + checkbox pill; a dialog when compare is already full. */
export function CompareToggle({ propertyId, title, inCompare, count, signedIn }: { propertyId: string; title: string; inCompare: boolean; count: number; signedIn: boolean }) {
  const [on, setOn] = useState(inCompare);
  const [full, setFull] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const path = usePathname();
  const toast = useToast();
  const othersFull = !on && count >= COMPARE_MAX;

  const toggle = () => {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(path)}`);
    if (othersFull) return setFull(true);
    const next = !on;
    setOn(next);
    start(async () => {
      const r = await setCompared(propertyId, next);
      if (!r.ok) {
        setOn(!next);
        if (r.code === 'compare_full') setFull(true);
        else toast({ kind: 'error', title: 'Couldn’t update compare', message: r.error });
        return;
      }
      const n = next ? count + (inCompare ? 0 : 1) : count - (inCompare ? 1 : 0);
      toast(next ? { title: `Added to compare (${Math.min(n, COMPARE_MAX)}/${COMPARE_MAX})`, message: title, action: { label: 'View', onClick: () => router.push('/compare') } } : { title: 'Removed from compare', message: title });
      router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="t-caption text-text-secondary">{othersFull ? `Compare already has ${COMPARE_MAX} homes` : `Compare up to ${COMPARE_MAX} homes`}</p>
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        onClick={toggle}
        disabled={pending}
        className={cx('inline-flex h-10 items-center gap-2 rounded-full border px-4 t-button-s', on ? 'border-ink bg-ink text-on-ink' : othersFull ? 'border-border bg-surface-muted text-text-muted' : 'border-border bg-surface text-text')}
      >
        <span className={cx('grid size-[18px] place-items-center rounded-[5px] border', on ? 'border-white bg-white text-ink' : 'border-border-strong')}>{on ? <Check size={13} strokeWidth={3} aria-hidden /> : null}</span>
        {on ? 'In compare' : othersFull ? `Compare full (${COMPARE_MAX}/${COMPARE_MAX})` : 'Compare'}
      </button>
      <ConfirmDialog
        open={full}
        danger={false}
        icon={Info}
        title="Compare is full"
        message={`You can compare up to ${COMPARE_MAX} homes. Remove one from your comparison to add ${title}.`}
        confirmLabel="Review comparison"
        cancelLabel="Not now"
        onConfirm={() => router.push('/compare')}
        onCancel={() => setFull(false)}
      />
    </div>
  );
}
