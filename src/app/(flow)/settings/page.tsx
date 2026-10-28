import type { Metadata } from 'next';

import { Screen } from '@/components/screen';
import { SettingsView } from '@/components/settings-view';
import { TopBar } from '@/components/ui';
import { getProfile } from '@/lib/services/data';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { userId } = await requireUser();
  const p = await getProfile(userId);
  if (!p) return null;
  return (
    <Screen tabs={false}>
      <TopBar title="Settings" back="/profile" />
      <SettingsView
        initial={{ notifyInquiryReplies: p.notify_inquiry_replies, notifyViewingUpdates: p.notify_viewing_updates, notifyPriceUpdates: p.notify_price_updates, preferredContact: p.preferred_contact, sharePhone: p.share_phone }}
      />
    </Screen>
  );
}
