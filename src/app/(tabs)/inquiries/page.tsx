import { ChevronRight, Info, MessageSquare } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { firstImage, Photo } from '@/components/photo';
import { Screen } from '@/components/screen';
import { ButtonLink, Chip, EmptyState, PageTitle, StatusBadge } from '@/components/ui';
import { dateTime, dayShort, firstName } from '@/lib/domain/format';
import { INQUIRY_STATUS } from '@/lib/domain/listing';
import { myInquiries, type InquiryListItem } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'My inquiries' };

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'closed', label: 'Closed' },
] as const;

/** One line under each inquiry, from its real state. */
function infoLine(i: InquiryListItem): string {
  const agentReplies = i.events.filter((e) => e.actor === 'agent' && e.body && (e.kind === 'responded' || e.kind === 'message'));
  const lastReply = agentReplies.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const viewing = i.viewings.filter((v) => v.status === 'confirmed').sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  switch (i.status) {
    case 'awaiting_response':
      return `${i.agent.full_name} ${i.agent.reply_hint.charAt(0).toLowerCase()}${i.agent.reply_hint.slice(1)}.`;
    case 'viewing_scheduled':
      return viewing ? `Viewing booked for ${dateTime(viewing.starts_at)}.` : 'Viewing booked.';
    case 'responded':
      return lastReply ? `${firstName(i.agent.full_name)} replied: “${lastReply.body}”` : `${i.agent.full_name} replied.`;
    case 'closed':
      return i.events.find((e) => e.kind === 'closed')?.body ?? 'The agent closed this inquiry.';
    case 'withdrawn':
      return 'You withdrew this inquiry.';
  }
}

/** Figma "My Inquiries / Default" (+ After Withdraw). */
export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { userId } = await requireUser();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? 'all';
  const all = await myInquiries(userId);
  const active = all.filter((i) => INQUIRY_STATUS[i.status].open);
  const closed = all.filter((i) => !INQUIRY_STATUS[i.status].open);
  const shown = tab === 'active' ? active : tab === 'closed' ? closed : all;
  const counts = { all: all.length, active: active.length, closed: closed.length };

  return (
    <Screen>
      <PageTitle title="My inquiries" />
      <nav aria-label="Filter inquiries" className="flex gap-2">
        {TABS.map((t) => (
          <Chip key={t.key} selected={tab === t.key} href={t.key === 'all' ? '/inquiries' : `/inquiries?tab=${t.key}`}>
            {t.label} · {counts[t.key]}
          </Chip>
        ))}
      </nav>
      {shown.length ? (
        <ul className="flex flex-col gap-3">
          {shown.map((i) => {
            const s = INQUIRY_STATUS[i.status];
            return (
              <li key={i.id} className="relative flex flex-col gap-3 rounded-[28px] bg-surface p-3.5">
                <div className="flex gap-3">
                  <Photo image={firstImage(i.property.images)} sizes="72px" className="size-[70px] shrink-0 rounded-[16px]" />
                  <div className="min-w-0">
                    <h2 className="truncate t-card-title">{i.property_title_snapshot}</h2>
                    <p className="truncate t-caption text-text-muted">
                      Sent {dayShort(i.created_at)} · {i.reference}
                    </p>
                    <StatusBadge tone={s.tone} className="mt-1.5">
                      {s.label}
                    </StatusBadge>
                  </div>
                </div>
                <p className="flex gap-2 rounded-[14px] bg-surface-muted px-3 py-2.5 t-caption text-text-secondary">
                  <Info size={16} className="shrink-0" aria-hidden />
                  <span className="line-clamp-2">{infoLine(i)}</span>
                </p>
                <div className="flex items-center justify-between">
                  <span className="t-caption text-text-secondary">Agent · {i.agent.full_name}</span>
                  <Link href={`/inquiries/${i.id}`} className="inline-flex items-center gap-0.5 t-body-m after:absolute after:inset-0 after:rounded-[28px]">
                    Details <ChevronRight size={16} aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title={tab === 'all' ? 'No inquiries yet' : tab === 'active' ? 'No active inquiries' : 'Nothing closed yet'}
          message="Ask a listing agent about availability, pets or a viewing from any home’s page."
          action={
            <ButtonLink href="/homes" size="sm">
              Explore homes
            </ButtonLink>
          }
        />
      )}
    </Screen>
  );
}
