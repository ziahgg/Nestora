import { Inbox } from 'lucide-react';
import type { Metadata } from 'next';

import { AgentCancelViewing, AgentInquiryActions } from '@/components/agent-actions';
import { Screen } from '@/components/screen';
import { EmptyState, StatusBadge, TopBar } from '@/components/ui';
import { dateTime } from '@/lib/domain/format';
import { INQUIRY_STATUS, TOPIC_SHORT, VIEWING_TYPE_LABEL, type Topic } from '@/lib/domain/listing';
import { requestTime } from '@/lib/request-time';
import { agentInquiries, agentViewings, myAgent } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Agent queue' };

/**
 * Minimal queue for listing agents (not a Figma screen): inquiries and upcoming viewings for their own
 * listings only — RLS limits the rows, and every action is re-checked in the database.
 */
export default async function AgentPage() {
  await requireUser();
  const agent = await myAgent();
  if (!agent)
    return (
      <Screen tabs={false}>
        <TopBar title="Agent queue" back="/profile" />
        <EmptyState icon={Inbox} title="Not an agent account" message="This page is for listing agents. Agent accounts are linked in the database; they can’t be requested in the app." />
      </Screen>
    );
  const [inquiries, viewings] = await Promise.all([agentInquiries(agent.id), agentViewings(agent.id, requestTime())]);
  const open = inquiries.filter((i) => INQUIRY_STATUS[i.status].open);
  return (
    <Screen tabs={false}>
      <TopBar title="Agent queue" back="/profile" />
      <p className="t-body text-text-secondary">
        Signed in as {agent.full_name} · {agent.agency}
      </p>
      <section aria-labelledby="av-h" className="flex flex-col gap-3">
        <h2 id="av-h" className="t-section">
          Upcoming viewings · {viewings.length}
        </h2>
        {viewings.length ? (
          <ul className="flex flex-col gap-3">
            {viewings.map((v) => (
              <li key={v.id} className="flex flex-col gap-2 rounded-[24px] bg-surface p-4">
                <p className="t-card-title">{v.property.title}</p>
                <p className="t-body text-text-secondary">
                  {dateTime(v.starts_at)} · {VIEWING_TYPE_LABEL[v.viewing_type]} · {v.guests} {v.guests === 1 ? 'guest' : 'guests'} · {v.phone}
                </p>
                {v.note ? <p className="t-body">“{v.note}”</p> : null}
                <p className="t-caption text-text-muted">{v.reference}</p>
                {Date.parse(v.starts_at) > requestTime() ? (
                  <div>
                    <AgentCancelViewing viewingId={v.id} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[24px] bg-surface p-4 t-body text-text-secondary">No upcoming viewings.</p>
        )}
      </section>
      <section aria-labelledby="ai-h" className="flex flex-col gap-3">
        <h2 id="ai-h" className="t-section">
          Open inquiries · {open.length}
        </h2>
        {open.length ? (
          <ul className="flex flex-col gap-3">
            {open.map((i) => {
              const s = INQUIRY_STATUS[i.status];
              return (
                <li key={i.id} className="flex flex-col gap-3 rounded-[24px] bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="t-card-title">{i.property_title_snapshot}</p>
                      <p className="t-caption text-text-muted">
                        {i.reference} · {dateTime(i.created_at)}
                      </p>
                    </div>
                    <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                  </div>
                  <p className="t-body">
                    <span className="t-body-m">{i.full_name}</span> · {i.email}
                    {i.phone ? ` · ${i.phone}` : ''} · prefers {i.preferred_contact}
                  </p>
                  <p className="t-caption text-text-secondary">Topics: {i.topics.map((t) => TOPIC_SHORT[t as Topic] ?? t).join(', ')}</p>
                  <p className="rounded-[16px] bg-surface-muted p-3 t-body whitespace-pre-line">{i.message}</p>
                  {i.events
                    .filter((e) => e.body && (e.kind === 'responded' || e.kind === 'message'))
                    .map((e) => (
                      <p key={e.id} className="t-caption text-text-secondary">
                        {e.actor === 'agent' ? 'You' : i.full_name}: “{e.body}”
                      </p>
                    ))}
                  <AgentInquiryActions inquiryId={i.id} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-[24px] bg-surface p-4 t-body text-text-secondary">No open inquiries.</p>
        )}
      </section>
    </Screen>
  );
}
