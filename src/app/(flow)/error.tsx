'use client';

import { CloudOff, RotateCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Screen } from '@/components/screen';
import { Button, EmptyState } from '@/components/ui';

/** Figma "Search Results / Error": a retry that re-runs the server render. */
export default function FlowError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Screen>
      <EmptyState
        icon={CloudOff}
        title="Something went wrong"
        message="We couldn’t load this page. Check your connection and try again."
        action={
          <Button
            icon={RotateCw}
            loading={pending}
            onClick={() =>
              start(() => {
                router.refresh();
                reset();
              })
            }
          >
            Try again
          </Button>
        }
      />
    </Screen>
  );
}
