'use client';

import { Eye, EyeOff, Lock, Mail, MailCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type FormEvent } from 'react';

import { requestPasswordReset, signIn, signUp, updatePassword } from '@/app/actions/auth';
import type { FieldErrors } from '@/lib/validations';
import { Button, Field, FormError } from './ui';

function useForm() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, start] = useTransition();
  return { errors, setErrors, formError, setFormError, pending, start };
}

const value = (e: FormEvent<HTMLFormElement>, name: string) => String(new FormData(e.currentTarget).get(name) ?? '');

function ShowPassword({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={shown} className="inline-flex items-center gap-1.5 t-body text-text-secondary">
      {shown ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
      {shown ? 'Hide password' : 'Show password'}
    </button>
  );
}

export function SignInForm({ next, notice }: { next?: string; notice?: string }) {
  const f = useForm();
  const router = useRouter();
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-1 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const input = { email: value(e, 'email'), password: value(e, 'password'), next };
        f.start(async () => {
          const r = await signIn(input);
          if (!r.ok) {
            f.setErrors(r.fields ?? {});
            f.setFormError(r.fields ? undefined : r.error);
            return;
          }
          router.replace(r.data.next);
          router.refresh();
        });
      }}
    >
      {notice ? <p className="rounded-[16px] bg-success-soft px-4 py-3 t-body text-text">{notice}</p> : null}
      <FormError message={f.formError} />
      <Field id={`${id}-email`} name="email" type="email" label="Email" icon={Mail} autoComplete="email" required error={f.errors.email} />
      <Field id={`${id}-password`} name="password" type={shown ? 'text' : 'password'} label="Password" icon={Lock} autoComplete="current-password" required error={f.errors.password} />
      <div className="flex items-center justify-between">
        <ShowPassword shown={shown} onToggle={() => setShown((s) => !s)} />
        <Link href="/forgot-password" className="t-body-m underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </div>
      <div className="mt-auto flex flex-col gap-4 pt-8">
        <Button type="submit" full loading={f.pending}>
          Sign in
        </Button>
        <p className="text-center t-body text-text-secondary">
          New to Nestora?{' '}
          <Link href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'} className="t-body-m text-text underline-offset-4 hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const f = useForm();
  const router = useRouter();
  const id = useId();
  const [shown, setShown] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  if (sentTo)
    return (
      <div className="flex flex-col items-center gap-3 rounded-[28px] bg-surface p-7 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-amber-soft text-amber">
          <MailCheck size={28} aria-hidden />
        </span>
        <h2 className="t-title-l">Check your email</h2>
        <p className="t-body text-text-secondary">We sent a confirmation link to {sentTo}. Open it on this device to finish creating your account.</p>
        <Link href="/login" className="mt-2 t-body-m underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  return (
    <form
      noValidate
      className="flex flex-1 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const input = { fullName: value(e, 'name'), email: value(e, 'email'), password: value(e, 'password'), next };
        f.start(async () => {
          const r = await signUp(input);
          if (!r.ok) {
            f.setErrors(r.fields ?? {});
            f.setFormError(r.error && !r.fields ? r.error : r.fields?.email && Object.keys(r.fields).length === 1 ? r.error : undefined);
            return;
          }
          if (r.data.needsConfirmation) setSentTo(input.email);
          else {
            router.replace(r.data.next);
            router.refresh();
          }
        });
      }}
    >
      <FormError message={f.formError} />
      <Field id={`${id}-name`} name="name" label="Full name" icon={UserRound} autoComplete="name" required error={f.errors.fullName} />
      <Field id={`${id}-email`} name="email" type="email" label="Email" icon={Mail} autoComplete="email" required error={f.errors.email} />
      <Field id={`${id}-password`} name="password" type={shown ? 'text' : 'password'} label="Password" icon={Lock} autoComplete="new-password" required hint="At least 8 characters, including a number" error={f.errors.password} />
      <div>
        <ShowPassword shown={shown} onToggle={() => setShown((s) => !s)} />
      </div>
      <div className="mt-auto flex flex-col gap-4 pt-8">
        <Button type="submit" full loading={f.pending}>
          Create account
        </Button>
        <p className="text-center t-body text-text-secondary">
          Already have an account?{' '}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="t-body-m text-text underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}

export function ForgotForm() {
  const f = useForm();
  const id = useId();
  const [sent, setSent] = useState(false);
  if (sent)
    return <p className="rounded-[24px] bg-surface p-6 t-body text-text-secondary">If an account exists for that email, a reset link is on its way. The link opens a page where you can choose a new password.</p>;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const input = { email: value(e, 'email') };
        f.start(async () => {
          const r = await requestPasswordReset(input);
          if (!r.ok) {
            f.setErrors(r.fields ?? {});
            f.setFormError(r.fields ? undefined : r.error);
          } else setSent(true);
        });
      }}
    >
      <FormError message={f.formError} />
      <Field id={`${id}-email`} name="email" type="email" label="Email" icon={Mail} autoComplete="email" required error={f.errors.email} />
      <Button type="submit" full loading={f.pending} className="mt-2">
        Send reset link
      </Button>
      <Link href="/login" className="text-center t-body-m underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}

export function UpdatePasswordForm() {
  const f = useForm();
  const router = useRouter();
  const id = useId();
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const input = { password: value(e, 'password'), confirm: value(e, 'confirm') };
        f.start(async () => {
          const r = await updatePassword(input);
          if (!r.ok) {
            f.setErrors(r.fields ?? {});
            f.setFormError(r.fields ? undefined : r.error);
          } else router.replace('/');
        });
      }}
    >
      <FormError message={f.formError} />
      <Field id={`${id}-password`} name="password" type="password" label="New password" icon={Lock} autoComplete="new-password" required hint="At least 8 characters, including a number" error={f.errors.password} />
      <Field id={`${id}-confirm`} name="confirm" type="password" label="Confirm password" icon={Lock} autoComplete="new-password" required error={f.errors.confirm} />
      <Button type="submit" full loading={f.pending} className="mt-2">
        Save password
      </Button>
    </form>
  );
}
