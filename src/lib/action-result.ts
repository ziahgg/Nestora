import type { z } from 'zod';

import { fieldErrors, type FieldErrors } from '@/lib/validations';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; code?: string; fields?: FieldErrors };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string, fields?: FieldErrors, code?: string): ActionResult<never> => ({ ok: false, error, fields, code });
export const invalid = (e: z.ZodError): ActionResult<never> => ({ ok: false, error: 'Please fix the highlighted fields.', fields: fieldErrors(e) });

/** Message keys raised by the database functions (errcode P0001) → renter-facing copy. */
const RULES: Record<string, string> = {
  not_signed_in: 'Sign in to continue.',
  listing_not_found: 'This home is no longer listed.',
  listing_unavailable: 'This home isn’t taking inquiries or viewings right now.',
  inquiry_exists: 'You already have an open inquiry for this home.',
  inquiry_not_found: 'That inquiry wasn’t found.',
  inquiry_closed: 'This inquiry is already closed.',
  phone_required: 'Add a phone number to be contacted by phone.',
  message_length: 'Write a message between 2 and 1,000 characters.',
  compare_full: 'Compare is full — remove a home to add another.',
  invalid_range: 'Pick dates within the next two weeks.',
  slot_out_of_range: 'Pick a time at least 2 hours from now and within 60 days.',
  slot_unavailable: 'The agent isn’t available at that time. Pick another slot.',
  slot_taken: 'That time was just booked. Pick another slot.',
  viewing_exists: 'You already have a viewing booked for this home.',
  viewing_not_found: 'That viewing wasn’t found.',
  viewing_cancelled: 'This viewing has already been cancelled.',
  viewing_past: 'This viewing has already started.',
  same_time: 'Pick a different time from the current one.',
};

/** Maps a database error to a safe message; details go to the server log only (no row data). */
export function dbFail(where: string, error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === 'P0001' && RULES[error.message]) return fail(RULES[error.message]!, undefined, error.message);
  console.error(`[nestora] ${where}: ${error.code ?? ''} ${error.message}`);
  if (error.code === '23505') {
    if (/inquiries_one_open/.test(error.message)) return fail(RULES.inquiry_exists!, undefined, 'inquiry_exists');
    if (/viewings_agent_slot/.test(error.message)) return fail(RULES.slot_taken!, undefined, 'slot_taken');
    if (/viewings_one_active/.test(error.message)) return fail(RULES.viewing_exists!, undefined, 'viewing_exists');
    return fail('That’s already saved.');
  }
  if (error.code === '23514' || error.code === '22023' || error.code === '22P02') return fail('Some values are out of range. Check the form and try again.');
  if (error.code === '42501') return fail('You don’t have access to that.');
  return fail('Something went wrong. Please try again.');
}
