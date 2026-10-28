'use server';

import { parseFilters } from '@/lib/domain/search';
import { searchHomes } from '@/lib/services/data';

/** Live count for the filter sheet's "Show N homes" button (same query as the results page). */
export async function countHomes(query: string): Promise<number | null> {
  try {
    const { total } = await searchHomes({ ...parseFilters(new URLSearchParams(query)), page: 1 });
    return total;
  } catch {
    return null;
  }
}
