'use server';

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';

import { dbFail, fail, invalid, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/supabase/server';
import { AVATAR_MAX_BYTES, AVATAR_TYPES, id, profileSchema, settingsSchema } from '@/lib/validations';

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await requireUser();
  const v = parsed.data;
  const { error } = await supabase.from('profiles').update({ full_name: v.fullName, contact_email: v.contactEmail, phone: v.phone, preferred_move_in: v.preferredMoveIn }).eq('id', userId);
  if (error) return dbFail('updateProfile', error);
  revalidatePath('/', 'layout');
  return ok(undefined);
}

export async function updateSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const patch = {
    ...(v.notifyInquiryReplies !== undefined && { notify_inquiry_replies: v.notifyInquiryReplies }),
    ...(v.notifyViewingUpdates !== undefined && { notify_viewing_updates: v.notifyViewingUpdates }),
    ...(v.notifyPriceUpdates !== undefined && { notify_price_updates: v.notifyPriceUpdates }),
    ...(v.preferredContact !== undefined && { preferred_contact: v.preferredContact }),
    ...(v.sharePhone !== undefined && { share_phone: v.sharePhone }),
  };
  if (!Object.keys(patch).length) return ok(undefined);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) return dbFail('updateSettings', error);
  revalidatePath('/settings');
  return ok(undefined);
}

/** Uploads a profile photo to Storage (avatars/<user id>/…) and points the profile at it. */
export async function uploadAvatar(form: FormData): Promise<ActionResult> {
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return fail('Choose a photo to upload.');
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return fail('Use a JPEG, PNG or WebP image.');
  if (file.size > AVATAR_MAX_BYTES) return fail('Use an image under 2 MB.');
  const { supabase, userId } = await requireUser();
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const up = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) {
    console.error(`[nestora] avatar upload: ${up.error.message}`);
    return fail('We couldn’t upload that photo. Please try again.');
  }
  const { data: prev } = await supabase.from('profiles').select('avatar_path').eq('id', userId).single();
  const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
  if (error) {
    await supabase.storage.from('avatars').remove([path]);
    return dbFail('avatar', error);
  }
  if (prev?.avatar_path && prev.avatar_path.startsWith(`${userId}/`)) await supabase.storage.from('avatars').remove([prev.avatar_path]);
  revalidatePath('/', 'layout');
  return ok(undefined);
}

export async function markNotificationsRead(ids: string[] | 'all'): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  let q = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
  if (ids !== 'all') {
    if (!ids.length || ids.some((x) => !id.safeParse(x).success)) return fail('Nothing to mark.');
    q = q.in('id', ids);
  }
  const { error } = await q;
  if (error) return dbFail('markRead', error);
  revalidatePath('/', 'layout');
  return ok(undefined);
}
