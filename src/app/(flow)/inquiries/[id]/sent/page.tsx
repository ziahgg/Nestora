import { Send } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PropertyMini } from '@/components/cards';
import { firstImage } from '@/components/photo';
import { Screen } from '@/components/screen';
import { ButtonLink, DetailTable, StatusBadge } from '@/components/ui';
import { dateTimeYear, money } from '@/lib/domain/format';
import { INQUIRY_STATUS, TOPIC_SHORT, type Topic } from '@/lib/domain/listing';
import { getInquiry } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Inquiry sent' };

/** Figma "Inquiry / Sent". */
export default async function InquirySentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const i = await getInquiry(id);
  if (!i || i.user_id !== userId) notFound();
  const s = INQUIRY_STATUS[i.status];
  return (
    <Screen tabs={false} className="items-stretch">
      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <span className="grid size-[104px] place-items-center rounded-full bg-amber-soft">
          <span className="grid size-[72px] place-items-center rounded-full bg-ink text-amber">
            <Send size={30} aria-hidden />
          </span>
        </span>
        <h1 className="t-title-xl">Inquiry sent</h1>
        <p className="t-body text-text-secondary">
          {i.agent.full_name} {i.agent.reply_hint.charAt(0).toLowerCase() + i.agent.reply_hint.slice(1)}.
        </p>
      </div>
      <PropertyMini title={i.property.title} city={i.property.city} line={`${money(i.monthly_rent_snapshot)} / month`} image={firstImage(i.property.images)} href={`/homes/${i.property.slug}`} />
      <DetailTable
        rows={[
          { label: 'Reference', value: i.reference },
          { label: 'Sent', value: dateTimeYear(i.created_at) },
          { label: 'Topics', value: i.topics.map((t) => TOPIC_SHORT[t as Topic] ?? t).join(', ') },
          { label: 'Reply to', value: i.preferred_contact === 'phone' && i.phone ? i.phone : i.email },
          { label: 'Status', value: <StatusBadge tone={s.tone}>{s.label}</StatusBadge> },
        ]}
      />
      <p className="text-center t-caption text-text-muted">Sample app — the agent sees this in their Nestora queue; no email is sent.</p>
      <div className="mt-2 flex flex-col gap-3">
        <ButtonLink href="/inquiries" full>
          View my inquiries
        </ButtonLink>
        <ButtonLink href={`/homes/${i.property.slug}`} variant="secondary" full>
          Back to property
        </ButtonLink>
      </div>
    </Screen>
  );
}
