'use client';

import { Mail, Phone, RotateCw, Send, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { sendInquiry } from '@/app/actions/rentals';
import { TOPICS, type Topic } from '@/lib/domain/listing';
import { MESSAGE_MAX, type FieldErrors } from '@/lib/validations';
import { Button, Chip, Field, FieldMessage, FormError, TextArea, cx } from './ui';

type Initial = { fullName: string; email: string; phone: string; contact: 'email' | 'phone' };

/**
 * Figma "Contact Agent" (default, validation error, sending, send failed). The inquiry is stored in Nestora
 * and appears in the agent's queue — no email or text message is sent.
 */
export function ContactForm({ propertyId, agentFirstName, initial }: { propertyId: string; agentFirstName: string; initial: Initial }) {
  const id = useId();
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState(initial.contact);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState<string>();
  const [pending, start] = useTransition();
  // One key per form: retries after a network failure can't create a second inquiry.
  const [key] = useState(() => crypto.randomUUID());

  const submit = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const input = {
      propertyId,
      topics,
      fullName: String(fd.get('fullName') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      message,
      preferredContact: contact,
      idempotencyKey: key,
    };
    setFailed(undefined);
    start(async () => {
      try {
        const r = await sendInquiry(input);
        if (!r.ok) {
          setErrors(r.fields ?? {});
          if (!r.fields) setFailed(r.error);
          return;
        }
        router.replace(`/inquiries/${r.data.inquiryId}/sent`);
      } catch {
        setFailed('Couldn’t send — check your connection and try again.');
      }
    });
  };

  return (
    <form
      id="contact-form"
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      <fieldset aria-describedby={`${id}-topics-msg`}>
        <legend className="mb-3 t-section">What would you like to ask?</legend>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => {
            const on = topics.includes(t.value);
            return (
              <Chip key={t.value} selected={on} onClick={() => setTopics((p) => (on ? p.filter((x) => x !== t.value) : [...p, t.value]))} className={cx('border', errors.topics && !topics.length ? 'border-error' : 'border-border')}>
                {t.label}
              </Chip>
            );
          })}
        </div>
        <div className="mt-2">
          <FieldMessage id={`${id}-topics-msg`} error={topics.length ? undefined : errors.topics} />
        </div>
      </fieldset>
      <Field id={`${id}-name`} name="fullName" label="Full name" icon={UserRound} autoComplete="name" required defaultValue={initial.fullName} error={errors.fullName} />
      <Field id={`${id}-email`} name="email" type="email" label="Email" icon={Mail} autoComplete="email" required defaultValue={initial.email} error={errors.email} />
      <Field id={`${id}-phone`} name="phone" type="tel" label={contact === 'phone' ? 'Phone' : 'Phone (optional)'} icon={Phone} autoComplete="tel" required={contact === 'phone'} defaultValue={initial.phone} error={errors.phone} />
      <TextArea
        id={`${id}-message`}
        label="Message"
        required
        value={message}
        maxLength={MESSAGE_MAX}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Hi ${agentFirstName}, is the home still available from…`}
        counter={`${message.length} / ${MESSAGE_MAX}`}
        error={errors.message}
      />
      <fieldset>
        <legend className="mb-2.5 t-label text-text-secondary">Preferred contact</legend>
        <div className="flex rounded-full bg-surface p-1" role="radiogroup">
          {(['email', 'phone'] as const).map((c) => (
            <button key={c} type="button" role="radio" aria-checked={contact === c} onClick={() => setContact(c)} className={cx('h-11 flex-1 rounded-full t-button-s', contact === c ? 'bg-ink text-on-ink' : 'text-text')}>
              {c === 'email' ? 'Email' : 'Phone'}
            </button>
          ))}
        </div>
      </fieldset>
      <FormError
        message={failed}
        action={
          <button type="submit" className="inline-flex shrink-0 items-center gap-1 t-body-m text-error underline-offset-4 hover:underline">
            <RotateCw size={14} aria-hidden />
            Retry
          </button>
        }
      />
      <p className="t-caption text-text-muted">Sample app — your inquiry is saved in Nestora and shown in the agent’s queue. No email or text message is sent.</p>
      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[28px] bg-surface px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(18,18,18,0.06)]">
        <div className="mx-auto max-w-[600px]">
          <Button type="submit" full icon={Send} loading={pending}>
            {pending ? 'Sending…' : 'Send inquiry'}
          </Button>
        </div>
      </div>
    </form>
  );
}
