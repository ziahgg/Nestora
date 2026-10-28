'use client';

import { useEffect } from 'react';

import { recordView } from '@/app/actions/lists';

/** Adds the home to "Recently viewed" once it has been shown (no-op when signed out). */
export function RecordView({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    void recordView(propertyId);
  }, [propertyId]);
  return null;
}
