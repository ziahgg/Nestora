'use server';

import { revalidatePath } from 'next/cache';

import { dbFail, fail, ok, type ActionResult } from '@/lib/action-result';
import { describeSearch, filtersToParams, parseFilters } from '@/lib/domain/search';
import { createClient, requireUser } from '@/lib/supabase/server';
import { id } from '@/lib/validations';

/** Saved homes, compare and history. Every write is scoped to the signed-in user by RLS as well. */

export async function setSaved(propertyId: string, saved: boolean): Promise<ActionResult<{ saved: boolean }>> {
  if (!id.safeParse(propertyId).success) return fail('That home wasn’t found.');
  const { supabase, userId } = await requireUser();
  if (saved) {
    const { error } = await supabase.from('favorites').upsert({ user_id: userId, property_id: propertyId }, { onConflict: 'user_id,property_id', ignoreDuplicates: true });
    if (error) return dbFail('save', error);
  } else {
    const [f, c] = await Promise.all([
      supabase.from('favorites').delete().eq('user_id', userId).eq('property_id', propertyId),
      // Removing a saved home also takes it out of compare (as the design's confirm text says).
      supabase.from('compare_items').delete().eq('user_id', userId).eq('property_id', propertyId),
    ]);
    if (f.error) return dbFail('unsave', f.error);
    if (c.error) return dbFail('uncompare', c.error);
  }
  revalidatePath('/', 'layout');
  return ok({ saved });
}

export async function setCompared(propertyId: string, compared: boolean): Promise<ActionResult<{ compared: boolean }>> {
  if (!id.safeParse(propertyId).success) return fail('That home wasn’t found.');
  const { supabase, userId } = await requireUser();
  const { error } = compared
    ? await supabase.from('compare_items').upsert({ user_id: userId, property_id: propertyId }, { onConflict: 'user_id,property_id', ignoreDuplicates: true })
    : await supabase.from('compare_items').delete().eq('user_id', userId).eq('property_id', propertyId);
  if (error) return dbFail('compare', error);
  revalidatePath('/', 'layout');
  return ok({ compared });
}

/** Called from the details page after it renders; silently does nothing for signed-out visitors. */
export async function recordView(propertyId: string): Promise<void> {
  if (!id.safeParse(propertyId).success) return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== 'string') return;
  const { error } = await supabase.from('recently_viewed').upsert({ user_id: userId, property_id: propertyId, viewed_at: new Date().toISOString() }, { onConflict: 'user_id,property_id' });
  if (error) console.error(`[nestora] recordView: ${error.code ?? ''} ${error.message}`);
}

export async function clearRecentlyViewed(): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from('recently_viewed').delete().eq('user_id', userId);
  if (error) return dbFail('clearRecentlyViewed', error);
  revalidatePath('/', 'layout');
  return ok(undefined);
}

/** Stores the current results search (re-parsed here, so only valid filters are kept). */
export async function rememberSearch(query: string, neighborhoodName: string | null): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== 'string') return;
  const f = parseFilters(new URLSearchParams(query));
  const params = filtersToParams(f);
  if (!params) return;
  const { label, detail } = describeSearch(f, neighborhoodName);
  const { error } = await supabase.from('recent_searches').upsert({ user_id: userId, params, label, detail, created_at: new Date().toISOString() }, { onConflict: 'user_id,params' });
  if (error) console.error(`[nestora] rememberSearch: ${error.code ?? ''} ${error.message}`);
}

export async function clearRecentSearches(): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from('recent_searches').delete().eq('user_id', userId);
  if (error) return dbFail('clearRecentSearches', error);
  revalidatePath('/search');
  return ok(undefined);
}
