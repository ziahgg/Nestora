'use client';

import { CalendarDays, ChevronRight, Info, KeyRound, Mail, MessageSquare, MessagesSquare, Phone, Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { Sheet } from './overlays';
import { cx } from './ui';

const FAQ = [
  { icon: KeyRound, q: 'How do security deposits work?', a: 'Each listing shows the deposit the agent has shared. It’s paid to the landlord or agent when you sign a lease — Nestora doesn’t collect deposits or rent.' },
  { icon: CalendarDays, q: 'Can I view a home before applying?', a: 'Yes. Use “Schedule viewing” on a home to pick an in-person visit or a video tour from the agent’s open times.' },
  { icon: Info, q: 'What does “Not specified” mean?', a: 'The listing owner hasn’t shared this detail. Ask the agent through “Contact agent” before you commit — Nestora never fills in missing terms for you.' },
  { icon: MessageSquare, q: 'How do I withdraw an inquiry?', a: 'Open the inquiry from My inquiries and choose Withdraw. Any viewing booked through it is cancelled too.' },
  { icon: ShieldCheck, q: 'Is this listing verified?', a: 'Every listing in this app is illustrative sample data. A check mark next to an agent’s name only marks seeded sample agents.' },
];

/** Figma "Help & Support" (default, chat unavailable). */
export function HelpView() {
  const [q, setQ] = useState('');
  const [openQ, setOpenQ] = useState(FAQ[2]!.q);
  const [chat, setChat] = useState(false);
  const [sheet, setSheet] = useState<null | 'email' | 'call'>(null);
  const term = q.trim().toLowerCase();
  const items = term ? FAQ.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(term)) : FAQ;
  const answer = FAQ.find((f) => f.q === openQ && items.includes(f));

  return (
    <>
      <div className="flex h-14 items-center rounded-full bg-surface px-5">
        <Search size={20} className="shrink-0 text-text-secondary" aria-hidden />
        <label htmlFor="help-q" className="sr-only">
          Search help articles
        </label>
        <input id="help-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help articles" className="min-w-0 flex-1 bg-transparent pl-3 t-item outline-none placeholder:text-text-muted" />
      </div>
      <section aria-labelledby="faq-h" className="flex flex-col gap-3">
        <h2 id="faq-h" className="t-section">
          Common rental questions
        </h2>
        {items.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-[28px] bg-surface">
            {items.map((f) => (
              <li key={f.q}>
                <button type="button" aria-expanded={openQ === f.q} onClick={() => setOpenQ(f.q)} className="flex min-h-[62px] w-full items-center gap-3.5 px-4 py-2.5 text-left hover:bg-surface-muted/60">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-muted">
                    <f.icon size={20} aria-hidden />
                  </span>
                  <span className="flex-1 t-item">{f.q}</span>
                  <ChevronRight size={18} className="text-text-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[24px] bg-surface p-4 t-body text-text-secondary">No articles match “{q.trim()}”.</p>
        )}
        {answer ? (
          <div className="rounded-[24px] bg-surface p-4" aria-live="polite">
            <h3 className="t-card-title">{answer.q}</h3>
            <p className="mt-1 t-body text-text-secondary">{answer.a}</p>
          </div>
        ) : null}
      </section>
      <section aria-labelledby="support-h" className="flex flex-col gap-3">
        <h2 id="support-h" className="t-section">
          Contact support
        </h2>
        {chat ? (
          <div role="status" className="rounded-[24px] bg-amber-soft p-4">
            <p className="t-card-title">Live chat is offline right now</p>
            <p className="t-body text-text-secondary">This sample app has no live chat service. Questions about a home are best sent to its agent with “Contact agent”.</p>
          </div>
        ) : null}
        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              ['chat', MessagesSquare, 'Live chat', chat ? 'Offline' : 'Not staffed'],
              ['email', Mail, 'Email', 'Sample'],
              ['call', Phone, 'Call', 'Sample'],
            ] as const
          ).map(([k, Icon, label, sub]) => (
            <button key={k} type="button" onClick={() => (k === 'chat' ? setChat(true) : setSheet(k))} className={cx('flex flex-col gap-1 rounded-[24px] bg-surface p-4 text-left hover:bg-white/80')}>
              <Icon size={20} aria-hidden />
              <span className="mt-2 t-card-title">{label}</span>
              <span className="t-caption text-text-muted">{sub}</span>
            </button>
          ))}
        </div>
      </section>
      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'email' ? 'Email support' : 'Call support'}>
        <p className="pb-4 t-body text-text-secondary">Nestora is a portfolio sample, so there’s no support team to {sheet === 'email' ? 'email' : 'call'}. For questions about a home, use “Contact agent” on its page — the agent sees it in their Nestora queue.</p>
      </Sheet>
    </>
  );
}
