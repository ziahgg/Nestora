import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentType, InputHTMLAttributes, ReactNode, SVGProps, TextareaHTMLAttributes } from 'react';

import { ArrowLeft, ChevronRight, CircleAlert, X } from 'lucide-react';

import type { Tone } from '@/lib/domain/listing';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }>;

/* ───────────── Buttons ───────────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-on-ink hover:bg-ink-soft',
  secondary: 'bg-surface text-text border border-border hover:bg-surface-muted',
  ghost: 'bg-transparent text-text hover:bg-surface',
  danger: 'bg-error-soft text-error hover:brightness-[0.98]',
};
const btn = (variant: Variant, size: 'lg' | 'sm', full?: boolean) =>
  cx(
    'inline-flex items-center justify-center gap-2 rounded-full transition-[background,filter,transform] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-text disabled:border-transparent',
    size === 'lg' ? 'h-14 px-6 t-button' : 'h-10 px-4 t-button-s',
    VARIANT[variant],
    full && 'w-full',
  );

/** Figma "Button": ink primary, white outline secondary, soft-red danger; 56 px / 40 px pills. */
export function Button({
  variant = 'primary',
  size = 'lg',
  full,
  icon: Icon,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'lg' | 'sm'; full?: boolean; icon?: IconType; loading?: boolean }) {
  return (
    <button {...rest} disabled={disabled || loading} aria-busy={loading || undefined} className={cx(btn(variant, size, full), className)}>
      {loading ? <Spinner small /> : Icon ? <Icon size={size === 'lg' ? 20 : 16} aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = 'primary', size = 'lg', full, icon: Icon, className, children, prefetch }: { href: string; variant?: Variant; size?: 'lg' | 'sm'; full?: boolean; icon?: IconType; className?: string; children: ReactNode; prefetch?: boolean }) {
  return (
    <Link href={href} prefetch={prefetch} className={cx(btn(variant, size, full), className)}>
      {Icon ? <Icon size={size === 'lg' ? 20 : 16} aria-hidden /> : null}
      {children}
    </Link>
  );
}

/** Figma "Icon button": 44 px white circle (36 px small); ink and glass variants. */
export function IconButton({
  icon: Icon,
  label,
  href,
  onClick,
  look = 'surface',
  size = 'lg',
  className,
  disabled,
  pressed,
  badge,
  type = 'button',
}: {
  icon: IconType;
  label: string;
  href?: string;
  onClick?: () => void;
  look?: 'surface' | 'ink' | 'muted' | 'glass';
  size?: 'lg' | 'sm';
  className?: string;
  disabled?: boolean;
  pressed?: boolean;
  badge?: boolean;
  type?: 'button' | 'submit';
}) {
  const cls = cx(
    'relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40',
    size === 'lg' ? 'size-11' : 'size-9',
    look === 'surface' && 'bg-surface text-text hover:bg-surface-muted',
    look === 'ink' && 'bg-ink text-on-ink hover:bg-ink-soft',
    look === 'muted' && 'bg-surface-muted text-text hover:bg-neutral-soft',
    look === 'glass' && 'bg-white/90 text-text backdrop-blur hover:bg-white',
    className,
  );
  const content = (
    <>
      <Icon size={size === 'sm' ? 18 : 20} aria-hidden />
      {badge ? <span className="absolute top-2 right-2 size-2 rounded-full bg-amber ring-2 ring-surface" aria-hidden /> : null}
    </>
  );
  if (href)
    return (
      <Link href={href} aria-label={label} className={cls}>
        {content}
      </Link>
    );
  return (
    <button type={type} aria-label={label} aria-pressed={pressed} onClick={onClick} disabled={disabled} className={cls}>
      {content}
    </button>
  );
}

export function Spinner({ small, label = 'Loading' }: { small?: boolean; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <span className={cx('rounded-full border-2 border-current border-t-transparent anim-spin', small ? 'size-4' : 'size-6')} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* ───────────── Chips & badges ───────────── */

/** Figma "Filter chip": white pill, ink when selected. */
export function Chip({ selected, children, onClick, href, className, disabled }: { selected: boolean; children: ReactNode; onClick?: () => void; href?: string; className?: string; disabled?: boolean }) {
  const cls = cx(
    'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 t-body-m transition-colors disabled:opacity-40',
    selected ? 'bg-ink text-on-ink' : 'bg-surface text-text hover:bg-surface-muted',
    className,
  );
  if (href)
    return (
      <Link href={href} aria-current={selected ? 'true' : undefined} className={cls} scroll={false}>
        {children}
      </Link>
    );
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

const TONE: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  info: 'bg-info-soft text-info',
  neutral: 'bg-neutral-soft text-text-secondary',
  ink: 'bg-ink text-on-ink',
};

/** Figma "Status badge": always a coloured dot plus a text label. */
export function StatusBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 t-status whitespace-nowrap', TONE[tone], className)}>
      <span className={cx('size-1.5 rounded-full', tone === 'ink' ? 'bg-white' : 'bg-current')} aria-hidden />
      {children}
    </span>
  );
}

/** Figma "Spec chip": outlined pill ("1,820 sq ft", "3 Beds"). */
export function SpecChip({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-[30px] shrink-0 items-center rounded-full border border-border px-3 t-caption-m text-text">{children}</span>;
}

/* ───────────── Layout ───────────── */

export function Card({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'li' }) {
  return <As className={cx('rounded-[28px] bg-surface', className)}>{children}</As>;
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="t-title-xl">{title}</h1>
        {subtitle ? <p className="t-caption text-text-secondary">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </header>
  );
}

/** Figma "Top bar": circular back/close, centred title, optional right action. */
export function TopBar({ title, back, close, right }: { title: string; back?: string; close?: string; right?: ReactNode }) {
  return (
    <header className="flex h-12 items-center justify-between gap-2">
      {back || close ? <IconButton icon={close ? X : ArrowLeft} label={close ? 'Close' : 'Back'} href={back ?? close} /> : <span className="size-11" aria-hidden />}
      <h1 className="t-screen-title min-w-0 flex-1 truncate text-center">{title}</h1>
      {right ?? <span className="size-11" aria-hidden />}
    </header>
  );
}

export function SectionHeader({ title, href, linkLabel = 'See all', id, action }: { title: string; href?: string; linkLabel?: string; id?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="t-section">
        {title}
      </h2>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-0.5 t-body text-text-secondary hover:text-text">
          {linkLabel}
          <ChevronRight size={16} aria-hidden />
        </Link>
      ) : (
        action
      )}
    </div>
  );
}

/** Figma "List row": icon tile, label, trailing value and chevron. */
export function ListRow({ icon: Icon, label, value, href, trailing, danger, onClick, download }: { icon: IconType; label: string; value?: string; href?: string; trailing?: ReactNode; danger?: boolean; onClick?: () => void; download?: boolean }) {
  const body = (
    <>
      <span className={cx('grid size-10 shrink-0 place-items-center rounded-[12px]', danger ? 'bg-error-soft text-error' : 'bg-surface-muted text-text')}>
        <Icon size={20} aria-hidden />
      </span>
      <span className={cx('t-item min-w-0 flex-1 text-left', danger && 'text-error')}>{label}</span>
      {value ? <span className="min-w-0 max-w-[55%] shrink truncate text-right t-body text-text-muted">{value}</span> : null}
      {trailing ?? (href || onClick ? <ChevronRight size={18} className="shrink-0 text-text-muted" aria-hidden /> : null)}
    </>
  );
  const cls = 'flex min-h-[62px] w-full items-center gap-3.5 px-4 py-2.5';
  if (href && download)
    return (
      <a href={href} download className={cx(cls, 'hover:bg-surface-muted/60')}>
        {body}
      </a>
    );
  if (href)
    return (
      <Link href={href} className={cx(cls, 'hover:bg-surface-muted/60')}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cx(cls, 'hover:bg-surface-muted/60')}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}

export function RowGroup({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section aria-label={label} className="flex flex-col">
      {label ? <h2 className="mb-2 px-1 t-caption text-text-muted">{label}</h2> : null}
      <div className="divide-y divide-border overflow-hidden rounded-[24px] bg-surface">{children}</div>
    </section>
  );
}

/** Figma "Empty state": icon disc, title, message, optional action. */
export function EmptyState({ icon: Icon, title, message, action }: { icon: IconType; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[28px] bg-surface px-6 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-amber-soft text-amber">
        <Icon size={28} aria-hidden />
      </span>
      <h2 className="t-title-l">{title}</h2>
      <p className="t-body max-w-[300px] text-text-secondary">{message}</p>
      {action}
    </div>
  );
}

export function InfoNote({ icon: Icon, children, tone = 'muted', className }: { icon: IconType; children: ReactNode; tone?: 'muted' | 'amber' | 'surface'; className?: string }) {
  return (
    <p className={cx('flex gap-2.5 rounded-[16px] p-3 t-body', tone === 'amber' ? 'bg-amber-soft text-text' : tone === 'surface' ? 'bg-surface text-text-secondary' : 'bg-surface-muted text-text-secondary', className)}>
      <Icon size={18} className="mt-px shrink-0" aria-hidden />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Two-column key/value table used on confirmation and details screens. */
export function DetailTable({ rows, className }: { rows: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cx('divide-y divide-border rounded-[24px] bg-surface px-4', className)}>
      {rows.map((r) => (
        <div key={r.label} className="flex items-start justify-between gap-4 py-3.5">
          <dt className="shrink-0 t-body text-text-secondary">{r.label}</dt>
          <dd className="min-w-0 text-right t-body-m break-words">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ───────────── Inputs ───────────── */

const inputCls = (error?: string) =>
  cx('w-full rounded-[18px] bg-surface t-item text-text outline-none placeholder:text-text-muted', error ? 'border-[1.5px] border-error' : 'border border-border focus:border-[1.5px] focus:border-ink');

export function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="t-label text-text-secondary">
      {children}
      {required ? (
        <span className="text-error" aria-hidden>
          {' '}
          *
        </span>
      ) : null}
    </label>
  );
}

/** Figma "Input field": 54 px, leading icon, red border + message on error. */
export function Field({ label, error, hint, className, id, icon: Icon, required, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; id: string; icon?: IconType }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <div className="relative">
        {Icon ? <Icon size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-secondary" aria-hidden /> : null}
        <input id={id} required={required} {...input} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-msg` : undefined} className={cx(inputCls(error), 'h-[54px] pr-4', Icon ? 'pl-11' : 'pl-4')} />
      </div>
      <FieldMessage id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}

export function TextArea({ label, error, hint, id, counter, className, required, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string; id: string; counter?: string }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <textarea id={id} required={required} {...rest} aria-invalid={!!error} aria-describedby={`${id}-msg`} className={cx(inputCls(error), 'min-h-[120px] resize-y px-4 py-3.5')} />
      <div className="flex items-start justify-between gap-3">
        <FieldMessage id={`${id}-msg`} error={error} hint={hint} />
        {counter ? <span className="ml-auto shrink-0 t-caption text-text-muted num">{counter}</span> : null}
      </div>
    </div>
  );
}

export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error)
    return (
      <p id={id} role="alert" className="flex items-center gap-1.5 t-error text-error">
        <CircleAlert size={14} aria-hidden />
        {error}
      </p>
    );
  return hint ? (
    <p id={id} className="t-caption text-text-muted">
      {hint}
    </p>
  ) : (
    <span id={id} hidden />
  );
}

export function FormError({ message, action }: { message?: string; action?: ReactNode }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-center gap-2 rounded-[16px] bg-error-soft px-4 py-3 t-body text-error">
      <CircleAlert size={16} className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{message}</span>
      {action}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      <div className="h-full rounded-full bg-amber" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Shorthand for the X icon used by dismiss buttons in client components. */
export { X as CloseIcon };
