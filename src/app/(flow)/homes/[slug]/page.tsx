import { ArrowLeft, Bath, BedDouble, CalendarDays, Car, Images, MapPin, MessageSquare, Ruler } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AmenityIcon } from '@/components/amenity-icon';
import { AgentCard, AvailabilityBadge, HomeRow } from '@/components/cards';
import { CompareToggle } from '@/components/compare-toggle';
import { MiniMap } from '@/components/mini-map';
import { Photo } from '@/components/photo';
import { RecordView } from '@/components/record-view';
import { SaveButton } from '@/components/save-button';
import { Screen } from '@/components/screen';
import { ShareButton } from '@/components/share-button';
import { ButtonLink, DetailTable, IconButton, InfoNote, SectionHeader } from '@/components/ui';
import { laToday, money } from '@/lib/domain/format';
import { availabilityLabel, isContactable, rentalTerms } from '@/lib/domain/listing';
import { requestTime } from '@/lib/request-time';
import { getProperty, myActivityFor, myLists, similarHomes, viewer } from '@/lib/services/data';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProperty(slug);
  return p ? { title: p.title, description: `${p.title} — ${money(p.monthly_rent)} / month in ${p.neighborhood.name}. Sample listing.` } : { title: 'Home not found' };
}

/** Figma "Property Details / Default" (+ Saved, Added to Compare, Compare Full). */
export default async function PropertyPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProperty(slug);
  if (!p) notFound();
  const { userId } = await viewer();
  const [lists, similar, activity] = await Promise.all([myLists(), similarHomes(p), myActivityFor(p.id)]);
  const today = laToday(requestTime());
  const contactable = isContactable(p.status);
  const cover = p.images[0] ? { key: p.images[0].image_key, alt: p.images[0].alt } : null;
  const signIn = (to: string) => (userId ? to : `/login?next=${encodeURIComponent(to)}`);

  const specs = [
    { icon: BedDouble, value: p.bedrooms === 0 ? 'Studio' : String(p.bedrooms), label: p.bedrooms === 0 ? 'Layout' : 'Beds' },
    { icon: Bath, value: String(Number(p.bathrooms)), label: 'Baths' },
    { icon: Ruler, value: p.area_sqft ? p.area_sqft.toLocaleString('en-US') : '—', label: 'sq ft' },
    { icon: Car, value: p.parking == null ? '—' : String(p.parking), label: 'Parking' },
  ];

  const footer = contactable ? (
    <>
      {activity.viewingId ? (
        <ButtonLink href={`/viewings/${activity.viewingId}`} variant="secondary" icon={CalendarDays} className="flex-1 gap-1.5 px-2 whitespace-nowrap">
          My viewing
        </ButtonLink>
      ) : (
        <ButtonLink href={signIn(`/homes/${p.slug}/schedule`)} variant="secondary" icon={CalendarDays} className="flex-1 gap-1.5 px-2 whitespace-nowrap">
          Schedule viewing
        </ButtonLink>
      )}
      {activity.inquiryId ? (
        <ButtonLink href={`/inquiries/${activity.inquiryId}`} icon={MessageSquare} className="flex-1 gap-1.5 px-2 whitespace-nowrap">
          My inquiry
        </ButtonLink>
      ) : (
        <ButtonLink href={signIn(`/homes/${p.slug}/contact`)} icon={MessageSquare} className="flex-1 gap-1.5 px-2 whitespace-nowrap">
          Contact agent
        </ButtonLink>
      )}
    </>
  ) : (
    <p className="w-full rounded-[18px] bg-surface-muted p-4 text-center t-body text-text-secondary">This home has been leased and isn’t taking inquiries.</p>
  );

  return (
    <>
      <RecordView propertyId={p.id} />
      <div className="relative mx-auto max-w-[960px] lg:mt-6 lg:px-5">
        <Link href={`/homes/${p.slug}/gallery`} aria-label={`Open photos (${p.images.length})`} className="block">
          <Photo image={cover} sizes="(min-width: 960px) 920px, 100vw" className="h-[370px] lg:h-[460px] lg:rounded-[28px]" priority />
        </Link>
        <div className="absolute inset-x-0 top-0 flex justify-between px-5 pt-[max(16px,env(safe-area-inset-top))] lg:px-9 lg:pt-4">
          <IconButton icon={ArrowLeft} label="Back" href="/homes" look="glass" />
          <div className="flex gap-2.5">
            <ShareButton text={`${p.title} — ${money(p.monthly_rent)}/month on Nestora (sample listing)`} look="glass" label="Share this home" />
            <SaveButton propertyId={p.id} title={p.title} saved={lists.saved.has(p.id)} signedIn={!!userId} />
          </div>
        </div>
        {p.images.length ? (
          <span className="absolute bottom-10 left-5 inline-flex h-7 items-center gap-1.5 rounded-full bg-ink/70 px-2.5 t-caption-m text-white lg:left-9">
            <Images size={14} aria-hidden />1 / {p.images.length}
          </span>
        ) : null}
      </div>

      <Screen footer={footer} className="relative -mt-7 rounded-t-[32px] bg-bg !pt-6 lg:mt-0">
        <div className="flex flex-wrap gap-2">
          <AvailabilityBadge label={availabilityLabel(p, today)} className="bg-success-soft text-success" />
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface px-3 t-caption-m text-text-secondary">
            <span className="size-1.5 rounded-full bg-text-secondary" aria-hidden />
            Sample listing
          </span>
        </div>
        <div>
          <h1 className="t-title-xl">{p.title}</h1>
          <p className="mt-1 inline-flex items-center gap-1 t-caption text-text-secondary">
            <MapPin size={14} aria-hidden />
            {p.address_line}, {p.city} {p.postal_code}
          </p>
        </div>
        <p>
          <span className="t-price-l">{money(p.monthly_rent)}</span> <span className="t-body text-text-muted">/ month</span>
        </p>
        <ul className="grid grid-cols-4 gap-2">
          {specs.map((s) => (
            <li key={s.label} className="flex flex-col gap-1 rounded-[18px] bg-surface p-3">
              <s.icon size={18} className="text-text-secondary" aria-hidden />
              <span className="t-card-title num">{s.value}</span>
              <span className="t-caption text-text-muted">{s.label}</span>
            </li>
          ))}
        </ul>
        {contactable || lists.compare.has(p.id) ? <CompareToggle propertyId={p.id} title={p.title} inCompare={lists.compare.has(p.id)} count={lists.compare.size} signedIn={!!userId} /> : null}

        <section aria-labelledby="about" className="flex flex-col gap-2">
          <h2 id="about" className="t-section">
            About this home
          </h2>
          <p className="t-body text-text-secondary">{p.description || 'The listing agent hasn’t added a description yet.'}</p>
        </section>

        {p.amenities.length ? (
          <section aria-labelledby="amenities" className="flex flex-col gap-3">
            <h2 id="amenities" className="t-section">
              Amenities
            </h2>
            <ul className="grid grid-cols-2 gap-2">
              {p.amenities.map((a) => (
                <li key={a.name} className="flex items-center gap-2.5 rounded-[16px] bg-surface px-3 py-3 t-item">
                  <AmenityIcon name={a.icon} />
                  {a.name}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="terms" className="flex flex-col gap-3">
          <h2 id="terms" className="t-section">
            Rental terms
          </h2>
          <DetailTable rows={rentalTerms(p)} />
          <p className="t-caption text-text-muted">“Not specified” means the listing agent hasn’t shared it — ask before you commit.</p>
        </section>

        <section aria-labelledby="loc" className="flex flex-col gap-3">
          <h2 id="loc" className="t-section">
            Location
          </h2>
          <MiniMap label={`Illustrative map of ${p.neighborhood.name}`} x={Number(p.map_x)} y={Number(p.map_y)} />
          <InfoNote icon={MapPin} tone="surface">
            {p.neighborhood.name}, {p.neighborhood.city}. Approximate area shown until a viewing is confirmed.
          </InfoNote>
        </section>

        <section aria-labelledby="agent" className="flex flex-col gap-3">
          <h2 id="agent" className="t-section">
            Listed by
          </h2>
          <AgentCard agent={p.agent} messageHref={contactable ? signIn(activity.inquiryId ? `/inquiries/${activity.inquiryId}` : `/homes/${p.slug}/contact`) : undefined} />
        </section>

        {similar.length ? (
          <section aria-labelledby="similar" className="flex flex-col gap-3">
            <SectionHeader id="similar" title="Similar homes" href={`/homes?type=${p.property_type}`} />
            <div className="flex flex-col gap-3">
              {similar.map((h) => (
                <HomeRow key={h.id} home={h} signedIn={!!userId} />
              ))}
            </div>
          </section>
        ) : null}
      </Screen>
    </>
  );
}
