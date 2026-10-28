import { ArrowUpRight, BadgeCheck, MessageSquare, Phone } from 'lucide-react';
import Link from 'next/link';

import { money } from '@/lib/domain/format';
import { availabilityLabel, FURNISHING_LABEL, specLine, statusLabel, TYPE_LABEL } from '@/lib/domain/listing';
import type { HomeCard, NeighborhoodCard } from '@/lib/services/data';
import type { AgentRow } from '@/types/database';
import { Photo } from './photo';
import { SaveButton } from './save-button';
import { SpecChip, cx } from './ui';

export function AvailabilityBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cx('inline-flex h-7 items-center gap-1.5 rounded-full bg-surface px-3 t-caption-m text-text', className)}>
      <span className={cx('size-2 rounded-full', label === 'Leased' ? 'bg-text-muted' : label === 'Coming soon' ? 'bg-amber' : 'bg-success')} aria-hidden />
      {label}
    </span>
  );
}

/** Figma "Property card" (Featured this week): photo with badge, save + open buttons, title, price, spec chips. */
export function FeaturedCard({ home, today, signedIn, furnishing, priority }: { home: HomeCard; today: string; signedIn: boolean; furnishing?: string | null; priority?: boolean }) {
  const href = `/homes/${home.slug}`;
  return (
    <article className="relative overflow-hidden rounded-[28px] bg-surface">
      <div className="relative">
        <Photo image={home.image} sizes="(min-width: 768px) 480px, 100vw" className="aspect-[350/230]" priority={priority} />
        <AvailabilityBadge label={availabilityLabel(home, today)} className="absolute bottom-3.5 left-3.5" />
      </div>
      <div className="absolute top-3.5 right-3.5 flex gap-2">
        <SaveButton propertyId={home.id} title={home.title} saved={home.saved} signedIn={signedIn} />
        <Link href={href} aria-label={`Open ${home.title}`} className="relative z-10 grid size-11 place-items-center rounded-full bg-ink text-on-ink">
          <ArrowUpRight size={20} aria-hidden />
        </Link>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="t-property">
              <Link href={href} className="after:absolute after:inset-0">
                {home.title}
              </Link>
            </h3>
            <p className="mt-2 t-caption text-text-secondary">{home.address_line}, {home.neighborhood.name}</p>
          </div>
          <p className="shrink-0 text-right">
            <span className="block t-price">{money(home.monthly_rent)}</span>
            <span className="t-caption text-text-muted">per month</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {home.area_sqft ? <SpecChip>{home.area_sqft.toLocaleString('en-US')} sq ft</SpecChip> : null}
          <SpecChip>{home.bedrooms === 0 ? 'Studio' : `${home.bedrooms} Beds`}</SpecChip>
          <SpecChip>{Number(home.bathrooms)} Baths</SpecChip>
          {furnishing ? <SpecChip>{furnishing}</SpecChip> : null}
        </div>
      </div>
    </article>
  );
}

/** Figma "Property row": square photo, "House · Available", save, title, area, price /mo, spec line. */
export function HomeRow({ home, signedIn, trailing }: { home: HomeCard; signedIn: boolean; trailing?: React.ReactNode }) {
  return (
    <article className="relative flex gap-3 rounded-[24px] bg-surface p-2.5 pr-3">
      <Photo image={home.image} sizes="112px" className="size-[104px] shrink-0 rounded-[18px]" />
      <div className="min-w-0 flex-1 py-1">
        <div className="flex items-start justify-between gap-2">
          <p className="t-caption text-text-secondary">
            {TYPE_LABEL[home.property_type]} · {statusLabel(home.status)}
          </p>
          {trailing ?? <SaveButton propertyId={home.id} title={home.title} saved={home.saved} signedIn={signedIn} size="sm" bare />}
        </div>
        <h3 className="-mt-1 truncate t-card-title">
          <Link href={`/homes/${home.slug}`} className="after:absolute after:inset-0 after:rounded-[24px]">
            {home.title}
          </Link>
        </h3>
        <p className="truncate t-caption text-text-muted">
          {home.neighborhood.name}, {home.city.includes('Pasadena') ? 'Los Angeles County' : 'Los Angeles'}
        </p>
        <p className="mt-1">
          <span className="t-price-s">{money(home.monthly_rent)}</span> <span className="t-caption text-text-muted">/mo</span>
        </p>
        <p className="t-caption text-text-secondary">{specLine(home)}</p>
      </div>
    </article>
  );
}

export function NeighborhoodTile({ n }: { n: NeighborhoodCard }) {
  return (
    <Link href={`/homes?n=${n.slug}`} className="group relative block w-[150px] shrink-0 overflow-hidden rounded-[24px] bg-surface">
      <Photo image={n.image} sizes="150px" className="h-[110px]" />
      <div className="p-3">
        <p className="t-card-title">{n.name}</p>
        <p className="t-caption text-text-muted">{n.count === 1 ? '1 home' : `${n.count} homes`}</p>
      </div>
    </Link>
  );
}

/** Compact property card used at the top of flows (contact, schedule, inquiry details). */
export function PropertyMini({ title, city, line, image, href }: { title: string; city: string; line: string; image: { key: string; alt: string } | null; href?: string }) {
  const body = (
    <>
      <Photo image={image} sizes="72px" className="size-[68px] shrink-0 rounded-[16px]" />
      <div className="min-w-0">
        <p className="truncate t-card-title">{title}</p>
        <p className="truncate t-caption text-text-muted">{city}</p>
        <p className="mt-0.5 t-label">{line}</p>
      </div>
    </>
  );
  const cls = 'flex items-center gap-3 rounded-[24px] bg-surface p-2.5';
  return href ? (
    <Link href={href} className={cx(cls, 'hover:bg-white/80')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Figma "Agent card": initials, verified name, title · agency, reply hint, message + call. */
export function AgentCard({ agent, messageHref, subtitle }: { agent: AgentRow; messageHref?: string; subtitle?: string }) {
  const initials = agent.full_name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2);
  return (
    <div className="flex items-center gap-3 rounded-[24px] bg-surface p-3.5">
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-amber-soft t-card-title text-amber" aria-hidden>
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 t-card-title">
          {agent.full_name}
          {agent.verified ? <BadgeCheck size={16} className="text-info" aria-label="Verified agent" /> : null}
        </p>
        <p className="truncate t-caption text-text-muted">
          {agent.title} · {agent.agency}
        </p>
        <p className="truncate t-caption text-text-secondary">{subtitle ?? agent.reply_hint}</p>
      </div>
      {messageHref ? (
        <Link href={messageHref} aria-label={`Message ${agent.full_name}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-muted">
          <MessageSquare size={20} aria-hidden />
        </Link>
      ) : null}
      <a href={`tel:${agent.phone.replace(/[^0-9+]/g, '')}`} aria-label={`Call ${agent.full_name} (sample number ${agent.phone})`} className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-on-ink">
        <Phone size={20} aria-hidden />
      </a>
    </div>
  );
}

export const furnishingChip = (f: keyof typeof FURNISHING_LABEL | null) => (f ? FURNISHING_LABEL[f] : null);
