import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { AgentCard, PropertyMini } from '@/components/cards';
import { ContactForm } from '@/components/contact-form';
import { Screen } from '@/components/screen';
import { TopBar } from '@/components/ui';
import { firstName, money } from '@/lib/domain/format';
import { bathsLabel, bedsLabel, isContactable } from '@/lib/domain/listing';
import { getProfile, getProperty, myActivityFor } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Contact agent' };

/** Figma "Contact Agent / Default". */
export default async function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { userId, email } = await requireUser();
  const p = await getProperty(slug);
  if (!p) notFound();
  if (!isContactable(p.status)) redirect(`/homes/${p.slug}`);
  const [profile, activity] = await Promise.all([getProfile(userId), myActivityFor(p.id)]);
  if (activity.inquiryId) redirect(`/inquiries/${activity.inquiryId}`);
  const cover = p.images[0] ? { key: p.images[0].image_key, alt: p.images[0].alt } : null;
  return (
    <Screen bottomBar>
      <TopBar title="Contact agent" close={`/homes/${p.slug}`} />
      <AgentCard agent={p.agent} />
      <PropertyMini title={p.title} city={`${p.neighborhood.name}, ${p.neighborhood.city}`} line={`${money(p.monthly_rent)} / month · ${bedsLabel(p.bedrooms)} · ${bathsLabel(p.bathrooms)}`} image={cover} href={`/homes/${p.slug}`} />
      <ContactForm
        propertyId={p.id}
        agentFirstName={firstName(p.agent.full_name)}
        initial={{
          fullName: profile?.full_name ?? '',
          email: profile?.contact_email ?? email ?? '',
          phone: profile?.share_phone ? (profile.phone ?? '') : '',
          contact: profile?.preferred_contact ?? 'email',
        }}
      />
    </Screen>
  );
}
