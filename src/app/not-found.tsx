import { SearchX } from 'lucide-react';

import { Screen } from '@/components/screen';
import { ButtonLink, EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen tabs={false}>
      <EmptyState
        icon={SearchX}
        title="Not found"
        message="This page or listing doesn’t exist, isn’t published, or isn’t yours to view."
        action={
          <ButtonLink href="/homes" size="sm">
            Explore homes
          </ButtonLink>
        }
      />
    </Screen>
  );
}
