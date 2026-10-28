import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth-shell';
import { SignInForm } from '@/components/auth-forms';

export const metadata: Metadata = { title: 'Sign in' };

const NOTICES: Record<string, string> = {
  'link-expired': 'That link has expired or was already used. Sign in, or request a new link.',
  'signed-out': 'You’ve been signed out.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell greeting="Welcome back," title="Sign in to Nestora">
      <SignInForm next={sp.next} notice={sp.notice ? NOTICES[sp.notice] : undefined} />
    </AuthShell>
  );
}
