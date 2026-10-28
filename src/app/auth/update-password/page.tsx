import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth-shell';
import { UpdatePasswordForm } from '@/components/auth-forms';
import { requireUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'New password' };

/** Reached from the reset email (the link signs the user in first). */
export default async function UpdatePasswordPage() {
  await requireUser();
  return (
    <AuthShell greeting="Almost there," title="Choose a new password">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
