'use server';

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';

import { dbFail, fail, invalid, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/supabase/server';
import { cancelViewingSchema, id, inquirySchema, messageSchema, rescheduleSchema, viewingSchema } from '@/lib/validations';

/**
 * Inquiry and viewing writes. All of them call the database workflow functions, which check the caller,
 * the listing and the current state; nothing here trusts ids, prices or statuses from the browser.
 * No email, SMS or push message is sent — agents see inquiries and viewings in their Nestora queue.
 */

export async function sendInquiry(input: z.input<typeof inquirySchema>): Promise<ActionResult<{ inquiryId: string }>> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase } = await requireUser();
  const v = parsed.data;
  const { data, error } = await supabase.rpc('send_inquiry', {
    p_property: v.propertyId,
    p_topics: v.topics,
    p_full_name: v.fullName,
    p_email: v.email,
    p_phone: v.phone ?? '',
    p_message: v.message,
    p_contact: v.preferredContact,
    p_key: v.idempotencyKey,
  });
  if (error) return dbFail('send_inquiry', error);
  revalidatePath('/', 'layout');
  return ok({ inquiryId: data });
}

export async function withdrawInquiry(inquiryId: string): Promise<ActionResult> {
  if (!id.safeParse(inquiryId).success) return fail('That inquiry wasn’t found.');
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('withdraw_inquiry', { p_id: inquiryId });
  if (error) return dbFail('withdraw_inquiry', error);
  revalidatePath('/', 'layout');
  return ok(undefined);
}

/** Renter reply or agent answer (the function decides which from the caller). */
export async function sendMessage(input: z.input<typeof messageSchema>): Promise<ActionResult> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('add_inquiry_message', { p_id: parsed.data.inquiryId, p_body: parsed.data.body });
  if (error) return dbFail('add_inquiry_message', error);
  revalidatePath('/', 'layout');
  return ok(undefined);
}

export async function closeInquiry(inquiryId: string, note: string): Promise<ActionResult> {
  if (!id.safeParse(inquiryId).success) return fail('That inquiry wasn’t found.');
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('close_inquiry', { p_id: inquiryId, p_note: note.slice(0, 300) });
  if (error) return dbFail('close_inquiry', error);
  revalidatePath('/', 'layout');
  return ok(undefined);
}

export async function bookViewing(input: z.input<typeof viewingSchema>): Promise<ActionResult<{ viewingId: string }>> {
  const parsed = viewingSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase } = await requireUser();
  const v = parsed.data;
  const { data, error } = await supabase.rpc('request_viewing', {
    p_property: v.propertyId,
    p_type: v.type,
    p_starts_at: v.startsAt,
    p_phone: v.phone,
    p_guests: v.guests,
    p_note: v.note,
    p_key: v.idempotencyKey,
  });
  if (error) return dbFail('request_viewing', error);
  revalidatePath('/', 'layout');
  return ok({ viewingId: data });
}

export async function rescheduleViewing(input: z.input<typeof rescheduleSchema>): Promise<ActionResult> {
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('reschedule_viewing', { p_id: parsed.data.viewingId, p_starts_at: parsed.data.startsAt });
  if (error) return dbFail('reschedule_viewing', error);
  revalidatePath('/', 'layout');
  return ok(undefined);
}

export async function cancelViewing(input: z.input<typeof cancelViewingSchema>): Promise<ActionResult> {
  const parsed = cancelViewingSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('cancel_viewing', { p_id: parsed.data.viewingId, p_reason: parsed.data.reason });
  if (error) return dbFail('cancel_viewing', error);
  revalidatePath('/', 'layout');
  return ok(undefined);
}
