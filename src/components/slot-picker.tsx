'use client';

import { ChevronLeft, ChevronRight, House, Minus, Phone, Plus, Video } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState, useTransition } from 'react';

import { bookViewing, rescheduleViewing } from '@/app/actions/rentals';
import { calendarDate, dayShort, time } from '@/lib/domain/format';
import type { Slot } from '@/lib/services/data';
import type { FieldErrors } from '@/lib/validations';
import { Button, Field, FormError, TextArea, cx } from './ui';

type Common = { slots: Slot[]; weekFrom: string; prevHref: string | null; nextHref: string; agentFirstName: string };
type Props = Common & ({ mode: 'book'; propertyId: string; defaultPhone: string } | { mode: 'reschedule'; viewingId: string; currentStartsAt: string });

/**
 * Figma "Schedule Viewing" (default, no time selected) and "Appointment / Reschedule": viewing type,
 * a week of days, the agent's open times and the phone the agent can call. Times come from the database;
 * the booking is checked again on the server (slot still free, within the agent's hours).
 */
export function SlotPicker(props: Props) {
  const id = useId();
  const router = useRouter();
  const days = useMemo(() => [...new Set(props.slots.map((s) => s.day))], [props.slots]);
  const firstOpen = days.find((d) => props.slots.some((s) => s.day === d && s.available)) ?? days[0]!;
  const [day, setDay] = useState(firstOpen);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [type, setType] = useState<'in_person' | 'video'>('in_person');
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState<string>();
  const [showMissing, setShowMissing] = useState(false);
  const [pending, start] = useTransition();
  const [key] = useState(() => crypto.randomUUID());

  const daySlots = props.slots.filter((s) => s.day === day && s.slot);
  const unavailable = props.slots.find((s) => s.day === day && s.reason === 'agent_unavailable');
  const isOpen = (d: string) => props.slots.some((s) => s.day === d && s.available);

  const submit = (form: HTMLFormElement) => {
    if (!startsAt) {
      setShowMissing(true);
      return;
    }
    setFailed(undefined);
    start(async () => {
      if (props.mode === 'book') {
        const phone = String(new FormData(form).get('phone') ?? '');
        const r = await bookViewing({ propertyId: props.propertyId, type, startsAt, phone, guests, note, idempotencyKey: key });
        if (!r.ok) {
          setErrors(r.fields ?? {});
          if (!r.fields) setFailed(r.error);
          if (r.code === 'slot_taken') router.refresh();
          return;
        }
        router.replace(`/viewings/${r.data.viewingId}/confirmed`);
      } else {
        const r = await rescheduleViewing({ viewingId: props.viewingId, startsAt });
        if (!r.ok) {
          setFailed(r.error);
          if (r.code === 'slot_taken') router.refresh();
          return;
        }
        router.replace(`/viewings/${props.viewingId}?rescheduled=1`);
      }
    });
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      {props.mode === 'book' ? (
        <fieldset>
          <legend className="mb-3 t-section">Viewing type</legend>
          <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
            {(
              [
                ['in_person', 'In person', 'At the property', House],
                ['video', 'Video tour', 'Live call · 20 min', Video],
              ] as const
            ).map(([v, label, sub, Icon]) => (
              <button key={v} type="button" role="radio" aria-checked={type === v} onClick={() => setType(v)} className={cx('flex items-center gap-3 rounded-[22px] bg-surface p-3 text-left', type === v ? 'border-2 border-ink' : 'border-2 border-transparent')}>
                <span className={cx('grid size-10 shrink-0 place-items-center rounded-[12px]', type === v ? 'bg-amber text-ink' : 'bg-surface-muted')}>
                  <Icon size={20} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block t-card-title">{label}</span>
                  <span className="block t-caption text-text-muted">{sub}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset>
        <div className="mb-3 flex items-center justify-between">
          <legend className="t-section">{calendarDate(props.weekFrom, { month: 'long', year: 'numeric' })}</legend>
          <div className="flex gap-2">
            {props.prevHref ? (
              <Link href={props.prevHref} aria-label="Previous week" className="grid size-10 place-items-center rounded-full bg-surface">
                <ChevronLeft size={18} aria-hidden />
              </Link>
            ) : (
              <span className="grid size-10 place-items-center rounded-full bg-surface opacity-40" aria-hidden>
                <ChevronLeft size={18} />
              </span>
            )}
            <Link href={props.nextHref} aria-label="Next week" className="grid size-10 place-items-center rounded-full bg-surface">
              <ChevronRight size={18} aria-hidden />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="Day">
          {days.map((d) => {
            const on = d === day;
            const open = isOpen(d);
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${calendarDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}${open ? '' : ', no times'}`}
                onClick={() => {
                  setDay(d);
                  setStartsAt(null);
                }}
                className={cx('flex h-[66px] flex-col items-center justify-center rounded-full', on ? 'bg-ink text-on-ink' : 'bg-surface', !open && !on && 'text-text-muted')}
              >
                <span className="t-caption">{calendarDate(d, { weekday: 'short' })}</span>
                <span className="t-card-title num">{calendarDate(d, { day: 'numeric' })}</span>
                {!open ? <span className={cx('mt-0.5 h-0.5 w-3 rounded-full', on ? 'bg-white/50' : 'bg-text-muted')} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        {unavailable ? <p className="mt-2 t-caption text-text-muted">{calendarDate(day, { weekday: 'short', month: 'short', day: 'numeric' })} — agent unavailable</p> : null}
      </fieldset>

      {!unavailable ? (
        <fieldset>
          <legend className="mb-3 t-section">Available times</legend>
          {daySlots.length ? (
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Time">
              {daySlots.map((s) => {
                const on = s.startsAt === startsAt;
                const current = props.mode === 'reschedule' && s.startsAt && Date.parse(s.startsAt) === Date.parse(props.currentStartsAt);
                return (
                  <button
                    key={s.startsAt}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={!s.available || !!current}
                    onClick={() => {
                      setStartsAt(s.startsAt);
                      setShowMissing(false);
                    }}
                    className={cx('h-12 rounded-[16px] t-item num', on ? 'bg-ink text-on-ink' : 'border border-border bg-surface', 'disabled:border-transparent disabled:bg-neutral-soft disabled:text-text-muted')}
                  >
                    {time(s.startsAt!)}
                    {current ? <span className="sr-only"> (current time)</span> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="t-body text-text-secondary">No times left this day.</p>
          )}
        </fieldset>
      ) : null}

      {props.mode === 'book' ? (
        <>
          <Field id={`${id}-phone`} name="phone" type="tel" label="Phone for the agent" icon={Phone} required autoComplete="tel" defaultValue={props.defaultPhone} error={errors.phone} hint={`${props.agentFirstName} uses it only for this viewing.`} />
          <div className="flex items-center justify-between rounded-[18px] bg-surface px-4 py-2">
            <span className="t-item" id={`${id}-guests`}>
              Guests
            </span>
            <div className="flex items-center gap-3" role="group" aria-labelledby={`${id}-guests`}>
              <button type="button" aria-label="Fewer guests" disabled={guests <= 1} onClick={() => setGuests((g) => g - 1)} className="grid size-9 place-items-center rounded-full bg-surface-muted disabled:opacity-40">
                <Minus size={16} aria-hidden />
              </button>
              <output className="w-6 text-center t-card-title num" aria-live="polite">
                {guests}
              </output>
              <button type="button" aria-label="More guests" disabled={guests >= 6} onClick={() => setGuests((g) => g + 1)} className="grid size-9 place-items-center rounded-full bg-ink text-on-ink disabled:opacity-40">
                <Plus size={16} aria-hidden />
              </button>
            </div>
          </div>
          <TextArea id={`${id}-note`} label="Note (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} counter={`${note.length} / 300`} error={errors.note} className="[&_textarea]:min-h-[88px]" />
        </>
      ) : null}

      {showMissing && !startsAt ? <FormError message="Choose a time for the viewing." /> : null}
      <FormError message={failed} />

      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[28px] bg-surface px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(18,18,18,0.06)]">
        <div className="mx-auto max-w-[600px]">
          <Button type="submit" full loading={pending}>
            {startsAt ? `${props.mode === 'book' ? 'Confirm' : 'Move to'} · ${dayShort(startsAt)} · ${time(startsAt)}` : 'Select a time'}
          </Button>
        </div>
      </div>
    </form>
  );
}
