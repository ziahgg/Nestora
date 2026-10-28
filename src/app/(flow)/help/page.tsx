import type { Metadata } from 'next';

import { HelpView } from '@/components/help-view';
import { Screen } from '@/components/screen';
import { TopBar } from '@/components/ui';

export const metadata: Metadata = { title: 'Help & support' };

export default function HelpPage() {
  return (
    <Screen tabs={false}>
      <TopBar title="Help & support" back="/profile" />
      <HelpView />
    </Screen>
  );
}
