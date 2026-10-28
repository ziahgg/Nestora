import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth-shell';
import { SignUpForm } from '@/components/auth-forms';

export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell greeting="Hi there," title="Create your account">
      <SignUpForm next={sp.next} />
    </AuthShell>
  );
}
