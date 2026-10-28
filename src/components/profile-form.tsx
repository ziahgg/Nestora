'use client';

import { CalendarDays, Camera, Mail, Phone, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';

import { updateProfile, uploadAvatar } from '@/app/actions/account';
import { AVATAR_MAX_BYTES, AVATAR_TYPES, type FieldErrors } from '@/lib/validations';
import { Avatar } from './photo';
import { useToast } from './toast';
import { Button, Field, FormError } from './ui';

type Initial = { fullName: string; contactEmail: string; phone: string; preferredMoveIn: string; avatarPath: string | null };

/** Figma "Edit Profile" (default, validation error, saved). */
export function ProfileForm({ initial, today }: { initial: Initial; today: string }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, start] = useTransition();
  const [uploading, startUpload] = useTransition();

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const input = { fullName: String(fd.get('fullName') ?? ''), contactEmail: String(fd.get('contactEmail') ?? ''), phone: String(fd.get('phone') ?? ''), preferredMoveIn: String(fd.get('preferredMoveIn') ?? '') };
        start(async () => {
          const r = await updateProfile(input);
          if (!r.ok) {
            setErrors(r.fields ?? {});
            setFormError(r.fields ? undefined : r.error);
            return;
          }
          setErrors({});
          setFormError(undefined);
          toast({ title: 'Profile saved' });
          router.push('/profile');
          router.refresh();
        });
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <Avatar path={initial.avatarPath} name={initial.fullName || 'You'} size={100} />
          <button type="button" onClick={() => file.current?.click()} disabled={uploading} aria-label="Change photo" className="absolute right-0 bottom-0 grid size-10 place-items-center rounded-full bg-ink text-on-ink ring-4 ring-bg">
            <Camera size={18} aria-hidden />
          </button>
        </div>
        <button type="button" onClick={() => file.current?.click()} disabled={uploading} className="t-body-m">
          {uploading ? 'Uploading…' : 'Change photo'}
        </button>
        <input
          ref={file}
          type="file"
          accept={AVATAR_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (!(AVATAR_TYPES as readonly string[]).includes(f.type)) return toast({ kind: 'error', title: 'Use a JPEG, PNG or WebP image' });
            if (f.size > AVATAR_MAX_BYTES) return toast({ kind: 'error', title: 'Use an image under 2 MB' });
            const fd = new FormData();
            fd.set('file', f);
            startUpload(async () => {
              const r = await uploadAvatar(fd);
              if (!r.ok) toast({ kind: 'error', title: 'Couldn’t upload photo', message: r.error });
              else {
                toast({ title: 'Photo updated' });
                router.refresh();
              }
            });
          }}
        />
      </div>
      <FormError message={formError} />
      <Field id={`${id}-name`} name="fullName" label="Full name" icon={UserRound} required autoComplete="name" defaultValue={initial.fullName} error={errors.fullName} />
      <Field id={`${id}-email`} name="contactEmail" type="email" label="Email" icon={Mail} required autoComplete="email" defaultValue={initial.contactEmail} error={errors.contactEmail} hint="Shared with agents you contact. Your sign-in email doesn’t change." />
      <Field id={`${id}-phone`} name="phone" type="tel" label="Phone" icon={Phone} autoComplete="tel" defaultValue={initial.phone} error={errors.phone} />
      <Field id={`${id}-movein`} name="preferredMoveIn" type="date" label="Preferred move-in" icon={CalendarDays} min={today} defaultValue={initial.preferredMoveIn} error={errors.preferredMoveIn} />
      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[28px] bg-surface px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(18,18,18,0.06)]">
        <div className="mx-auto max-w-[600px]">
          <Button type="submit" full loading={pending}>
            Save changes
          </Button>
        </div>
      </div>
    </form>
  );
}
