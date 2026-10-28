import { dayOfMonth, monthShort } from '@/lib/domain/format';
import { cx } from './ui';

/** Ink date tile from the Figma "Appointment card" (muted when cancelled or past). */
export function DateTile({ at, muted }: { at: string; muted?: boolean }) {
  return (
    <span className={cx('flex size-[68px] shrink-0 flex-col items-center justify-center rounded-[18px]', muted ? 'bg-surface-muted text-text-muted' : 'bg-ink text-on-ink')} aria-hidden>
      <span className={cx('t-caption-m', muted ? '' : 'text-amber')}>{monthShort(at)}</span>
      <span className="t-title-l leading-none num">{dayOfMonth(at)}</span>
    </span>
  );
}
