'use client';

import { BellRing, CalendarCheck, Download, Eye, Globe, Info, LogOut, Mail, MessageSquare, Phone } from 'lucide-react';
import { useState, useTransition } from 'react';

import { signOut } from '@/app/actions/auth';
import { updateSettings } from '@/app/actions/account';
import { Sheet, Toggle } from './overlays';
import { useToast } from './toast';
import { ListRow, RowGroup, cx } from './ui';

type S = { notifyInquiryReplies: boolean; notifyViewingUpdates: boolean; notifyPriceUpdates: boolean; preferredContact: 'email' | 'phone'; sharePhone: boolean };

/** Figma "Settings / Default". Every row either changes a stored preference or opens real content. */
export function SettingsView({ initial }: { initial: S }) {
  const [s, setS] = useState(initial);
  const [sheet, setSheet] = useState<null | 'contact' | 'phone' | 'about' | 'visibility'>(null);
  const [, start] = useTransition();
  const toast = useToast();
  const save = (patch: Partial<S>) => {
    const prev = s;
    setS({ ...s, ...patch });
    start(async () => {
      const r = await updateSettings(patch);
      if (!r.ok) {
        setS(prev);
        toast({ kind: 'error', title: 'Couldn’t save setting', message: r.error });
      }
    });
  };
  const toggleRow = (icon: typeof BellRing, label: string, key: 'notifyInquiryReplies' | 'notifyViewingUpdates' | 'notifyPriceUpdates') => <ListRow icon={icon} label={label} trailing={<Toggle checked={s[key]} onChange={(v) => save({ [key]: v })} label={label} />} />;
  const choice = (label: string, on: boolean, onClick: () => void) => (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} className={cx('flex min-h-14 w-full items-center justify-between rounded-[16px] px-4 t-item', on ? 'bg-ink text-on-ink' : 'bg-surface-muted')}>
      {label}
    </button>
  );

  return (
    <>
      <RowGroup label="Notifications">
        {toggleRow(MessageSquare, 'Inquiry replies', 'notifyInquiryReplies')}
        {toggleRow(CalendarCheck, 'Viewing updates & reminders', 'notifyViewingUpdates')}
        {toggleRow(BellRing, 'Price & availability updates', 'notifyPriceUpdates')}
      </RowGroup>
      <p className="-mt-3 px-1 t-caption text-text-muted">In-app notifications only — Nestora doesn’t send email, SMS or push messages.</p>
      <RowGroup label="Contact preferences">
        <ListRow icon={Mail} label="Preferred contact" value={s.preferredContact === 'email' ? 'Email' : 'Phone'} onClick={() => setSheet('contact')} />
        <ListRow icon={Phone} label="Share phone with agents" value={s.sharePhone ? 'When I send an inquiry' : 'Never by default'} onClick={() => setSheet('phone')} />
      </RowGroup>
      <RowGroup label="Privacy">
        <ListRow icon={Eye} label="Profile visibility" value="Agents I contact" onClick={() => setSheet('visibility')} />
        <ListRow icon={Download} label="Download my data" value="JSON" href="/account/export" download />
      </RowGroup>
      <RowGroup label="Account">
        <ListRow icon={Globe} label="Language & region" value="English · USD" trailing={<span />} />
        <ListRow icon={Info} label="About Nestora" value="v1.0 · sample" onClick={() => setSheet('about')} />
        <form action={signOut}>
          <button type="submit" className="flex min-h-[62px] w-full items-center gap-3.5 px-4 py-2.5 hover:bg-error-soft/60">
            <span className="grid size-10 place-items-center rounded-[12px] bg-error-soft text-error">
              <LogOut size={20} aria-hidden />
            </span>
            <span className="t-item text-error">Sign out</span>
          </button>
        </form>
      </RowGroup>

      <Sheet open={sheet === 'contact'} onClose={() => setSheet(null)} title="Preferred contact">
        <div className="flex flex-col gap-2 pb-4" role="radiogroup">
          {choice('Email', s.preferredContact === 'email', () => (save({ preferredContact: 'email' }), setSheet(null)))}
          {choice('Phone', s.preferredContact === 'phone', () => (save({ preferredContact: 'phone' }), setSheet(null)))}
          <p className="mt-2 t-caption text-text-muted">Pre-selected on the Contact agent form. You can change it for each inquiry.</p>
        </div>
      </Sheet>
      <Sheet open={sheet === 'phone'} onClose={() => setSheet(null)} title="Share phone with agents">
        <div className="flex flex-col gap-2 pb-4" role="radiogroup">
          {choice('When I send an inquiry', s.sharePhone, () => (save({ sharePhone: true }), setSheet(null)))}
          {choice('Never by default', !s.sharePhone, () => (save({ sharePhone: false }), setSheet(null)))}
          <p className="mt-2 t-caption text-text-muted">Controls whether your profile phone is filled in on new inquiries. Booking a viewing always asks for a phone the agent can call.</p>
        </div>
      </Sheet>
      <Sheet open={sheet === 'visibility'} onClose={() => setSheet(null)} title="Profile visibility">
        <p className="pb-4 t-body text-text-secondary">Agents only see the name, email and phone you put on an inquiry or viewing for their own listings. Your saved homes, searches and history are private to you. There’s no public profile.</p>
      </Sheet>
      <Sheet open={sheet === 'about'} onClose={() => setSheet(null)} title="About Nestora">
        <p className="pb-4 t-body text-text-secondary">Nestora v1.0 is a portfolio sample. Listings, agents, prices and references are illustrative, and no payments, emails or real bookings are made.</p>
      </Sheet>
    </>
  );
}
