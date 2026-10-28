/** Input schemas shared by forms (client) and server actions (server). The database checks everything again. */
import { z } from 'zod';

import { TOPICS } from '@/lib/domain/listing';

// Seed ids are md5-based (not RFC version-tagged), so accept any 8-4-4-4-12 id.
export const id = z.guid({ message: 'Invalid id' });

export const emailSchema = z.email({ message: 'Enter a valid email address' }).trim().toLowerCase();
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters, including a number')
  .max(72, 'Use 72 characters or fewer')
  .regex(/\d/, 'Include at least one number');
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number');
const optionalPhone = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(phoneSchema.nullable());
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date');

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your name').max(80),
  email: emailSchema,
  password: passwordSchema,
});
export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password') });
export const forgotSchema = z.object({ email: emailSchema });
export const newPasswordSchema = z.object({ password: passwordSchema, confirm: z.string() }).refine((v) => v.password === v.confirm, { message: 'Passwords don’t match', path: ['confirm'] });

export const MESSAGE_MIN = 20;
export const MESSAGE_MAX = 500;

export const inquirySchema = z
  .object({
    propertyId: id,
    topics: z.array(z.enum(TOPICS.map((t) => t.value) as [string, ...string[]])).min(1, 'Choose at least one topic').max(4),
    fullName: z.string().trim().min(1, 'Full name is required').max(80, 'Use 80 characters or fewer'),
    email: emailSchema,
    phone: optionalPhone,
    message: z.string().trim().min(1, 'Message is required').min(MESSAGE_MIN, `Write a short message (at least ${MESSAGE_MIN} characters)`).max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX} characters`),
    preferredContact: z.enum(['email', 'phone']),
    idempotencyKey: z.guid(),
  })
  .refine((v) => v.preferredContact !== 'phone' || !!v.phone, { message: 'Add a phone number to be contacted by phone', path: ['phone'] });

export const messageSchema = z.object({ inquiryId: id, body: z.string().trim().min(2, 'Write a message').max(1000, 'Keep it under 1,000 characters') });

export const viewingSchema = z.object({
  propertyId: id,
  type: z.enum(['in_person', 'video']),
  startsAt: z.iso.datetime({ offset: true, message: 'Choose a time' }),
  phone: phoneSchema,
  guests: z.number().int().min(1).max(6),
  note: z.string().trim().max(300, 'Keep the note under 300 characters'),
  idempotencyKey: z.guid(),
});
export const rescheduleSchema = z.object({ viewingId: id, startsAt: z.iso.datetime({ offset: true, message: 'Choose a new time' }) });
export const cancelViewingSchema = z.object({ viewingId: id, reason: z.string().trim().max(300) });

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(80),
  contactEmail: emailSchema,
  phone: optionalPhone,
  preferredMoveIn: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(isoDate.nullable()),
});

export const settingsSchema = z
  .object({
    notifyInquiryReplies: z.boolean(),
    notifyViewingUpdates: z.boolean(),
    notifyPriceUpdates: z.boolean(),
    preferredContact: z.enum(['email', 'phone']),
    sharePhone: z.boolean(),
  })
  .partial();

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export type FieldErrors = Record<string, string>;
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const i of error.issues) out[i.path.length ? i.path.join('.') : 'form'] ??= i.message;
  return out;
}
