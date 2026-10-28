import { Check, X } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AgentCard, PropertyMini } from '@/components/cards';
import { InquiryFooter, InquiryMenu } from '@/components/inquiry-actions';
import { firstImage } from '@/components/photo';
import { Screen } from '@/components/screen';
import { ButtonLink, StatusBadge, TopBar, cx } from '@/components/ui';
import { dateTime, money } from '@/lib/domain/format';
import { canWithdraw, INQUIRY_STATUS, inquiryTimeline, isContactable, TOPIC_SHORT, type Topic } from '@/lib/domain/listing';
import { getInquiry } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Inquiry details' };

/** Figma "Inquiry Details" (awaiting response, responded, viewing scheduled, withdrawn, closed). */
export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const i = await getInquiry(id);
  if (!i || i.user_id !== userId) notFound();
  const s = INQUIRY_STATUS[i.status];
  const steps = inquiryTimeline(i.status, i.events, { agentName: i.agent.full_name, replyHint: i.agent.reply_hint, submittedAt: i.created_at });
  const conversation = i.events.filter((e) => e.body && (e.kind === 'responded' || e.kind === 'message'));
  const viewing = i.viewings.find((v) => v.status === 'confirmed') ?? null;
  const propertyHref = `/homes/${i.property.slug}`;
  const open = s.open;

  return (
    <Screen
      footer={
        open ? (
          <InquiryFooter inquiryId={i.id} status={i.status} viewingHref={viewing ? `/viewings/${viewing.id}` : null} scheduleHref={isContactable(i.property.status) ? `${propertyHref}/schedule` : null} />
        ) : (
          <ButtonLink href={propertyHref} variant="secondary" full>
            Back to the home
          </ButtonLink>
        )
      }
    >
      <TopBar title="Inquiry details" back="/inquiries" right={<InquiryMenu reference={i.reference} propertyHref={propertyHref} canWithdraw={canWithdraw(i.status) && i.status !== 'awaiting_response'} inquiryId={i.id} />} />
      <PropertyMini title={i.property_title_snapshot} city={i.property.city} line={`${money(i.monthly_rent_snapshot)} / month`} image={firstImage(i.property.images)} href={propertyHref} />
      <div className="flex items-center justify-between">
        <span className="t-caption text-text-secondary">{i.reference}</span>
        <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
      </div>

      <section aria-labelledby="status-h" className="rounded-[28px] bg-surface p-4">
        <h2 id="status-h" className="mb-3 t-section">
          Status
        </h2>
        <ol>
          {steps.map((st, k) => (
            <li key={st.key} className="relative flex gap-3 pb-4 last:pb-0" aria-current={st.state === 'current' ? 'step' : undefined}>
              {k < steps.length - 1 ? <span className={cx('absolute top-7 left-[13px] h-[calc(100%-20px)] w-0.5', st.state === 'done' ? 'bg-ink' : 'bg-border')} aria-hidden /> : null}
              <span
                className={cx(
                  'relative grid size-7 shrink-0 place-items-center rounded-full',
                  st.state === 'done' && 'bg-ink text-white',
                  st.state === 'current' && 'bg-amber',
                  st.state === 'stopped' && 'bg-neutral-soft text-text-secondary',
                  st.state === 'todo' && 'bg-surface-muted',
                )}
              >
                {st.state === 'done' ? <Check size={14} strokeWidth={3} aria-hidden /> : st.state === 'stopped' ? <X size={14} strokeWidth={3} aria-hidden /> : null}
              </span>
              <div className="min-w-0">
                <p className={cx('t-item', st.state === 'todo' ? 'text-text-muted' : 'text-text', st.state === 'current' && 't-card-title')}>{st.title}</p>
                <p className="t-caption text-text-muted">
                  {[st.at ? dateTime(st.at) : null, st.detail].filter(Boolean).join(' · ')}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="msg-h" className="flex flex-col gap-3">
        <h2 id="msg-h" className="t-section">
          Your message
        </h2>
        <div className="rounded-[24px] bg-surface p-4">
          <p className="t-caption text-text-secondary">Topics: {i.topics.map((t) => TOPIC_SHORT[t as Topic] ?? t).join(', ')}</p>
          <p className="mt-1.5 t-body whitespace-pre-line">{i.message}</p>
        </div>
      </section>

      {conversation.length ? (
        <section aria-labelledby="conv-h" className="flex flex-col gap-3">
          <h2 id="conv-h" className="t-section">
            Conversation
          </h2>
          <ul className="flex flex-col gap-2">
            {conversation.map((e) => (
              <li key={e.id} className={cx('max-w-[85%] rounded-[20px] px-4 py-3', e.actor === 'agent' ? 'self-start bg-surface' : 'self-end bg-ink text-on-ink')}>
                <p className={cx('t-caption', e.actor === 'agent' ? 'text-text-muted' : 'text-white/60')}>
                  {e.actor === 'agent' ? i.agent.full_name : 'You'} · {dateTime(e.created_at)}
                </p>
                <p className="t-body whitespace-pre-line">{e.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="contact-h" className="flex flex-col gap-3">
        <h2 id="contact-h" className="t-section">
          Contact
        </h2>
        <AgentCard agent={i.agent} />
        {viewing ? (
          <Link href={`/viewings/${viewing.id}`} className="rounded-[20px] bg-surface p-4 t-body hover:bg-white/80">
            Viewing booked for <span className="t-body-m">{dateTime(viewing.starts_at)}</span> · {viewing.reference}
          </Link>
        ) : (
          <p className="rounded-[20px] bg-surface p-4 t-body text-text-secondary">{open ? 'No viewing scheduled yet. You can book one when you’re ready.' : 'No viewing scheduled.'}</p>
        )}
      </section>
    </Screen>
  );
}
